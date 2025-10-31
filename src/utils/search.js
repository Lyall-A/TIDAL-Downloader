const tidalApi = require('./tidalApi');

const parseTrack = require('./parseTrack');
const parseAlbum = require('./parseAlbum');
const parseArtist = require('./parseArtist');
const parsePlaylist = require('./parsePlaylist');
const parseVideo = require('./parseVideo');

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
                if (type === 'ALBUMS') return { type: 'album', value: parseAlbum(value) };
                if (type === 'VIDEOS') return { type: 'video', value: parseVideo(value) };
                if (type === 'ARTISTS') return { type: 'artist', value: parseArtist(value) };
                if (type === 'PLAYLISTS') return { type: 'playlist', value: parsePlaylist(value) };
            }).filter(i => i),
            tracks: json.tracks.items.map(parseTrack),
            albums: json.albums.items.map(parseAlbum),
            videos: json.videos.items.map(parseVideo),
            artists: json.artists.items.map(parseArtist),
            playlists: json.playlists.items.map(parsePlaylist),
            // genres: json.genres.items,
            // users: json.userProfiles.items,
        }
    });
}

module.exports = search;