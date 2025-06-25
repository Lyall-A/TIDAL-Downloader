function getLyrics(trackId, secrets) {
    return fetch(`https://tidal.com/v1/tracks/${trackId}/lyrics?countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
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