async function getPlaylist(playlistId, secrets) {
    const playlist = await fetch(`https://tidal.com/v2/user-playlists/${playlistId}?countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
    }).then(res => res.json());

    const items = [];
    await (async function getItems(offset = 0, limit = 50) {
        return fetch(`https://tidal.com/v1/playlists/${playlistId}/items?offset=${offset}&limit=${limit}&countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
            headers: {
                "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
            }
        }).then(res => res.json()).then(json => {
            items.push(...json.items.map(i => i.item));
            const nextOffset = json.offset + json.limit;
            if (nextOffset < json.totalNumberOfItems) return getItems(nextOffset);
        });
    })();

    return {
        followInfo: playlist.followInfo,
        playlist: playlist.playlist,
        profile: playlist.profile,
        items
    };
}

module.exports = getPlaylist;