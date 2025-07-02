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
const formatString = require("./utils/formatString");
const embedMetadata = require("./utils/embedMetadata");

const config = require("./config.json");
const secrets = fs.existsSync("./secrets.json") ? JSON.parse(fs.readFileSync("./secrets.json")) : { };

const args = parseArgs(process.argv, {

});

(async () => {
    console.log("Authorizing...");
    await authorize();

    const tracks = []; // Tracks to be downloaded

    if (args.tracks.length) {
        console.log(`Getting info on ${args.tracks.length} track(s)...`);
        for (const trackId of args.tracks) {
            const track = await getTrack(trackId, secrets);
            tracks.push({
                ...track.track,
                album: track.album,
                artists: track.artists
            });
        }
    }

    if (args.albums.length) {
        console.log(`Getting info on ${args.albums.length} album(s)...`);
        for (const albumId of args.albums) {
            const album = await getAlbum(albumId, secrets);
            tracks.push(...album.items.map(i => ({
                ...i,
                album: album.album
            })));
        }
    }

    if (args.artists.length) {
        console.log(`Getting info on ${args.artists.length} artist(s)...`);
        for (const artistId of args.artists) {
            const artist = await getArtist(artistId, secrets);
            const albums = [...artist.albums, ...artist.singles];
            console.log(`  Getting info on ${albums.length} albums...`);
            for (const albumId of albums.map(i => i.id)) {
                const album = await getAlbum(albumId, secrets);
                tracks.push(...album.items.map(i => ({
                    ...i,
                    album: album.album
                })));
            }
        }
    }

    if (args.playlists.length) {
        console.log(`Getting info on ${args.playlists.length} playlist(s)...`);
        for (const playlistId of args.playlists) {
            const playlist = await getPlaylist(playlistId, secrets);
            tracks.push(...playlist.items.map(i => ({
                ...i,
                playlist: playlist.playlist
            })));
        }
    }

    if (args.search.length) {
        console.log(`Getting info on ${args.search.length} search(es)`);
        for (const query of args.search) {
            const result = await search(query, 1, secrets).then(i => i.top[0]);
            if (!result) {
                console.log(`  No search results for "${query}"`);
                continue;
            }
            console.log(`  Found ${result.type.toLowerCase().substring(0, result.type.length - 1)} "${result.value.title} - ${result.value.artists[0].name}"`);
            tracks.push(result.value);
        }
    }

    console.log(`\nDownloading ${tracks.length} tracks...`);

    let quality = args.quality === "low" ? "HIGH" : args.quality === "high" ? "LOSSLESS" : args.quality === "max" ? "HI_RES_LOSSLESS" : config.quality;

    for (const track of tracks) {
        const formattedTrackDetails = {
            artist: track.artists[0],
            album: {
                ...track.album,
                artist: track.album.artists?.[0],
                date: new Date(track.album.releaseDate || track.streamStartDate),
                year: new Date(track.album.releaseDate || track.streamStartDate).getFullYear()
            },
            track: {
                ...track,
                trackNumPadded: track.trackNumber.toString().padStart(2, "0")
            },
            playlist: track.playlist
        };

        const unformattedDownloadPath = path.resolve(args.directory || config.downloadDirectory, args.filename || config.downloadFilename);
        const { root: downloadPathRoot } = path.parse(unformattedDownloadPath);
        const downloadPath = `${downloadPathRoot}${unformattedDownloadPath.replace(downloadPathRoot, "").split(path.sep).map(i => formatString(i, formattedTrackDetails).replace(/\/|\\|\?|\*|\:|\||\"|\<|\>/g, "")).join(path.sep)}`;
        await downloadTrack(formattedTrackDetails, downloadPath, quality);
    }

    console.log("Done downloading tracks");
})();

async function downloadTrack(trackDetails, downloadPath, quality) {
    console.log();
    log("Getting playback info...");
    
    let lyrics;
    let buffer;
    const playbackInfo = await getPlaybackInfo(trackDetails.track.id, secrets, quality);
    const manifest = parseManifest(Buffer.from(playbackInfo.manifest, "base64").toString(), playbackInfo.manifestMimeType);
    const extension = manifest.codecs === "flac" ? ".flac" : ".m4a"; // TODO: is it safe to assume its AAC if not FLAC?

    if (fs.existsSync(`${downloadPath}${extension}`) && !config.overwriteExisting) return log("Already downloaded!");
    
    if (args.lyrics || config.getLyrics) {
        log("Getting lyrics...");
        lyrics = await getLyrics(trackDetails.track.id, secrets).catch(err => log("Couldn't get lyrics!"));
    }

    await new Promise((resolve, reject) => {
        (function downloadSegment(segmentIndex) {
            const segment = manifest.segments[segmentIndex];
            log(`Downloading segment ${segmentIndex + 1} of ${manifest.segments.length}...`);
            fetch(segment).then(async res => {
                // TODO: error
                const segmentArrayBuffer = await res.arrayBuffer();

                if (buffer) {
                    buffer = Buffer.concat([buffer, Buffer.from(segmentArrayBuffer)]);
                } else {
                    buffer = Buffer.from(segmentArrayBuffer);
                }

                if (manifest.segments[++segmentIndex]) {
                    setTimeout(() => downloadSegment(segmentIndex), Math.floor(Math.random() * (config.segmentWaitMax - config.segmentWaitMin + 1) + config.segmentWaitMin));
                } else {
                    resolve();
                }
            });
        })(0);
    });

    log(`Saving as ${extension}...`);
    fs.mkdirSync(path.dirname(downloadPath), { recursive: true });
    fs.writeFileSync(`${downloadPath}.mp4`, buffer);
    await extractAudioStream(`${downloadPath}.mp4`, `${downloadPath}${extension}`);
    fs.rmSync(`${downloadPath}.mp4`);

    log("Embedding metadata...");
    const metadata = {
        title: trackDetails.track.title,
        artist: trackDetails.artist.name,
        album: trackDetails.album.title,
        albumartist: trackDetails.album.artist?.name || trackDetails.artist.name,
        date: `${trackDetails.album.date.getFullYear()}-${(trackDetails.album.date.getMonth() + 1).toString().padStart(2, "0")}-${trackDetails.album.date.getDate().toString().padStart(2, "0")}`,
        copyright: trackDetails.track.copyright,
        originalyear: trackDetails.album.year,
        tracktotal: trackDetails.album.numberOfTracks,
        tracknumber: trackDetails.track.trackNumber,
        disctotal: trackDetails.album.numberOfVolumes,
        discnumber: trackDetails.track.volumeNumber,
        replaygain_track_gain: trackDetails.track.replayGain,
        lyrics: lyrics?.syncedLyrics || lyrics?.plainLyrics,
        ...(config.customMetadata || { })
    };
    // console.log(metadata);
    await embedMetadata(`${downloadPath}${extension}`, metadata).catch(err => {
        console.log(`Failed to embed metadata!`, err);
    });

    log("Done!");
    
    function log(msg) {
        process.stdout.moveCursor(0, -1);
        process.stdout.clearLine();
        process.stdout.write(`Downloading track "${trackDetails.track.title} - ${trackDetails.artist.name}": ${msg}\n`);
    }
}

async function authorize() {
    if (secrets.accessToken &&
        secrets.accessTokenExpiry > Date.now()) return; // Previous token is still valid

    if (secrets.refreshToken && secrets.clientId && secrets.clientSecret) {
        // Refresh token exists
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

    if (!secrets.accessToken ||
        secrets.accessTokenExpiry <= Date.now()) {
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

    fs.writeFileSync("./secrets.json", JSON.stringify(secrets, null, 4));
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