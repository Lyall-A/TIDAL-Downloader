const child_process = require('child_process');
const path = require('path');

const { execDir } = require('../globals');

function spawn(command, args) {
    return new Promise((resolve, reject) => {
        const spawnedProcess = child_process.spawn(command, args, {
            env: {
                ...process.env,
                PATH: `${process.env.PATH}${process.platform === 'win32' ? ';' : ':'}${path.join(execDir, 'bin')}`
            }
        });

        const stdoutChunks = [];
        const stderrChunks = [];

        spawnedProcess.stdout.on('data', chunk => stdoutChunks.push(chunk));
        spawnedProcess.stderr.on('data', chunk => stderrChunks.push(chunk));
        spawnedProcess.on('error', err => reject(err));
        spawnedProcess.on('exit', code => resolve({
            code,
            stdout: Buffer.concat(stdoutChunks),
            stderr: Buffer.concat(stderrChunks),
        }));
    });
}

module.exports = spawn;