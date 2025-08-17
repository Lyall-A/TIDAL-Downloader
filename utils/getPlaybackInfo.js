const tidalApi = require("./tidalApi");

function getPlaybackInfo(trackId, audioQuality = "HI_RES_LOSSLESS", playbackMode = "STREAM", assetPresentation = "FULL") {
    return tidalApi("privatev1", `/tracks/${trackId}/playbackinfo`, {
        query: {
            audioquality: audioQuality,
            playbackmode: playbackMode,
            assetpresentation: assetPresentation
        }
    }).then(res => res.json);
}

module.exports = getPlaybackInfo;