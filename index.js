const fs = require("fs");
const path = require("path");

const requestDeviceAuthorization = require("./utils/requestDeviceAuthorization");
const getToken = require("./utils/getToken");
const getPlaybackInfo = require("./utils/getPlaybackInfo");
const getAlbum = require("./utils/getAlbum");
const getArtist = require("./utils/getArtist");
const getTrack = require("./utils/getTrack");
const getLyrics = require("./utils/getLyrics");
const getPlaylist = require("./utils/getPlaylist");
const search = require("./utils/search");
const parseManifest = require("./utils/parseManifest");
const extractAudioStream = require("./utils/extractAudioStream");
const parseArgs = require("./utils/parseArgs");
const formatPath = require("./utils/formatPath");
const embedMetadata = require("./utils/embedMetadata");

const { config, secrets } = require("./globals");

const args = parseArgs(process.argv, {

});

(async () => {
    console.log("Authorizing...");
    await authorize();

    const tracks = [];
    const albums = [];
    const artists = [];

    const queue = []; // Tracks to be downloaded

    if (args.tracks.length) {
        // console.log(`Getting info on ${args.tracks.length} track(s)...`);
        for (const trackId of args.tracks) {
            await addTrack(trackId);
        }
    }

    if (args.albums.length) {
        // console.log(`Getting info on ${args.albums.length} album(s)...`);
        for (const albumId of args.albums) {
            await addAlbum(albumId);
        }
    }

    if (args.artists.length) {
        // console.log(`Getting info on ${args.artists.length} artist(s)...`);
        for (const artistId of args.artists) {
            await addArtist(artistId);
        }
    }

    if (args.playlists.length) {
        // console.log(`Getting info on ${args.playlists.length} playlist(s)...`);
        for (const playlistUuid of args.playlists) {
            await addPlaylist(playlistUuid);
        }
    }

    if (args.search.length) {
        // console.log(`Getting info on ${args.search.length} search(es)`);
        for (const query of args.search) {
            const result = await search(query, 1).then(i => i.topResults[0]);

            if (result?.type === "track") await addTrack(result.value.id); else
            if (result?.type === "album") await addAlbum(result.value.id); else
            if (result?.type === "artist") await addArtist(result.value.id); else
            console.log(`No search results for "${query}"`);
        }
    }

    console.log(`Downloading ${queue.length} track(s)...`);

    let quality =
        args.quality === "low" ? "HIGH" :
        args.quality === "high" ? "LOSSLESS" :
        args.quality === "max" ? "HI_RES_LOSSLESS" :
        config.quality;

    for (const item of queue) {
        const details = {
            track: item.track,
            album: item.album,
            artists: item.artists,
            albumArtists: item.albumArtists,
            playlist: item.playlist,

            artist: item.artists[0],
            albumArtist: item.albumArtists[0],
            trackNumberPadded: item.track.trackNumber.toString().padStart(2, "0"), // TODO: maybe remove this and add a padding function in formatString?
            albumYear: new Date(item.album.releaseDate).getFullYear()
        };

        const downloadPath = formatPath(path.resolve(args.directory || config.downloadDirectory, args.filename || config.downloadFilename), details);
        await downloadTrack(details, downloadPath, quality);
    }

    // console.log("Done downloading tracks");

    async function addTrack(trackId) {
        const artists = [];
        const albumArtists = [];

        const track = await findTrack(trackId);
        const album = await findAlbum(track.album.id);
        for (const artist of track.artists) artists.push(await findArtist(artist.id));
        for (const artist of album.artists) albumArtists.push(await findArtist(artist.id));
        
        queue.push({
            track,
            album,
            artists,
            albumArtists
        });

        console.log(`Found track: ${track.title} - ${track.artists[0].name}\n`);
    }

    async function addAlbum(albumId) {
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

        console.log(`Found album: ${album.title} - ${album.artists[0].name}\n`);
    }

    async function addArtist(artistId) {
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

        console.log(`Found artist: ${artist.name} - ${artist.albums.length} albums\n`);
    }

    async function addPlaylist(playlistUuid) {
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

        console.log(`Found playlist: ${playlist.title} - ${playlist.trackCount} tracks\n`);
    }

    async function findTrack(trackId) {
        const foundTrack = tracks.find(track => track.id === trackId);
        if (foundTrack) {
            debug(`Found already fetched track: ${trackId}`);
            return foundTrack;
        } else {
            changeLine(`Getting information about track: ${trackId}`);
            // debug(`Fetching track: ${trackId}`);
            const track = await getTrack(trackId);
            tracks.push(track);
            return track;
        }
    }

    async function findAlbum(albumId) {
        const foundAlbum = albums.find(album => album.id === albumId);
        if (foundAlbum) {
            debug(`Found already fetched album: ${albumId}`);
            return foundAlbum;
        } else {
            changeLine(`Getting information about album: ${albumId}`);
            // debug(`Fetching album: ${albumId}`);
            const album = await getAlbum(albumId);
            albums.push(album);
            return album;
        }
    }

    async function findArtist(artistId) {
        const foundArtist = artists.find(artist => artist.id === artistId);
        if (foundArtist) {
            debug(`Found already fetched artist: ${artistId}`);
            return foundArtist;
        } else {
            changeLine(`Getting information about artist: ${artistId}`);
            // debug(`Fetching artist: ${artistId}`);
            const artist = await getArtist(artistId);
            artists.push(artist);
            return artist;
        }
    }
})();

