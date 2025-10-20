const tidalApi = require('./tidalApi');

function getTrack(trackId) {
    const parseTrack = require('./parseTrack');

    return tidalApi('privatev1', `/tracks/${trackId}`).then(({ json }) => parseTrack(json));
}

module.exports = getTrack;