function requestDeviceAuthorization(grantType, params = { }) {
    const headers = { };
    const body = new URLSearchParams();

    if (grantType === "client_credentials") {
        // client_credentials
        body.append("grant_type", "client_credentials");
        headers["Authorization"] = Buffer.from(`${params.clientId}:${params.clientSecret}`, "base64");
    } else if (grantType === "authorization_code") {
        // authorization_code
        body.append("grant_type", "authorization_code");
        body.append("client_id", params.clientId);
        body.append("code", params.code);
        body.append("redirect_uri", params.redirectUri);
        body.append("code_verifier", params.codeVerifier);
    } else if (grantType === "refresh_token") {
        // refresh_token
        body.append("grant_type", "refresh_token");
        body.append("refresh_token", params.refreshToken);

        // Specific to user tokens
        if (params.clientId) body.append("client_id", params.clientId);
        if (params.clientSecret) body.append("client_secret", params.clientSecret);
    } else if (grantType === "urn:ietf:params:oauth:grant-type:device_code") {
        // urn:ietf:params:oauth:grant-type:device_code
        body.append("client_id", params.clientId);
        body.append("client_secret", params.clientSecret);
        body.append("device_code", params.deviceCode);
        body.append("grant_type", "urn:ietf:params:oauth:grant-type:device_code");
        body.append("scope", params.scope.join(" "));
        body.append("client_unique_key", params.clientUniqueKey); // Not needed
    } else throw new Error(`Unknown grant type "${grantType}"`);

    return fetch(`https://auth.tidal.com/v1/oauth2/token`, {
        method: "POST",
        headers,
        body
    }).then(async res => {
        let json;
        try { json = await res.json() } catch (err) { };

        if (res.status === 200) return json; throw json;
    });
}

module.exports = requestDeviceAuthorization;