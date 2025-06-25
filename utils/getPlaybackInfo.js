function getPlaybackInfo(trackId, secrets, audioQuality = "HI_RES_LOSSLESS", playbackMode = "STREAM", assetPresentation = "FULL") {
    return fetch(`https://tidal.com/v1/tracks/${trackId}/playbackinfo?audioquality=${audioQuality}&playbackmode=${playbackMode}&assetpresentation=${assetPresentation}`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
    }).then(res => res.json());
}

module.exports = getPlaybackInfo;