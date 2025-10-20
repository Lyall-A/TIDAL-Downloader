const spawn = require('./spawn');

const { config } = require('../globals');

function createAudio(inputPath, outputPath, coverPath, metadata) {
    return spawn(config.ffmpegPath, [
        '-i', inputPath,
        ...(coverPath ? [
            '-i', coverPath,
            '-map', '0:a',
            '-map', '1:v',
            '-metadata:s:v', 'comment=Cover (front)',
            '-disposition:v', 'attached_pic',
        ] : []),
        '-map_metadata', '-1',
        ...metadata.filter(i => i[1] !== undefined && i[1] !== null).map(([tag, value]) => ['-metadata', `${tag}=${value}`]).flat(),
        '-c:a', 'copy',
        outputPath,
        '-y'
    ]).then(spawnedProcess => {
        if (spawnedProcess.code > 0) throw new Error(`Exited with code ${spawnedProcess.code}! Output:\n${spawnedProcess.stderr.toString()}`);
    });
}

module.exports = createAudio;