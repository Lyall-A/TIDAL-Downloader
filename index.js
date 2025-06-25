const fs = require("fs");
const path = require("path");

const requestDeviceAuthorization = require("./utils/requestDeviceAuthorization");
const getToken = require("./utils/getToken");
const getPlaybackInfo = require("./utils/getPlaybackInfo");
const getAlbum = require("./utils/getAlbum");
const parseManifest = require("./utils/parseManifest");
const extractAudioStream = require("./utils/extractAudioStream");

const config = require("./config.json");
const secrets = fs.existsSync("./secrets.json") ? JSON.parse(fs.readFileSync("./secrets.json")) : { };

(async () => {
    console.log("Authorizing...");
    await authorize();

    // TODO: args, obviously
    const album = await getAlbum("370144434", secrets);
    
    for (const track of album.rows.find(i => i.modules[0].type === "ALBUM_ITEMS").modules[0].pagedList.items.map(i => i.item)) {
        await downloadTrack(track);
    }
})();

async function downloadTrack(track, quality) {
    console.log();
    log("Getting playback info...");
    
    let buffer;
    const playbackInfo = await getPlaybackInfo(track.id, secrets, quality);
    const manifest = parseManifest(Buffer.from(playbackInfo.manifest, "base64").toString(), playbackInfo.manifestMimeType);

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
    })

    log("Extracting audio...");
    // TODO: proper output paths
    fs.writeFileSync(`./Downloads/${track.title}.mp4`, buffer);
    await extractAudioStream(`./Downloads/${track.title}.mp4`, `./Downloads/${track.title}.flac`);
    fs.rmSync(`./Downloads/${track.title}.mp4`);
    
    function log(msg) {
        process.stdout.moveCursor(0, -1);
        process.stdout.clearLine();
        process.stdout.write(`Downloading track "${track.title}": ${msg}\n`);
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