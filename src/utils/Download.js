const fs = require('fs');
const path = require('path');
const { setTimeout } = require('timers/promises');

const Logger = require('./Logger');
const getPlaybackInfo = require('./getPlaybackInfo');
const parseManifest = require('./parseManifest');
const createMedia = require('./createMedia');
const embedMetadata = require('./embedMetadata');
const extractContainer = require('./extractContainer');
const getLyrics = require('./getLyrics');
const formatString = require('./formatString');

class Download {
    playbackInfo;
    manifest;
    segmentUrls;
    containerExtension;
    mediaExtension;
    coverExtension = '.jpg';
    lyrics;
    metadata;

    constructor(options = { }) {
        this.details = options.details;
        this.logger = options.logger;
        this.trackQuality = options.trackQuality;
        this.videoQuality = options.videoQuality;
        this.directory = options.directory;
        this.mediaFilename = options.mediaFilename;
        this.coverFilename = options.coverFilename ?? 'cover';
        this.overwriteExisting = options.overwriteExisting ?? false;
        this.embedMetadata = options.embedMetadata ?? true;
        this.metadataEmbedder = options.metadataEmbedder ?? 'ffmpeg';
        this.keepCoverFile = options.keepCoverFile ?? true;
        this.getCover = options.getCover ?? true;
        this.getLyrics = options.getLyrics ?? true;
        this.syncedLyricsOnly = options.syncedLyricsOnly ?? false;
        this.plainLyricsOnly = options.plainLyricsOnly ?? false;
        this.useArtistsTag = options.useArtistsTag ?? true;
        this.artistSeperator = options.artistSeperator;
        this.customMetadata = options.customMetadata;
        this.keepContainerFile = options.keepContainerFile ?? false;
        this.segmentWaitMin = options.segmentWaitMin ?? 0;
        this.segmentWaitMax = options.segmentWaitMax ?? 0;
        this.downloadLogPadding = options.downloadLogPadding ?? 0;
    }
    
    async download() {
        const startDate = Date.now();
        this.logger.lastLog = '';

        fs.mkdirSync(this.directory, { recursive: true }); // Create directory
        await this.getSegments(); // Get segment URL's
        if (fs.existsSync(this.getMediaPath()) && !this.overwriteExisting) return this.log('Already downloaded!'); // Check if already downloaded
        await this.downloadSegments(); // Download segments
        if (this.embedMetadata) await this.getMetadata(); // Get metadata
        await this.createMedia(); // Create output
        if (!this.keepContainerFile) fs.rmSync(this.getContainerPath()); // Delete container file
        if (!this.keepCoverFile && fs.existsSync(this.getCoverPath())) fs.rmSync(this.getCoverPath()); // Delete cover file

        this.log(`Completed (${Math.floor((Date.now() - startDate) / 1000)}s)`);
    }

    async getSegments() {
        this.log('Getting segment URL\'s...');
        this.playbackInfo = await getPlaybackInfo(this.details.id, this.details.type, this.details.isVideo ? 'HIGH' : this.trackQuality);
        this.manifest = await parseManifest(Buffer.from(this.playbackInfo.manifest, 'base64').toString(), this.playbackInfo.manifestMimeType);
        
        if (this.details.isTrack) {
            this.segmentUrls = this.manifest.segments;
            this.containerExtension = '.mp4';
            this.mediaExtension = this.manifest.codecs === 'flac' ? '.flac' : '.m4a'; // TODO: is it safe to assume AAC if not FLAC?
        } else if (this.details.isVideo) {
            const segmentManifests = this.manifest.mainManifests[0].segmentManifests;

            const segmentManifest = this.videoQuality ?
                segmentManifests.reduce((closest, curr) => {
                    const height = parseInt(curr.resolution.split('x')[1], 10);
                    const closestHeight = parseInt(closest.resolution.split('x')[1], 10);
                    const targetHeight = parseInt(this.videoQuality, 10);
                    return Math.abs(height - targetHeight) < Math.abs(closestHeight - targetHeight) ? curr : closest;
                }) :
                segmentManifests.reduce((highest, curr) => {
                    const height = parseInt(curr.resolution.split('x')[1], 10);
                    const highestHeight = parseInt(highest.resolution.split('x')[1], 10);
                    return height > highestHeight ? curr : highest;
                });

            // this.segmentUrls = segmentManifests[segmentManifests.length - 1].segments;
            this.segmentUrls = segmentManifest.segments;
            
            this.containerExtension = '.ts';
            this.mediaExtension = '.mp4';
        }

        return this.segmentUrls;
    }

