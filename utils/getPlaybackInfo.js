const { config, secrets } = require("../globals");

function getPlaybackInfo(trackId, audioQuality = "HI_RES_LOSSLESS", playbackMode = "STREAM", assetPresentation = "FULL") {
    return fetch(`${config.privateApiV1BaseUrl}/tracks/${trackId}/playbackinfo?audioquality=${audioQuality}&playbackmode=${playbackMode}&assetpresentation=${assetPresentation}`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
    }).then(res => res.json());
}

module.exports = getPlaybackInfo;