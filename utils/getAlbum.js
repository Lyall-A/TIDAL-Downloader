function getAlbum(albumId, secrets) {
    return fetch(`https://tidal.com/v1/pages/album?albumId=${albumId}&countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
    }).then(res => res.json()).then(json => ({
        album: json.rows[0].modules[0].album,
        items: json.rows[1].modules[0].pagedList.items.map(i => i.item)
    }));
}

module.exports = getAlbum;