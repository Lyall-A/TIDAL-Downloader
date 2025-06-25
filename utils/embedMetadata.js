const child_process = require("child_process");

const config = require("../config.json");

function embedMetadata(file, metadata) {
    return new Promise((resolve, reject) => {
        const kid3CliProcess = child_process.spawn(config.kid3CliPath, [
            ...Object.entries(metadata).filter(i => i[1] !== undefined).map(([key, value]) => [
                "-c",
                `set "${key.toString().replace(/"/g, i => `\\${i}`)}" "${value.toString().replace(/"/g, i => `\\${i}`)}"`
            ]).flat(),
            file
        ]);

        let output = "";
        kid3CliProcess.stdout.on("data", data => output += data);

        kid3CliProcess.on("exit", code => {
            if (code) return reject(output);
            return resolve();
        });
    });
}

module.exports = embedMetadata;