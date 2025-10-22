const spawn = require('./spawn');

const { config } = require('../globals');

function extractAudioStream(inputPath, outputPath) {
    return spawn(config.ffmpegPath, [
        '-i', inputPath,
        '-map_metadata', '-1',
        '-c', 'copy',
        outputPath,
        '-y'
    ]).then(spawnedProcess => {
        if (spawnedProcess.code > 0) throw new Error(`Exited with code ${spawnedProcess.code}! Output:\n${spawnedProcess.stderr.toString()}`);
    });
}

module.exports = extractAudioStream;