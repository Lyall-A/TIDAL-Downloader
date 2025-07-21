const { config, secrets } = require("../globals");

const parseArtist = require("./parseArtist");

function getArtist(artistId) {
    return fetch(`${config.privateApiV2BaseUrl}/artist/${artistId}?locale=en_US&countryCode=${secrets.countryCode}&deviceType=BROWSER&platform=WEB`, {
        // return fetch(`https://tidal.com/v1/artists/${artistId}?countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`,
            "x-tidal-client-version": "" // If using v2
        }
    }).then(res => res.json()).then(json => parseArtist(json.item.data, {
        albums: json.items.filter(item => item.moduleId === "ARTIST_ALBUMS" || item.moduleId === "ARTIST_TOP_SINGLES").map(({ items }) => items.map(({ data }) => data)).flat()
    }));
}

module.exports = getArtist;