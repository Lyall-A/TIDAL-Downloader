const child_process = require("child_process");

const config = require("../config.json");

function extractAudioStream(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const ffmpegProcess = child_process.spawn(config.ffmpegPath, [
            "-i", inputPath,
            "-vn",
            "-c:a", "copy",
            outputPath,
            "-y"
        ]);

        let output = "";
        ffmpegProcess.stderr.on("data", data => output += data);

        ffmpegProcess.on("exit", code => {
            if (code) return reject(output);
            return resolve();
        });
    });
}

module.exports = extractAudioStream;