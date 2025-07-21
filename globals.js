const fs = require("fs");

const config = require("./config.json");

const secrets = fs.existsSync(config.secretsPath) ? JSON.parse(fs.readFileSync(config.secretsPath)) : { };

module.exports = {
    config,
    secrets
}