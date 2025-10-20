const fs = require('fs');
const path = require('path');

const requestDeviceAuthorization = require('./utils/requestDeviceAuthorization');
const getToken = require('./utils/getToken');
const getPlaybackInfo = require('./utils/getPlaybackInfo');
const getAlbum = require('./utils/getAlbum');
const getArtist = require('./utils/getArtist');
const getTrack = require('./utils/getTrack');
const getLyrics = require('./utils/getLyrics');
const getPlaylist = require('./utils/getPlaylist');
const search = require('./utils/search');
const parseManifest = require('./utils/parseManifest');
const extractAudioStream = require('./utils/extractAudioStream');
const Args = require('./utils/Args');
const formatPath = require('./utils/formatPath');
const formatString = require('./utils/formatString');
const embedMetadata = require('./utils/embedMetadata');
const Logger = require('./utils/Logger');
const createAudio = require('./utils/createAudio');

const { config, secrets, secretsPath, argOptions, execDir } = require('./globals');

const args = new Args(process.argv, argOptions);
const options = {
    help: args.get('help'),
    tracks: args.getAll('track'),
    artists: args.getAll('artist'),
    albums: args.getAll('album'),
    playlists: args.getAll('playlist'),
    searches: args.getAll('search'),
    urls: args.getAll('url'),
    // trackSearches: args.getAll('search-track'),
    // artistSearches: args.getAll('search-artist'),
    // albumSearches: args.getAll('search-album'),
    // playlistSearches: args.getAll('search-playlist'),
    quality: args.get('quality') ?? config.quality,
    directory: args.get('directory') ?? config.downloadDirectory,
    filename: args.get('filename') ?? config.downloadFilename,
    lyrics: args.get('lyrics') ?? config.getLyrics,
};
const logger = new Logger({
    debugLogs: config.debug
});
const quality =
    options.quality === 'low' ? 'HIGH' :
    options.quality === 'high' ? 'LOSSLESS' :
    options.quality === 'max' ? 'HI_RES_LOSSLESS' :
    options.quality;

if (options.help) {
    // oh boy 
    logger.log(null,
`
Usage:
  ${process.argv0}${path.dirname(process.execPath) === process.cwd() ? '' : ' .'} [options...]
Options:
  ${argOptions.map(arg => `${
    `${[
        arg.name ? `--${arg.name}` : null, 
        arg.shortName ? `-${arg.shortName}` : null
    ]
    .filter(i => i)
    .join(', ')}\
${arg.valueDescription ? ` <${arg.valueDescription}>` : ''}`.padEnd(40 - 1, ' ')} \
${arg.description || 'No description...'}`).join('\n  ')}
`.trim());

    process.exit(0);
}

