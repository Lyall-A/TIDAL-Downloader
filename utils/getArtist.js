function getArtist(artistId, secrets) {
    return fetch(`https://tidal.com/v2/artist/${artistId}?locale=en_US&countryCode=${secrets.countryCode}&deviceType=BROWSER&platform=WEB`, {
    // return fetch(`https://tidal.com/v1/artists/${artistId}?countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`,
            "x-tidal-client-version": "" // If using v2
        }
    }).then(res => res.json()).then(json => ({
        artist: json.item.data,
        playableContent: json.header.playableContent.items,
        tracks: json.items.find(i => i.moduleId === "ARTIST_TOP_TRACKS").items.map(i => i.data),
        albums: json.items.find(i => i.moduleId === "ARTIST_ALBUMS").items.map(i => i.data),
        singles: json.items.find(i => i.moduleId === "ARTIST_TOP_SINGLES").items.map(i => i.data),
        playlists: json.items.find(i => i.moduleId === "ARTIST_PLAYLIST").items.map(i => i.data),
        videos: json.items.find(i => i.moduleId === "ARTIST_VIDEOS").items.map(i => i.data),
        appearsOn: json.items.find(i => i.moduleId === "ARTIST_APPEARS_ON").items.map(i => i.data),
        biography: json.items.find(i => i.moduleId === "ARTIST_BIOGRAPHY").item.data,
        similarArtists: json.items.find(i => i.moduleId === "ARTIST_SIMILAR_ARTISTS").items.map(i => i.data),
        credits: json.items.find(i => i.moduleId === "ARTIST_CREDITS_V2").items.map(i => i.data),
    }));
}

module.exports = getArtist;