const fs = require('fs');
const path = require('path');
const { setTimeout } = require('timers/promises');

const { config, logger } = require('../globals');
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
    extension;
    lyrics;
    metadata;

    constructor(options = { }) {
        this.details = options.details;
        this.trackQuality = options.trackQuality;
        this.videoQuality = options.videoQuality;
        this.downloadPath = options.downloadPath;
        this.coverPath = options.coverPath;
    }
    
    async download() {
        const startDate = Date.now();
        logger.lastLog = '';

        fs.mkdirSync(path.dirname(this.downloadPath), { recursive: true }); // Create directory
        await this.getSegments(); // Get segment URL's
        if (fs.existsSync(`${this.downloadPath}${this.extension}`) && !config.overwriteExisting) return this.log('Already downloaded!'); // Check if already downloaded
        await this.downloadSegments(); // Download segments
        await this.getMetadata(); // Get metadata
        await this.createMedia(); // Create output
        if (!config.debug) fs.rmSync(`${this.downloadPath}${this.containerExtension}`); // Delete container file
        if (!config.coverFilename && fs.existsSync(this.coverPath)) fs.rmSync(this.coverPath); // Delete cover file

        this.log(`Completed (${Math.floor((Date.now() - startDate) / 1000)}s)`);
    }

    async getSegments() {
        this.log('Getting segment URL\'s...');
        this.playbackInfo = await getPlaybackInfo(this.details.id, this.details.type, this.details.isVideo ? 'HIGH' : this.trackQuality);
        this.manifest = await parseManifest(Buffer.from(this.playbackInfo.manifest, 'base64').toString(), this.playbackInfo.manifestMimeType);
        
        if (this.details.isTrack) {
            this.segmentUrls = this.manifest.segments;
            this.containerExtension = '.mp4';
            this.extension = this.manifest.codecs === 'flac' ? '.flac' : '.m4a'; // TODO: is it safe to assume AAC if not FLAC?
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
            this.extension = '.mp4';
        }

        return this.segmentUrls;
    }

    async getMetadata() {
        // Get lyrics
        if (this.details.isTrack) {
            this.log('Getting lyrics...');
            this.lyrics = await getLyrics(this.details.id).catch(err => this.log('Failed to get lyrics (does it have any?)', 'warn')); // TODO: maybe don't log or change to debug?
        }

        // Download cover
        if (this.coverPath && !fs.existsSync(this.coverPath)) {
            this.log('Downloading cover...');
            await fetch(this.details.cover).then(async res => {
                if (res.status !== 200) throw new Error(`Got status code ${res.status}`);
                const coverBuffer = Buffer.from(await res.arrayBuffer());
                fs.writeFileSync(this.coverPath, coverBuffer);
            }).catch(err => {
                this.log(`Failed to download cover: ${err.message}`, 'error');
            });
        } else {
            this.log('Cover already downladed');
        }

        this.metadata = [
            ['title', this.details.title],
            ['artist', (config.useArtistsTag || !config.artistSeperator) ? this.details.artist?.name : this.details.artists?.map(i => i.name).join(config.artistSeperator)],
            ['artists', config.useArtistsTag ? config.artistSeperator ? this.details.artists?.map(i => i.name).join(config.artistSeperator) : this.details.artist?.name : null],
            ['album', this.details.album?.title],
            ['albumartist', (config.useArtistsTag || !config.artistSeperator) ? this.details.albumArtist?.name : this.details.albumArtists?.map(i => i.name).join(config.artistSeperator)],
            ['albumartists', config.useArtistsTag ? config.artistSeperator ? this.details.albumArtists?.map(i => i.name).join(config.artistSeperator) : this.details.albumArtist?.name : null],
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
                config.syncedLyricsOnly ? this.lyrics?.syncedLyrics :
                config.plainLyricsOnly ? this.lyrics?.plainLyrics :
                this.lyrics?.syncedLyrics || this.lyrics?.plainLyrics],
            ...(config.customMetadata?.map(i => ([i[0], formatString(i[1], this.details)])) || [])
        ];
        // console.log(this.metadata);
    }
        
    async downloadSegments() {
        const stream = fs.createWriteStream(`${this.downloadPath}${this.containerExtension}`);

        for (let segmentIndex = 0; segmentIndex < this.segmentUrls.length; segmentIndex++) {
            const segmentUrl = this.segmentUrls[segmentIndex]
                .replace(/&amp;/g, '&'); // fix error when tidal uses key-pair-id parameter instead of token
                
            this.log(`Downloading segment ${segmentIndex + 1} of ${this.segmentUrls.length}...`);
            
            const segmentData = await fetch(segmentUrl).then(async res => Buffer.from(await res.arrayBuffer()));
            stream.write(segmentData);

            const delay = Math.floor(Math.random() * (config.segmentWaitMax - config.segmentWaitMin + 1) + config.segmentWaitMin);
            if (delay) await setTimeout(delay)
        }

        stream.end();
    }

    async createMedia() {
        if (!config.embedMetadata || config.metadataEmbedder !== 'ffmpeg') {
            // Extract from container
            this.log(`Creating ${this.extension} from ${this.containerExtension} container...`);
            await extractContainer(`${this.downloadPath}${this.containerExtension}`, `${this.downloadPath}${this.extension}`);
        }
        
        if (config.embedMetadata) {
            // Embed metadata
            if (config.metadataEmbedder === 'kid3') {
                // Embed via kid3
                this.log('Embedding metadata...');
                await embedMetadata(`${this.downloadPath}${this.extension}`, [...this.metadata, ['picture', fs.existsSync(this.coverPath) ? this.coverPath : undefined, true]]).catch(err => {
                    this.log(`Failed to embed metadata: ${err.message}`, 'error');
                });
            } else {
                // Extract and embed via FFmpeg
                this.log(`Creating ${this.extension} with metadata from ${this.containerExtension} container...`);
                await createMedia(`${this.downloadPath}${this.containerExtension}`, `${this.downloadPath}${this.extension}`, fs.existsSync(this.coverPath) ? this.coverPath : undefined, this.metadata, this.details.isVideo ? 2 : 1);
            }
        }
    }

    removeContainerFile() {
        fs.rmSync(`${this.downloadPath}${this.containerExtension}`);
    }

    removeCoverFile() {
        if (fs.existsSync(this.coverPath)) fs.rmSync(this.coverPath);
    }

    log(msg, level) {
        const log = `${`Downloading ${Logger.applyColor({ bold: true }, `${this.details.title} - ${this.details.artist.name}`)}: `.padEnd(config.downloadLogPadding, ' ')}${msg}`;
        if (level) {
            logger.log(level, log, true, true);
        } else {
            logger.info(log, true);
        }
    }
}

module.exports = Download;