(async () => {
    logger.info('Authorizing...');
    await authorize();

    const tracks = [];
    const albums = [];
    const artists = [];

    const queue = []; // Tracks to be downloaded

    for (const trackId of options.tracks) {
        await addTrack(trackId);
    }

    for (const albumId of options.albums) {
        await addAlbum(albumId);
    }
    
    for (const artistId of options.artists) {
        await addArtist(artistId);
    }

    for (const playlistUuid of options.playlists) {
        await addPlaylist(playlistUuid);
    }

    for (const query of options.searches) {
        logger.info(`Searching for: ${Logger.applyColor({ bold: true }, query)}`, true);
        const result = await search(query, 1).then(i => i.topResults[0]);

        if (result?.type === 'track') await addTrack(result.value.id); else
        if (result?.type === 'album') await addAlbum(result.value.id); else
        if (result?.type === 'artist') await addArtist(result.value.id); else
        logger.error(`No search results for "${Logger.applyColor({ bold: true }, query)}"`, true, true);
    }

    for (const url of options.urls) {
        const match = url.match(/tidal\.com.*\/(track|album|artist|playlist)\/(\d+)/i);
        if (match) {
            const type = match[1].toLowerCase();
            const id = parseInt(match[2], 10);
            
            if (type === 'track') await addTrack(id); else
            if (type === 'album') await addAlbum(id); else
            if (type === 'artist') await addArtist(id); else
            if (type === 'playlist') await addPlaylist(id); else
            logger.error(`Unknown type "${Logger.applyColor({ bold: true }, type)}"`, true, true); // NOTE: not possible with current regex
        } else {
            logger.error(`Couldn't determine URL "${Logger.applyColor({ bold: true }, url)}"`, true, true);
        }
    }
        
    // const startDate = Date.now();

    logger.emptyLine();
    logger.info(`Downloading ${Logger.applyColor({ bold: true }, queue.length)} track(s)...`);

    for (const item of queue) {
        const details = {
            track: item.track,
            album: item.album,
            artists: item.artists,
            albumArtists: item.albumArtists,
            playlist: item.playlist,

            artist: item.artists[0],
            albumArtist: item.albumArtists[0],
            trackNumberPadded: item.track.trackNumber.toString().padStart(2, '0'), // TODO: maybe remove this and add a padding function in formatString?
            albumYear: new Date(item.album.releaseDate).getFullYear()
        };

        const downloadPath = path.join(execDir, formatPath(path.join(options.directory, options.filename), details));
        await downloadTrack(details, downloadPath, quality);
    }

    // logger.emptyLine();
    // logger.info(`Finished in ${((Date.now() - startDate) / 1000 / 60).toFixed(2)} minute(s)`)

    async function addTrack(trackId) {
        const artists = [];
        const albumArtists = [];

        try {
            const track = await findTrack(trackId);

            if (track.upload && !config.allowUserUploads) throw new Error();

            const album = await findAlbum(track.album.id);
            for (const artist of track.artists) artists.push(await findArtist(artist.id));
            for (const artist of album.artists) albumArtists.push(await findArtist(artist.id));

            queue.push({
                track,
                album,
                artists,
                albumArtists
            });

            logger.info(`Found track: ${Logger.applyColor({ bold: true }, `${track.title} - ${track.artists[0].name}`)} (${track.id})`, true, true);
        } catch (err) {
            logger.error(`Could not find track ID: ${Logger.applyColor({ bold: true }, trackId)}`, true, true);
        }
    }

    async function addAlbum(albumId) {
        const tracks = [];

        try {
            const album = await findAlbum(albumId);
            for (const track of album.tracks) tracks.push(await findTrack(track.id));

            for (const track of tracks) {
                const artists = [];
                const albumArtists = [];

                for (const artist of track.artists) artists.push(await findArtist(artist.id));
                for (const artist of album.artists) albumArtists.push(await findArtist(artist.id));

                queue.push({
                    track,
                    album,
                    artists,
                    albumArtists
                });
            }

            logger.info(`Found album: ${Logger.applyColor({ bold: true }, `${album.title} - ${album.artists[0].name}`)} (${album.id})`, true, true);
        } catch (err) {
            logger.error(`Could not find album ID: ${Logger.applyColor({ bold: true }, albumId)}`, true, true);
        }
    }

    async function addArtist(artistId) {
        try {
            const artist = await findArtist(artistId);

            for (const { id: albumId } of artist.albums) {
                const tracks = [];

                const album = await findAlbum(albumId);
                for (const track of album.tracks) tracks.push(await findTrack(track.id));

                for (const track of tracks) {
                    const artists = [];
                    const albumArtists = [];

                    for (const artist of track.artists) artists.push(await findArtist(artist.id));
                    for (const artist of album.artists) albumArtists.push(await findArtist(artist.id));

                    queue.push({
                        track,
                        album,
                        artists,
                        albumArtists
                    });
                }
            }

            logger.info(`Found artist: ${Logger.applyColor({ bold: true }, `${artist.name} - ${artist.albums.length} albums`)} (${artist.id})`, true, true);
        } catch (err) {
            logger.error(`Could not find artist ID: ${Logger.applyColor({ bold: true }, artistId)}`, true, true);
        }
    }

    async function addPlaylist(playlistUuid) {
        try {
            const playlist = await getPlaylist(playlistUuid);

            // We don't need to fetch the track here, everything needed seems to be included
            for (const track of playlist.tracks) {
                const artists = [];
                const albumArtists = [];

                const album = await findAlbum(track.album.id);
                for (const artist of track.artists) artists.push(await findArtist(artist.id));
                for (const artist of album.artists) albumArtists.push(await findArtist(artist.id));

                queue.push({
                    track,
                    album,
                    artists,
                    albumArtists,
                    playlist
                });
            }

            logger.info(`Found playlist: ${Logger.applyColor({ bold: true }, `${playlist.title} - ${playlist.trackCount} tracks`)} (${playlist.uuid})`, true, true);
        } catch (err) {
            logger.error(`Could not find playlist UUID: ${Logger.applyColor({ bold: true }, playlistUuid)}`, true, true);
        }
    }

    async function findTrack(trackId) {
        const foundTrack = tracks.find(track => track.id === trackId);
        if (foundTrack) {
            logger.debug(`Found already fetched track: ${trackId}`);
            return foundTrack;
        } else {
            logger.info(`Getting information about track: ${Logger.applyColor({ bold: true }, trackId)}`, true);
            // debug(`Fetching track: ${trackId}`);
            const track = await getTrack(trackId);
            tracks.push(track);
            return track;
        }
    }

    async function findAlbum(albumId) {
        const foundAlbum = albums.find(album => album.id === albumId);
        if (foundAlbum) {
            logger.debug(`Found already fetched album: ${albumId}`);
            return foundAlbum;
        } else {
            logger.info(`Getting information about album: ${Logger.applyColor({ bold: true }, albumId)}`, true);
            // debug(`Fetching album: ${albumId}`);
            const album = await getAlbum(albumId);
            albums.push(album);
            return album;
        }
    }

    async function findArtist(artistId) {
        const foundArtist = artists.find(artist => artist.id === artistId);
        if (foundArtist) {
            logger.debug(`Found already fetched artist: ${artistId}`);
            return foundArtist;
        } else {
            logger.info(`Getting information about artist: ${Logger.applyColor({ bold: true }, artistId)}`, true);
            // debug(`Fetching artist: ${artistId}`);
            const artist = await getArtist(artistId);
            artists.push(artist);
            return artist;
        }
    }
})();