    async getMetadata() {
        // Get lyrics
        if (this.getLyrics && this.details.isTrack) {
            this.log('Getting lyrics...');
            this.lyrics = await getLyrics(this.details.id).catch(err => this.log('Failed to get lyrics (does it have any?)', 'warn')); // TODO: maybe don't log or change to debug?
        }

        // Download cover
        if (this.getCover && !fs.existsSync(this.getCoverPath())) {
            this.log('Downloading cover...');
            await fetch(this.details.cover).then(async res => {
                if (res.status !== 200) throw new Error(`Got status code ${res.status}`);
                const coverBuffer = Buffer.from(await res.arrayBuffer());
                fs.writeFileSync(this.getCoverPath(), coverBuffer);
            }).catch(err => {
                this.log(`Failed to download cover: ${err.message}`, 'error');
            });
        } else {
            this.log('Cover already downladed');
        }

        this.metadata = [
            ['title', this.details.title],
            ['artist', (this.useArtistsTag || !this.artistSeperator) ? this.details.artist?.name : this.details.artists?.map(i => i.name).join(this.artistSeperator)],
            ['artists', this.useArtistsTag ? this.artistSeperator ? this.details.artists?.map(i => i.name).join(this.artistSeperator) : this.details.artist?.name : null],
            ['album', this.details.album?.title],
            ['albumartist', (this.useArtistsTag || !this.artistSeperator) ? this.details.albumArtist?.name : this.details.albumArtists?.map(i => i.name).join(this.artistSeperator)],
            ['albumartists', this.useArtistsTag ? this.artistSeperator ? this.details.albumArtists?.map(i => i.name).join(this.artistSeperator) : this.details.albumArtist?.name : null],
            ['date', this.details.releaseDate],
            ['originalyear', this.details.releaseYear],
            ['tracktotal', this.details.album?.trackCount],
            ['tracknumber', this.details.track?.trackNumber],
            ['disctotal', this.details.album?.volumeCount],
            ['discnumber', this.details.track?.volumeNumber],
            ['replaygain_album_gain', this.playbackInfo.albumReplayGain],
            ['replaygain_album_peak', this.playbackInfo.albumPeakAmplitude],
            ['replaygain_track_gain', this.playbackInfo.trackReplayGain || this.details.track?.replayGain], // NOTE: details.track.replayGain is actually playbackInfo.albumReplayGain
            ['replaygain_track_peak', this.playbackInfo.trackPeakAmplitude || this.details.track?.peak],
            ['copyright', this.details.track?.copyright],
            ['barcode', this.details.album?.upc],
            ['isrc', this.details.track?.isrc],
            ['itunesadvisory', this.details.explicit === true ? '1' : this.details.explicit === false ? '2' : null],
            ['bpm', this.details.track?.bpm],
            ['lyrics',
                this.syncedLyricsOnly ? this.lyrics?.syncedLyrics :
                this.plainLyricsOnly ? this.lyrics?.plainLyrics :
                this.lyrics?.syncedLyrics || this.lyrics?.plainLyrics],
            ...(this.customMetadata?.map(i => ([i[0], formatString(i[1], this.details)])) || [])
        ];
        // console.log(this.metadata);
    }
        
    async downloadSegments() {
        const stream = fs.createWriteStream(this.getContainerPath());

        for (let segmentIndex = 0; segmentIndex < this.segmentUrls.length; segmentIndex++) {
            const segmentUrl = this.segmentUrls[segmentIndex]
                .replace(/&amp;/g, '&'); // fix error when tidal uses key-pair-id parameter instead of token
                
            this.log(`Downloading segment ${segmentIndex + 1} of ${this.segmentUrls.length}...`);
            
            const segmentData = await fetch(segmentUrl).then(async res => Buffer.from(await res.arrayBuffer()));
            stream.write(segmentData);

            const delay = Math.floor(Math.random() * (this.segmentWaitMax - this.segmentWaitMin + 1) + this.segmentWaitMin);
            if (delay) await setTimeout(delay)
        }

        stream.end();
    }

    async createMedia() {
        if (!this.embedMetadata || this.metadataEmbedder !== 'ffmpeg') {
            // Extract from container
            this.log(`Creating ${this.mediaExtension} from ${this.containerExtension} container...`);
            await extractContainer(this.getContainerPath(), this.getMediaPath());
        }
        
        if (this.embedMetadata) {
            // Embed metadata
            if (this.metadataEmbedder === 'kid3') {
                // Embed via kid3
                this.log('Embedding metadata...');
                await embedMetadata(this.getMediaPath(), [...this.metadata, ['picture', fs.existsSync(this.getCoverPath()) ? this.getCoverPath() : undefined, true]]).catch(err => {
                    this.log(`Failed to embed metadata: ${err.message}`, 'error');
                });
            } else {
                // Extract and embed via FFmpeg
                this.log(`Creating ${this.mediaExtension} with metadata from ${this.containerExtension} container...`);
                await createMedia(this.getContainerPath(), this.getMediaPath(), fs.existsSync(this.getCoverPath()) ? this.getCoverPath() : undefined, this.metadata, this.details.isVideo ? 2 : 1);
            }
        }
    }

    getMediaPath() {
        return path.join(this.directory, `${this.mediaFilename}${this.mediaExtension}`);
    }

    getContainerPath() {
        return path.join(this.directory, `${this.mediaFilename}${this.containerExtension}`);
    }

    getCoverPath() {
        return path.join(this.directory, `${this.coverFilename}${this.coverExtension}`);
    }

    log(msg, level) {
        const levelPrefix = this.logger.getLevel(level)?.prefix;
        const logPrefix = `Downloading ${Logger.applyColor({ bold: true }, this.details.title)} - ${Logger.applyColor({ bold: true }, this.details.artist.name)}: `;
        const padding = ' '.repeat(Math.max(this.downloadLogPadding - Logger.getDisplayedLength(`${levelPrefix || ''}${logPrefix}`), 0));
        const log = `${logPrefix}${padding}${msg}`;
        if (level) {
            this.logger.log(level, log, true, true);
        } else {
            this.logger.info(log, true);
        }
    }
}

module.exports = Download;