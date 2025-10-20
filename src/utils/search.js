const tidalApi = require('./tidalApi');

const parseTrack = require('./parseTrack');
const parseAlbum = require('./parseAlbum');
const parseArtist = require('./parseArtist');

function search(query, limit = 20) {
    return tidalApi('privatev2', '/search/', {
        query: {
            limit,
            query
        }
    }).then(({ json }) => {
        return {
            topResults: json.topHits.map(({ type, value }) => {
                if (type === 'TRACKS') return { type: 'track', value: parseTrack(value) };
                if (type === 'ALBUMS') return { type: 'album', value: parseTrack(value) };
                if (type === 'ARTISTS') return { type: 'artist', value: parseTrack(value) };
            }).filter(i => i),
            tracks: json.tracks.items.map(parseTrack),
            albums: json.albums.items.map(parseAlbum),
            artists: json.artists.items.map(parseArtist),
            // playlists: json.playlists.items,
            // videos: json.videos.items,
            // genres: json.genres.items,
            // users: json.userProfiles.items,
        }
    });
}

module.exports = search;