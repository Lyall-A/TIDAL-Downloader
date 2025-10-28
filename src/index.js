const fs = require('fs');
const path = require('path');

const requestDeviceAuthorization = require('./utils/requestDeviceAuthorization');
const getToken = require('./utils/getToken');
const getAlbum = require('./utils/getAlbum');
const getArtist = require('./utils/getArtist');
const getTrack = require('./utils/getTrack');
const getVideo = require('./utils/getVideo');
const getPlaylist = require('./utils/getPlaylist');
const search = require('./utils/search');
const Args = require('./utils/Args');
const formatPath = require('./utils/formatPath');
const Logger = require('./utils/Logger');
const Download = require('./utils/Download');

const { config, secrets, secretsPath, argOptions, execDir, logger } = require('./globals');

const args = new Args(process.argv, argOptions);
const options = {
    help: args.get('help'),
    tracks: args.getAll('track'),
    artists: args.getAll('artist'),
    albums: args.getAll('album'),
    videos: args.getAll('video'),
    playlists: args.getAll('playlist'),
    searches: args.getAll('search'),
    urls: args.getAll('url'),
    trackQuality: (args.get('track-quality') ?? config.trackQuality)?.toLowerCase(),
    videoQuality: (args.get('video-quality') ?? config.videoQuality)?.toLowerCase(),
    lyrics: args.get('lyrics') ?? config.getLyrics,
    cover: args.get('cover') ?? config.getCover
};
if (options.help) showHelp();

