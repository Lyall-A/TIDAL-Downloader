const fs = require('fs');
const path = require('path');
const { setTimeout } = require('timers/promises');

const { config, logger } = require('../globals');
const Logger = require('./Logger');
const getPlaybackInfo = require('./getPlaybackInfo');
const parseManifest = require('./parseManifest');
const createMedia = require('./createMedia');
const embedMetadata = require('./embedMetadata');
const extractAudioStream = require('./extractContainer');
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
        this.startDate = Date.now();
        this.details = options.details;
        this.quality = options.quality;
        this.downloadPath = options.downloadPath;
        this.coverPath = options.coverPath;
    }

    async getSegments() {
        this.log('Getting segment URL\'s...');
        this.playbackInfo = await getPlaybackInfo(this.details.id, this.details.type, this.details.isVideo ? 'HIGH' : this.quality);
        this.manifest = await parseManifest(Buffer.from(this.playbackInfo.manifest, 'base64').toString(), this.playbackInfo.manifestMimeType);
        
        if (this.details.isTrack) {
            this.segmentUrls = this.manifest.segments;
            this.containerExtension = '.mp4';
            this.extension = this.manifest.codecs === 'flac' ? '.flac' : '.m4a'; // TODO: is it safe to assume AAC if not FLAC?
        } else if (this.details.isVideo) {
            const segmentManifests = this.manifest.mainManifests[0].segmentManifests;
            this.segmentUrls = segmentManifests[segmentManifests.length - 1].segments; // TODO: pick res obviously
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
            ['artist', config.artistSeperator ? this.details.artists.map(i => i.name).join(config.artistSeperator) : this.details.artist.name],
            // ['album', this.details.album.title],
            // ['albumartist', config.artistSeperator ? this.details.albumArtists.map(i => i.name).join(config.artistSeperator) : this.details.albumArtist.name],
            // ['date', this.details.album.releaseDate],
            // ['copyright', this.details.track.copyright],
            // ['originalyear', this.details.albumYear],
            // ['tracktotal', this.details.album.trackCount],
            // ['tracknumber', this.details.track.trackNumber],
            // ['disctotal', this.details.album.volumeCount],
            // ['discnumber', this.details.track.volumeNumber],
            // ['replaygain_album_gain', this.playbackInfo.albumReplayGain],
            // ['replaygain_album_peak', this.playbackInfo.albumPeakAmplitude],
            // ['replaygain_track_gain', this.playbackInfo.trackReplayGain || this.details.track.replayGain], // NOTE: details.track.replayGain is actually playbackInfo.albumReplayGain
            // ['replaygain_track_peak', this.playbackInfo.trackPeakAmplitude || this.details.track.peak],
            // ['bpm', this.details.track.bpm],
            ['lyrics', this.lyrics?.syncedLyrics || this.lyrics?.plainLyrics],
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
            await extractAudioStream(`${this.downloadPath}${this.containerExtension}`, `${this.downloadPath}${this.extension}`);
        }
        
        if (config.embedMetadata) {
            // Embed metadata
            if (config.metadataEmbedder === 'kid3') {
                // Embed via kid3
                this.log('Embedding metadata...');
                await embedMetadata(trackPath, [...this.metadata, ['picture', fs.existsSync(this.coverPath) ? this.coverPath : undefined, true]]).catch(err => {
                    this.log(`Failed to embed metadata: ${err.message}`, 'error');
                });
            } else {
                // Extract and embed via FFmpeg
                this.log(`Creating ${this.extension} from ${this.containerExtension} container with metadata...`);
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