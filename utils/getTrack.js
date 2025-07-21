const { config, secrets } = require("../globals");

function getTrack(trackId) {
    const parseTrack = require("./parseTrack");

    return fetch(`${config.privateApiV1BaseUrl}/tracks/${trackId}?countryCode=${secrets.countryCode}&deviceType=BROWSER`, {
        headers: {
            "Authorization": `${secrets.tokenType} ${secrets.accessToken}`
        }
    }).then(res => res.json()).then(parseTrack);
}

module.exports = getTrack;