const spawn = require('./spawn');

const { config } = require('../globals');

function embedMetadata(file, tags) {
    return spawn(config.kid3CliPath, [
        ...tags.filter(i => i[1] !== undefined && i[1] !== null).map(([tag, value, isFile]) => {
            if (isFile) {
                return ['-c', `set "${escapeQuotes(tag)}":"${escapeQuotes(value)}" ""`];
            } else {
                return ['-c', `set "${escapeQuotes(tag)}" "${escapeQuotes(value)}"`];
            }
        }).flat(),
        file
    ]);
};

function escapeQuotes(input) {
    return input.toString().replace(/"/g, i => `\\${i}`);
}

module.exports = embedMetadata;