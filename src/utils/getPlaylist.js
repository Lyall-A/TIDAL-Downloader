const tidalApi = require('./tidalApi');

const parsePlaylist = require('./parsePlaylist');

async function getPlaylist(playlistUuid) {
    const playlist = await tidalApi('privatev2', `/user-playlists/${playlistUuid}`).then(res => res.json);

    const items = [];
    await (async function getItems(offset = 0, limit = 50) {
        return tidalApi('privatev1', `/playlists/${playlistUuid}/items`, {
            query: {
                offset,
                limit
            }
        }).then(({ json }) => {
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