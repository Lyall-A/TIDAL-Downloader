const tidalApi = require('./tidalApi');

function getVideo(videoId) {
    const parseVideo = require('./parseVideo');

    return tidalApi('privatev1', `/videos/${videoId}`).then(({ json }) => parseVideo(json));
}

module.exports = getVideo;