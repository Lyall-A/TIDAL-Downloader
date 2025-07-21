const { config, secrets } = require("../globals");

function getLyrics(trackId) {
    return fetch(`${config.privateApiV1BaseUrl}/tracks/${trackId}/lyrics?countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
    }).then(res => res.json()).then(json => ({
        provider: json.lyricsProvider,
        plainLyrics: json.lyrics,
        syncedLyrics: json.subtitles,
    }));
}

module.exports = getLyrics;