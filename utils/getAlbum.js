const { config, secrets } = require("../globals");

const parseAlbum = require("./parseAlbum");

function getAlbum(albumId) {
    return fetch(`${config.privateApiV1BaseUrl}/pages/album?albumId=${albumId}&countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
        // }).then(i => i.json()).then(i => console.log(i.rows.map(i => i.modules[0])))
    }).then(res => res.json()).then(json => {
        const { album, description, credits, review } = json.rows[0].modules[0];
        const tracks = json.rows[1].modules[0].pagedList.items.filter(({ type }) => type === "track").map(({ item }) => item); // Default limit seems to be 9999
        return parseAlbum(album, {
            description,
            credits,
            review,
            tracks
        })
    });
}

module.exports = getAlbum;