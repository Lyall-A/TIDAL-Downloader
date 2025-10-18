const fs = require('fs');

const config = fs.existsSync('./config.json') ? JSON.parse(fs.readFileSync('./config.json')) : require('./default.config.json');
const secrets = fs.existsSync(config.secretsPath) ? JSON.parse(fs.readFileSync(config.secretsPath)) : { };

module.exports = {
    config,
    secrets
}