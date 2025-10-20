const tidalApi = require('./tidalApi');

function getLyrics(trackId) {
    return tidalApi('privatev1', `/tracks/${trackId}/lyrics`).then(({ json }) => ({
        provider: json.lyricsProvider,
        plainLyrics: json.lyrics,
        syncedLyrics: json.subtitles,
    }));
}

module.exports = getLyrics;