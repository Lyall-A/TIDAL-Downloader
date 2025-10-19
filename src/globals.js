const fs = require('fs');

if (!fs.existsSync('./config.json')) fs.writeFileSync('./config.json', JSON.stringify(require('./default.config.json'), null, 4));

const config = JSON.parse(fs.readFileSync('./config.json'));
const secrets = fs.existsSync(config.secretsPath) ? JSON.parse(fs.readFileSync(config.secretsPath)) : { };

module.exports = {
    config,
    secrets,
    argOptions: [
        { name: 'help', shortName: 'h', noValue: true, description: 'Displays this menu' },
        { name: 'track', shortName: 't', type: 'int', description: 'Downloads track', valueDescription: 'track-id' },
        { name: 'album', shortName: 'm', type: 'int', description: 'Downloads album', valueDescription: 'album-id' },
        { name: 'artist', shortName: 'a', type: 'int', description: 'Downloads artist discography', valueDescription: 'artist-id' },
        { name: 'playlist', shortName: 'p', description: 'Downloads playlist items', valueDescription: 'playlist-uuid' },
        { name: 'search', shortName: 's', description: 'Downloads top search result', valueDescription: 'query' },
        // { name: 'search-track', shortName: 'st' },
        // { name: 'search-album', shortName: 'sm' },
        // { name: 'search-artist', shortName: 'sa' },
        // { name: 'search-playlist', shortName: 'sp' },
        { name: 'quality', shortName: 'q', description: 'Sets download quality', valueDescription: 'low|high|max' },
        { name: 'directory', shortName: 'd', description: 'Sets directory path (supports formatting)', valueDescription: 'directory' },
        { name: 'filename', shortName: 'f', description: 'Sets filename (supports formatting)', valueDescription: 'filename' },
        { name: 'lyrics', shortName: 'l', type: 'bool', description: 'Enables or disables lyrics embedding', valueDescription: 'yes|no' },
    ],
    tidalAlbumCoverSizes: {
        '640': '640x640',
        '1280': '1280x1280',
        'original': 'origin'
    },
    tidalArtistPictureSizes: {
        'original': 'origin'
    },
    tidalPlaylistImageSizes: {
        'original': 'origin'
    }
}