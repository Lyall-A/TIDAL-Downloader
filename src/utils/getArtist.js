const tidalApi = require('./tidalApi');
const parseArtist = require('./parseArtist');

function getArtist(artistId) {
    return tidalApi('privatev2', `/artist/${artistId}`).then(({ json }) => parseArtist(json.item.data, {
        albums: json.items.filter(item => item.moduleId === 'ARTIST_ALBUMS' || item.moduleId === 'ARTIST_TOP_SINGLES').map(({ items }) => items.map(({ data }) => data)).flat()
    }));
}

module.exports = getArtist;