async function downloadTrack(details, downloadPath, quality) {
    console.log();
    log("Getting playback info...");

    const coverPath = `${config.coverFilename ? formatPath(path.resolve(path.dirname(downloadPath), config.coverFilename), details) : downloadPath}.jpg`;
    const playbackInfo = await getPlaybackInfo(details.track.id, quality);
    const manifest = parseManifest(Buffer.from(playbackInfo.manifest, "base64").toString(), playbackInfo.manifestMimeType);
    const trackPath = `${downloadPath}${manifest.codecs === "flac" ? ".flac" : ".m4a"}`; // TODO: is it safe to assume AAC if not FLAC?
    let coverExists = fs.existsSync(coverPath);
    let lyrics;
    let trackBuffer;

    if (fs.existsSync(trackPath) && !config.overwriteExisting) return log("Already downloaded!");

    if (args.lyrics || config.getLyrics) {
        log("Getting lyrics...");
        lyrics = await getLyrics(details.track.id).catch(err => log("Couldn't get lyrics!"));
    }

    // Download all segments
    await new Promise((resolve, reject) => {
        (function downloadSegment(segmentIndex) {
            const segment = manifest.segments[segmentIndex];
            log(`Downloading segment ${segmentIndex + 1} of ${manifest.segments.length}...`);
            fetch(segment).then(async res => {
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

    // Save and extract audio from MP4
    log(`Saving as ${path.extname(trackPath)}...`);
    fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
    fs.writeFileSync(`${downloadPath}.mp4`, trackBuffer);
    await extractAudioStream(`${downloadPath}.mp4`, trackPath);
    fs.rmSync(`${downloadPath}.mp4`);

    if (config.embedMetadata) {
        // Download cover
        if (details.album.cover && !fs.existsSync(coverPath)) {
            log("Downloading cover...");
            await fetch(details.album.cover).then(async res => {
                if (res.status !== 200) throw new Error(`Got status code ${res.status}`);
                const coverBuffer = Buffer.from(await res.arrayBuffer());
                fs.writeFileSync(coverPath, coverBuffer);
                coverExists = true;
            }).catch(err => {
                log(`Failed to download cover: ${err.message}\n`);
            });
        }

        log("Embedding metadata...");
        const metadata = [
            ["title", details.track.title],
            ["artist", config.artistSeperator ? details.artists.map(i => i.name).join(config.artistSeperator) : details.artist.name],
            ["album", details.album.title],
            ["albumartist", config.artistSeperator ? details.albumArtists.map(i => i.name).join(config.artistSeperator) : details.albumArtist.name],
            ["date", details.album.releaseDate],
            ["copyright", details.track.copyright],
            ["originalyear", details.albumYear],
            ["tracktotal", details.album.trackCount],
            ["tracknumber", details.track.trackNumber],
            ["disctotal", details.album.volumeCount],
            ["discnumber", details.track.volumeNumber],
            ["replaygain_track_gain", details.track.replayGain],
            ["replaygain_track_peak", details.track.peak],
            ["bpm", details.track.bpm],
            ["lyrics", lyrics?.syncedLyrics || lyrics?.plainLyrics],
            ["picture", coverExists ? coverPath : null, true],
            ...(config.customMetadata || [])
        ];
        // console.log(metadata);
        
        // Embed metadata
        await embedMetadata(trackPath, metadata).catch(err => {
            log(`Failed to embed metadata: ${err.message}\n`);
        });

        // Delete cover art if coverFilename not set
        if (coverExists && !config.coverFilename) {
            fs.rmSync(coverPath);
        }
    }

    log("Completed");

    function log(msg) {
        changeLine(`Downloading track "${details.track.title} - ${details.artist.name}": ${msg}`);
    }
}

async function authorize() {
    if (secrets.accessToken &&
        secrets.accessTokenExpiry > Date.now()) return debug("Token still valid, not refreshing"); // Previous token is still valid

    if (secrets.refreshToken && secrets.clientId && secrets.clientSecret) {
        // Refresh token exists
        debug("Refreshing token");
        await getToken("refresh_token", {
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
            console.log(`Failed to refresh token: ${err?.error_description || "No error description"} [${err?.sub_status || "No error code"}]`);
        });
    }

    if (!secrets.accessToken || secrets.accessTokenExpiry <= Date.now()) {
        debug("Attempting to authorize with device authorization");
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
            throw new Error(`Failed to get access token: ${err?.error_description || "No error description"} [${err?.sub_status || "No error code"}]`);
        });
    }

    fs.writeFileSync(config.secretsPath, JSON.stringify(secrets, null, 4));
}

async function authorizeWithDeviceAuthorization(params = {}) {
    const deviceAuthorization = await requestDeviceAuthorization(params.clientId, params.scope);
    console.log(`To authenticate, please visit https://${deviceAuthorization.verificationUriComplete}`);

    const deviceAuthorizationStart = Date.now();
    const token = await new Promise((resolve, reject) => {
        (function waitForToken() {
            setTimeout(() => {
                getToken("urn:ietf:params:oauth:grant-type:device_code", {
                    clientId: params.clientId,
                    clientSecret: params.clientSecret,
                    deviceCode: deviceAuthorization.deviceCode,
                    scope: params.scope
                }).then(token => {
                    resolve(token);
                }).catch(err => {
                    if (Date.now() - deviceAuthorizationStart >= deviceAuthorization.expiresIn * 1000) {
                        // Code expired
                        console.log("Code expired!");
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

function changeLine(msg) {
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine();
    process.stdout.write(`${msg}\n`);
}

function debug(...msg) {
    if (config.debug) console.log(`[DEBUG]`, ...msg);
}