const fs = require('fs');

if (!fs.existsSync('./config.json')) fs.writeFileSync('./config.json', JSON.stringify(require('./default.config.json'), null, 4));

const config = JSON.parse(fs.readFileSync('./config.json'));
const secrets = fs.existsSync(config.secretsPath) ? JSON.parse(fs.readFileSync(config.secretsPath)) : { };

module.exports = {
    config,
    secrets
}