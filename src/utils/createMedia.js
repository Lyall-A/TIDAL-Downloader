const spawn = require('./spawn');

const { config } = require('../globals');

function createMedia(inputPath, outputPath, coverPath, metadata, streams = 1) {
    return spawn(config.ffmpegPath, [
        '-i', inputPath,
        ...(coverPath ? [
            '-i', coverPath,
            ...(Array.from({ length: streams }, (value, i) => ['-map', `0:${i}`])).flat(),
            '-map', '1',
            `-metadata:s:${streams}`, 'comment=Cover (front)',
            `-disposition:${streams}`, 'attached_pic',
        ] : []),
        '-map_metadata', '-1',
        ...metadata.filter(i => i[1] !== undefined && i[1] !== null).map(([tag, value]) => ['-metadata', `${tag}=${value}`]).flat(),
        '-c', 'copy',
        outputPath,
        '-y'
    ]).then(spawnedProcess => {
        if (spawnedProcess.code > 0) throw new Error(`Exited with code ${spawnedProcess.code}! Output:\n${spawnedProcess.stderr.toString()}`);
    });
}

module.exports = createMedia;