(async () => {
    logger.info('Authorizing...');
    await authorize();

    const tracks = [];
    const albums = [];
    const videos = [];
    const artists = [];

    const queue = []; // Tracks to be downloaded

    for (const trackId of options.tracks) await addTrack(trackId); // Tracks
    for (const albumId of options.albums) await addAlbum(albumId); // Albums
    for (const videoId of options.videos) await addVideo(videoId); // Videos
    for (const artistId of options.artists) await addArtist(artistId); // Artists
    for (const playlistUuid of options.playlists) await addPlaylist(playlistUuid); // Playlists

    // Searches
    for (const query of options.searches) {
        logger.info(`Searching for: ${Logger.applyColor({ bold: true }, query)}`, true);
        const result = await search(query, 1).then(i => i.topResults[0]);

        if (result?.type === 'track') await addTrack(result.value.id); else
        if (result?.type === 'album') await addAlbum(result.value.id); else
        if (result?.type === 'video') await addVideo(result.value.id); else
        if (result?.type === 'artist') await addArtist(result.value.id); else
        if (result?.type === 'playlist') await addPlaylist(result.value.id); else
        logger.error(`No search results for "${Logger.applyColor({ bold: true }, query)}"`, true, true);
    }

    // URLS
    for (const url of options.urls) {
        const match = url.match(/tidal\.com.*\/(track|album|video|artist|playlist)\/(\d+)/i);
        if (match) {
            const type = match[1].toLowerCase();
            const id = parseInt(match[2], 10);
            
            if (type === 'track') await addTrack(id); else
            if (type === 'album') await addAlbum(id); else
            if (type === 'video') await addVideo(id); else
            if (type === 'artist') await addArtist(id); else
            if (type === 'playlist') await addPlaylist(id); else
            logger.error(`Unknown type "${Logger.applyColor({ bold: true }, type)}"`, true, true); // NOTE: not possible with current regex
        } else {
            logger.error(`Couldn't determine URL "${Logger.applyColor({ bold: true }, url)}"`, true, true);
        }
    }

    if (queue.length === 0) showHelp();

    // const startDate = Date.now();

    logger.emptyLine();
    logger.info(`Downloading ${Logger.applyColor({ bold: true }, queue.length)} track(s)...`);

    for (const item of queue) {
        const details = {
            track: item.track,
            album: item.album,
            video: item.video,
            artists: item.artists,
            albumArtists: item.albumArtists,
            playlist: item.playlist,
            
            artist: item.artists?.[0],
            albumArtist: item.albumArtists?.[0],
            trackNumberPadded: item.track?.trackNumber?.toString().padStart(2, '0'), // TODO: maybe remove this and add a padding function in formatString?
            isTrack: item.track ? true : false,
            isVideo: item.video ? true : false,

            // Generic details
            type:
                item.track ? 'track' :
                item.video ? 'video' :
                null,
            id:
                item.track ? item.track.id :
                item.video ? item.video.id : 
                null,
            title:
                item.track ? item.track.fullTitle :
                item.video ? item.video.title :
                null,
            cover:
                item.album ? item.album.covers[config.trackCoverSize] || item.album.covers['1280'] :
                item.video ? item.video.images[config.videoCoverSize] || item.video.images['1280x720'] :
                null,
            url:
                item.album ? `https://tidal.com/album/${item.album.id}` :
                item.video ? `https://tidal.com/video/${item.video.id}` :
                null,
            releaseDate:
                item.album?.releaseDate ? new Date(item.album.releaseDate).toISOString().split('T')[0] :
                item.video?.releaseDate ? new Date(item.video.releaseDate).toISOString().split('T')[0] :
                null,
            releaseYear:
                item.album?.releaseDate ? new Date(item.album.releaseDate).getFullYear() :
                item.video?.releaseDate ? new Date(item.video.releaseDate).getFullYear() :
                null,
            explicit:
                item.track ? item.track.explicit :
                item.video ? item.video.explicit :
                null,
        };

        const directory = path.join(execDir, formatPath(details.isTrack ? config.albumDirectory : config.videoDirectory, details));
        const mediaFilename = formatPath(details.isTrack ? config.trackFilename : config.videoFilename, details);

        const trackQuality =
            options.trackQuality === 'low' ? 'HIGH' :
            options.trackQuality === 'high' ? 'LOSSLESS' :
            options.trackQuality === 'max' ? 'HI_RES_LOSSLESS' :
            options.trackQuality;

        const videoQuality =
            options.videoQuality === 'low' ? '480' :
            options.videoQuality === 'high' ? '720' :
            options.videoQuality === 'max' ? null :
            options.videoQuality;

        await new Download({
            details,
            logger,
            trackQuality,
            videoQuality,
            directory,
            mediaFilename,
            coverFilename: config.coverFilename ? formatPath(config.coverFilename, details) : mediaFilename,
            overwriteExisting: config.overwriteExisting,
            embedMetadata: config.embedMetadata,
            metadataEmbedder: config.metadataEmbedder,
            keepCoverFile: config.coverFilename ? true : false,
            getCover: options.cover,
            getLyrics: options.lyrics,
            syncedLyricsOnly: config.syncedLyricsOnly,
            plainLyricsOnly: config.plainLyricsOnly,
            useArtistsTag: config.useArtistsTag,
            artistSeperator: config.artistSeperator,
            customMetadata: config.customMetadata,
            keepContainerFile: config.debug ? true : false,
            segmentWaitMin: config.segmentWaitMin,
            segmentWaitMax: config.segmentWaitMax,
            downloadLogPadding: config.downloadLogPadding,
        }).download();
    }

    // logger.emptyLine();
    // logger.info(`Finished in ${((Date.now() - startDate) / 1000 / 60).toFixed(2)} minute(s)`)

    async function addTrack(trackId) {
        const artists = [];
        const albumArtists = [];

        try {
            const track = await findTrack(trackId);

            if (track.upload && !config.allowUserUploads) throw new Error('User uploads are disabled');

            const album = await findAlbum(track.album.id);
            for (const artist of track.artists) artists.push(await findArtist(artist.id));
            for (const artist of album.artists) albumArtists.push(await findArtist(artist.id));

            queue.push({
                track,
                album,
                artists,
                albumArtists
            });

            logger.info(`Found track: ${Logger.applyColor({ bold: true }, `${track.fullTitle} - ${track.artists[0].name}`)} (${track.id})`, true, true);
        } catch (err) {
            logger.error(`Could not find track ID: ${Logger.applyColor({ bold: true }, trackId)}`, true, true);
        }
    }

    async function addAlbum(albumId) {
        const tracks = [];

        try {
            const album = await findAlbum(albumId);

            if (album.upload && !config.allowUserUploads) throw new Error('User uploads are disabled');

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

    async function addVideo(videoId) {
        const artists = [];

        try {
            const video = await findVideo(videoId);

            for (const artist of video.artists) artists.push(await findArtist(artist.id));

            queue.push({
                video,
                artists,
            });

            logger.info(`Found video: ${Logger.applyColor({ bold: true }, `${video.title} - ${video.artists[0].name}`)} (${video.id})`, true, true);
        } catch (err) {
            logger.error(`Could not find video ID: ${Logger.applyColor({ bold: true }, videoId)}`, true, true);
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
    
    async function findVideo(videoId) {
        const foundVideo = videos.find(video => video.id === videoId);
        if (foundVideo) {
            logger.debug(`Found already fetched video: ${videoId}`);
            return videoId;
        } else {
            logger.info(`Getting information about video: ${Logger.applyColor({ bold: true }, videoId)}`, true);
            const video = await getVideo(videoId);
            videos.push(video);
            return video;
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

function showHelp() {
    // hell hell hell hell hell
    logger.log(null,
`
Usage:
  ${process.argv0}${path.dirname(process.execPath) === process.cwd() ? '' : ' .'} [options...]
Options:
  ${argOptions.map(arg => `${
    `${[
        arg.name ? `--${arg.name}` : null, 
        arg.shortName ? `-${arg.shortName}` : null,
        ...(arg.aliases ? arg.aliases.map(alias => [`--${alias}`]) : []),
        ...(arg.shortAliases ? arg.shortAliases.map(alias => [`-${alias}`]) : []),
    ]
    .filter(i => i)
    .join(', ')}\
${arg.valueDescription ? ` <${arg.valueDescription}>` : ''}`.padEnd(60 - 1, ' ')} \
${arg.description || 'No description...'}`).join('\n  ')}
`.trim());

    process.exit(0);
}