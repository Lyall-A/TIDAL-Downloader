const fs = require('fs');

const defaultConfig = require('../default.config.json');

function parseConfig(configPath) {
    const jsonConfig = JSON.parse(fs.readFileSync(configPath));
    const version = jsonConfig._version;

    const config = {
        ...defaultConfig,
        ...jsonConfig
    };

    // TODO: create replace function
    if (!version) {
        if (config.coverSize !== undefined) {
            config.trackCoverSize = config.coverSize;
            delete config.coverSize;
        }

        if (config.downloadDirectory !== undefined) {
            config.albumDirectory = config.downloadDirectory;
            delete config.downloadDirectory;
        }

        if (config.downloadFilename !== undefined) {
            config.trackFilename = config.downloadFilename;
            delete config.downloadFilename;
        }

        if (config.quality !== undefined) {
            config.trackQuality = config.quality;
            delete config.quality;
        }
        
        config._version = 1;
    }

    /*
    if (version === 1) {
        // stuff
        config._version = 2;
    }
    */

    if (config._version !== version) fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

    return config;
}

module.exports = parseConfig;