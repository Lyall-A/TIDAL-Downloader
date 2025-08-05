const child_process = require("child_process");

const config = require("../config.json");

function embedMetadata(file, tags) {
    return new Promise((resolve, reject) => {
        const kid3CliProcess = child_process.spawn(config.kid3CliPath, [
            ...tags.filter(i => i[1] !== undefined && i[1] !== null).map(([tag, value, isFile]) => {
                if (isFile) {
                    return ["-c", `set "${escapeQuotes(tag)}":"${escapeQuotes(value)}" ""`];
                } else {
                    return ["-c", `set "${escapeQuotes(tag)}" "${escapeQuotes(value)}"`];
                }
            }).flat(),
            file
        ]);

        let output = "";
        kid3CliProcess.stdout.on("data", data => output += data);

        kid3CliProcess.on("error", (err) => {
            return reject(err);
        });

        kid3CliProcess.on("exit", () => {
            return resolve();
        });
    });
};

function escapeQuotes(input) {
    return input.toString().replace(/"/g, i => `\\${i}`);
}

module.exports = embedMetadata;