async function downloadTrack(details, downloadPath, quality) {
    const startDate = Date.now();

    logger.lastLog = '';
    log('Getting playback info...');

    const coverPath = `${config.coverFilename ? path.join(path.dirname(downloadPath), formatPath(config.coverFilename, details)) : downloadPath}.jpg`;
    const playbackInfo = await getPlaybackInfo(details.track.id, quality);
    const manifest = parseManifest(Buffer.from(playbackInfo.manifest, 'base64').toString(), playbackInfo.manifestMimeType);
    const trackPath = `${downloadPath}${manifest.codecs === 'flac' ? '.flac' : '.m4a'}`; // TODO: is it safe to assume AAC if not FLAC?
    let coverExists = fs.existsSync(coverPath);
    let lyrics;
    let metadata;
    let trackBuffer;

    if (fs.existsSync(trackPath) && !config.overwriteExisting) return log('Already downloaded!');
    fs.mkdirSync(path.dirname(downloadPath), { recursive: true });

    if (config.embedMetadata) {
        // Get lyrics
        if (options.lyrics) {
            log('Getting lyrics...');
            lyrics = await getLyrics(details.track.id).catch(err => log('Failed to get lyrics (does it have any?)', 'warn')); // TODO: maybe don't log or change to debug?
        }

        // Download cover
        if (!fs.existsSync(coverPath)) {
            log('Downloading cover...');
            await fetch(details.album.covers[config.coverSize] || details.album.covers['1280']).then(async res => {
                if (res.status !== 200) throw new Error(`Got status code ${res.status}`);
                const coverBuffer = Buffer.from(await res.arrayBuffer());
                fs.writeFileSync(coverPath, coverBuffer);
                coverExists = true;
            }).catch(err => {
                log(`Failed to download cover: ${err.message}`, 'error');
            });
        }

        metadata = [
            ['title', details.track.title],
            ['artist', config.artistSeperator ? details.artists.map(i => i.name).join(config.artistSeperator) : details.artist.name],
            ['album', details.album.title],
            ['albumartist', config.artistSeperator ? details.albumArtists.map(i => i.name).join(config.artistSeperator) : details.albumArtist.name],
            ['date', details.album.releaseDate],
            ['copyright', details.track.copyright],
            ['originalyear', details.albumYear],
            ['tracktotal', details.album.trackCount],
            ['tracknumber', details.track.trackNumber],
            ['disctotal', details.album.volumeCount],
            ['discnumber', details.track.volumeNumber],
            ['replaygain_album_gain', playbackInfo.albumReplayGain],
            ['replaygain_album_peak', playbackInfo.albumPeakAmplitude],
            ['replaygain_track_gain', playbackInfo.trackReplayGain || details.track.replayGain], // NOTE: details.track.replayGain is actually playbackInfo.albumReplayGain
            ['replaygain_track_peak', playbackInfo.trackPeakAmplitude || details.track.peak],
            ['bpm', details.track.bpm],
            ['lyrics', lyrics?.syncedLyrics || lyrics?.plainLyrics],
            ...(config.customMetadata?.map(i => ([i[0], formatString(i[1], details)])) || [])
        ];
        // console.log(metadata);
    }

    // Download all segments
    await new Promise((resolve, reject) => {
        (function downloadSegment(segmentIndex) {
            const segmentUrl = manifest.segments[segmentIndex]
                .replace(/&amp;/g, '&'); // fix error when tidal uses key-pair-id parameter instead of token
            log(`Downloading segment ${segmentIndex + 1} of ${manifest.segments.length}...`);
            fetch(segmentUrl).then(async res => {
                // TODO: error
                const segmentArrayBuffer = await res.arrayBuffer();

                if (trackBuffer) {
                    trackBuffer = Buffer.concat([trackBuffer, Buffer.from(segmentArrayBuffer)]);
                } else {
                    trackBuffer = Buffer.from(segmentArrayBuffer);
                }

                if (manifest.segments[++segmentIndex]) {
                    setTimeout(() => downloadSegment(segmentIndex), Math.floor(Math.random() * (config.segmentWaitMax - config.segmentWaitMin + 1) + config.segmentWaitMin));
                } else {
                    resolve();
                }
            });
        })(0);
    });

    log(`Saving as ${path.extname(trackPath)}...`);

    fs.writeFileSync(`${downloadPath}.mp4`, trackBuffer);

    if (!config.embedMetadata || config.metadataEmbedder !== 'ffmpeg') {
        // Extract audio from MP4 container
        await extractAudioStream(`${downloadPath}.mp4`, trackPath);
    }

    if (config.embedMetadata) {
        // Embed metadata
        if (config.metadataEmbedder === 'kid3') {
            // Embed via kid3
            log('Embedding metadata...');
            await embedMetadata(trackPath, [...metadata, ['picture', coverExists ? coverPath : undefined, true]]).catch(err => {
                log(`Failed to embed metadata: ${err.message}`, 'error');
            });
        } else {
            // Extract and embed via FFmpeg
            await createAudio(`${downloadPath}.mp4`, trackPath, coverExists ? coverPath : undefined, metadata);
        }
    }
    
    if (!config.debug) fs.rmSync(`${downloadPath}.mp4`);

    // Delete cover art if coverFilename not set
    if (coverExists && !config.coverFilename) {
        fs.rmSync(coverPath);
    }

    log(`Completed (${Math.floor((Date.now() - startDate) / 1000)}s)`);

    function log(msg, level) {
        const log = `${`Downloading ${Logger.applyColor({ bold: true }, `${details.track.title} - ${details.artist.name}`)}: `.padEnd(config.downloadLogPadding, ' ')}${msg}`;
        if (level) {
            logger.log(level, log, true, true);
        } else {
            logger.info(log, true);
        }
    }
}

