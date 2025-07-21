const { config, secrets } = require("../globals");

const parseTrack = require("./parseTrack");
const parseAlbum = require("./parseAlbum");
const parseArtist = require("./parseArtist");

function search(query, limit = 20) {
    return fetch(`${config.privateApiV2BaseUrl}/search/?limit=${limit}&query=${encodeURIComponent(query)}&locale=en_US&countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
    // return fetch(`https://tidal.com/v1/artists/${artistId}?countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
    }).then(res => res.json()).then(json => {
        return {
            topResults: json.topHits.map(({ type, value }) => {
                if (type === "TRACKS") return { type: "track", value: parseTrack(value) };
                if (type === "ALBUMS") return { type: "album", value: parseTrack(value) };
                if (type === "ARTISTS") return { type: "artist", value: parseTrack(value) };
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