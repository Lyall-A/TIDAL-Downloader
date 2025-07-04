function requestDeviceAuthorization(clientId, scope) {
    return fetch(`https://auth.tidal.com/v1/oauth2/device_authorization`, {
        method: "POST",
        body: new URLSearchParams({
            method: "POST",
            client_id: clientId,
            scope: scope.join(" ")
        })
    }).then(async res => {
        let json;
        try { json = await res.json() } catch (err) { };

        if (res.status === 200) return json; throw json;
    });
}

module.exports = requestDeviceAuthorization;