# TIDAL Downloader


## Arguments
### --track \<id>
* Download a single track
### --album \<id>
* Download all tracks from an album
### --artist \<id>
* Download all tracks from an artist
### --playlist \<id>
* Download all tracks from a playlist
### --search \<query>
* Download a album/artist/playlist from a search result
### --quality <low|high|max>
* Set download quality, uses value from `config.json` if not provided
### --directory <path>
* Set download directory, supports formatting, uses value from `config.json` if not provided
### --filename <filename>
* Set download filename, supports formatting, uses value from `config.json` if not provided
### --lyrics yes
* Embed lyrics to metadata, uses value from `config.json` if not provided

<small>please do not sue me</small>

## Dependencies
* [Node.js](https://nodejs.org)
* [Kid3-cli](https://kid3.kde.org) - Optional. for embedding metadata

## How TIDAL authenticates a browser
* Browser sends request to `https://login.tidal.com/api/email/user/existing` containing a client ID, code challenge, redirect URI, scope, login credentials and more
* Browser sends request to `https://login.tidal.com/success` which redirects to `https://tidal.com/login/auth`, containing the code
* Browser requests token using the `authorization_code` grant type

## How TIDAL authenticates a Android TV
* App sends request to `https://auth.tidal.com/v1/oauth2/device_authorization` containing client ID and scope. Response contains a device code, user code, how long the user code is valid for and a interval for requesting the token
* App periodically requests a token using the `urn:ietf:params:oauth:grant-type:device_code` grant type to verify sign in, request contains client ID, client secret, the device code from earlier and more