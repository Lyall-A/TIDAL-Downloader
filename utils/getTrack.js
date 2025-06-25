function getTrack(trackId, secrets) {
    return fetch(`https://tidal.com/v1/tracks/${trackId}?countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
    }).then(res => res.json()).then(json => ({
        track: json,
        artists: json.artists,
        album: json.album
    }));
}

module.exports = getTrack;