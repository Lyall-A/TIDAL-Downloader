function search(query, limit = 20, secrets) {
    return fetch(`https://tidal.com/v2/search/?limit=${limit}&query=${encodeURIComponent(query)}&locale=en_US&countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
    // return fetch(`https://tidal.com/v1/artists/${artistId}?countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
    }).then(res => res.json()).then(json => ({
        tracks: json.tracks.items,
        albums: json.albums.items,
        playlists: json.playlists.items,
        videos: json.videos.items,
        artists: json.artists.items,
        genres: json.genres.items,
        users: json.userProfiles.items,
        top: json.topHits,
    }));
}

module.exports = search;