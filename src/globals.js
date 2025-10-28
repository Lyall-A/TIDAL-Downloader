const fs = require('fs');
const path = require('path');

const parseConfig = require('./utils/parseConfig');
const Logger = require('./utils/Logger');

// bun moment
const execDir = path.dirname(__filename);
const execFile = __filename;

// Read config
const configPath = path.resolve(execDir, 'config.json');
if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify(require('./default.config.json'), null, 4));
const config = parseConfig(configPath);

// Read secrets
const secretsPath = config.secretsPath ? path.resolve(execDir, config.secretsPath) : undefined;
const secrets = fs.existsSync(secretsPath) ? JSON.parse(fs.readFileSync(secretsPath)) : { };

const logger = new Logger({
    debugLogs: config.debug
});

module.exports = {
    config,
    secrets,
    configPath,
    secretsPath,
    execDir,
    execFile,
    logger,
    argOptions: [
        { name: 'help', shortName: 'h', noValue: true, description: 'Displays this menu' },
        { name: 'track', shortName: 't', type: 'int', description: 'Downloads track', valueDescription: 'track-id' },
        { name: 'album', shortName: 'm', type: 'int', description: 'Downloads album', valueDescription: 'album-id' },
        { name: 'artist', shortName: 'a', type: 'int', description: 'Downloads artist discography', valueDescription: 'artist-id' },
        { name: 'video', shortName: 'v', description: 'Downloads videos', valueDescription: 'video-id' },
        { name: 'playlist', shortName: 'p', description: 'Downloads playlist items', valueDescription: 'playlist-uuid' },
        { name: 'search', shortName: 's', description: 'Downloads top search result', valueDescription: 'query' },
        { name: 'url', shortName: 'u', description: 'Download from URL', valueDescription: 'url' },
        { name: 'track-quality', shortName: 'tq', aliases: ['quality'], shortAliases: ['q'], description: 'Sets track download quality', valueDescription: 'low|high|max' },
        { name: 'video-quality', shortName: 'vq', description: 'Sets video download quality', valueDescription: 'low|high|max|<height>' },
        { name: 'lyrics', shortName: 'l', type: 'bool', description: 'Enables or disables lyrics embedding', valueDescription: 'yes|no' },
        { name: 'cover', shortName: 'c', type: 'bool', description: 'Enables or disables cover embedding', valueDescription: 'yes|no' },
    ],
    tidalVideoCoverSizes: {
        '640': '640x640',
        '1280': '1280x1280',
        '1280x720': '1280x720',
        '640x360': '640x360',
        'original': 'origin'
    },
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