async function authorize() {
    if (secrets.accessToken &&
        secrets.accessTokenExpiry > Date.now()) return logger.debug('Token still valid, not refreshing'); // Previous token is still valid

    if (secrets.refreshToken && secrets.clientId && secrets.clientSecret) {
        // Refresh token exists
        logger.debug('Refreshing token');
        await getToken('refresh_token', {
            refreshToken: secrets.refreshToken,
            clientId: secrets.clientId,
            clientSecret: secrets.clientSecret
        }).then(token => {
            secrets.tokenType = token.token_type;
            secrets.accessToken = token.access_token;
            secrets.accessTokenExpiry = Date.now() + (token.expires_in * 1000);
            secrets.refreshToken = token.refresh_token || secrets.refreshToken;
            secrets.scope = token.scope;
            secrets.countryCode = token.user?.countryCode;
        }).catch(err => {
            logger.error(`Failed to refresh token: ${err?.error_description || 'No error description'} [${err?.sub_status || 'No error code'}]`);
        });
    }

    if (!secrets.accessToken || secrets.accessTokenExpiry <= Date.now()) {
        logger.debug('Attempting to authorize with device authorization');
        await authorizeWithDeviceAuthorization({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            scope: config.scope
        }).then(token => {
            secrets.tokenType = token.token_type;
            secrets.accessToken = token.access_token;
            secrets.accessTokenExpiry = Date.now() + (token.expires_in * 1000);
            secrets.refreshToken = token.refresh_token;
            secrets.clientId = config.clientId;
            secrets.clientSecret = config.clientSecret;
            secrets.scope = token.scope;
            secrets.countryCode = token.user?.countryCode;
        }).catch(err => {
            throw new Error(`Failed to get access token: ${err?.error_description || 'No error description'} [${err?.sub_status || 'No error code'}]`);
        });
    }

    if (secretsPath) fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 4));
}

async function authorizeWithDeviceAuthorization(params = {}) {
    const deviceAuthorization = await requestDeviceAuthorization(params.clientId, params.scope);
    logger.info(`To authenticate, please visit https://${deviceAuthorization.verificationUriComplete}`);

    const deviceAuthorizationStart = Date.now();
    const token = await new Promise((resolve, reject) => {
        (function waitForToken() {
            setTimeout(() => {
                getToken('urn:ietf:params:oauth:grant-type:device_code', {
                    clientId: params.clientId,
                    clientSecret: params.clientSecret,
                    deviceCode: deviceAuthorization.deviceCode,
                    scope: params.scope
                }).then(token => {
                    resolve(token);
                }).catch(err => {
                    if (Date.now() - deviceAuthorizationStart >= deviceAuthorization.expiresIn * 1000) {
                        // Code expired
                        logger.warn('Code expired!');
                        return authorizeWithDeviceAuthorization(params);
                    }
                    if (err.sub_status !== 1002) {
                        // Error other than authorization pending
                        return reject(err);
                    }
                    // Still waiting for authorization
                    return waitForToken();
                });
            }, (deviceAuthorization.interval || 2) * 1000);
        })();
    });

    return token;
};