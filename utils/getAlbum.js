function getAlbum(albumId, secrets) {
    return fetch(`https://tidal.com/v1/pages/album?albumId=${albumId}&countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
    }).then(res => res.json());
}

module.exports = getAlbum;