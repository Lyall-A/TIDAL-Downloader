const tidalApi = require('./tidalApi');

function getPlaybackInfo(id, type = 'track', quality = 'HI_RES_LOSSLESS', playbackMode = 'STREAM', assetPresentation = 'FULL') {
    const isVideo = type === 'video' ? true : false;

    return tidalApi('privatev1', `/${type === 'video' ? 'videos' : 'tracks'}/${id}/playbackinfo`, {
        query: {
            ...(isVideo ? { videoquality: quality } : { audioquality: quality }),
            playbackmode: playbackMode,
            assetpresentation: assetPresentation
        }
    }).then(res => res.json);
}

module.exports = getPlaybackInfo;