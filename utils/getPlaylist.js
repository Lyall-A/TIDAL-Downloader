const { config, secrets } = require("../globals");

const parsePlaylist = require("./parsePlaylist");

async function getPlaylist(playlistUuid) {
    const playlist = await fetch(`${config.privateApiV2BaseUrl}/user-playlists/${playlistUuid}`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
    }).then(res => res.json());

    const items = [];
    await (async function getItems(offset = 0, limit = 50) {
        return fetch(`${config.privateApiV1BaseUrl}/playlists/${playlistUuid}/items?offset=${offset}&limit=${limit}&countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
            headers: {
                "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
            }
        }).then(res => res.json()).then(json => {
            items.push(...json.items);
            const nextOffset = json.offset + json.limit;
            if (nextOffset < json.totalNumberOfItems) return getItems(nextOffset);
        });
    })();

    return parsePlaylist(playlist.playlist, {
        items
    });
}

module.exports = getPlaylist;