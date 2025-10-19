const child_process = require("child_process");

const { config } = require("../globals");

function createAudio(inputPath, outputPath, coverPath, metadata) {
    return new Promise((resolve, reject) => {
        const ffmpegProcess = child_process.spawn(config.ffmpegPath, [
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
        ]);

        let output = "";
        ffmpegProcess.stderr.on("data", data => output += data);

        ffmpegProcess.on("error", (err) => {
            return reject(err);
        });

        ffmpegProcess.on("exit", code => {
            if (code) return reject(output);
            return resolve();
        });
    });
}

module.exports = createAudio;