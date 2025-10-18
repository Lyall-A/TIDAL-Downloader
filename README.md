# TIDAL Downloader

## Arguments
* `--track <id>`, `-t`: Download single track
* `--album <id>`, `-m`: Download single album
* `--artist <id>`, `-a`: Download artist's discography
* `--playlist <uuid>`, `-p`: Download playlist
* `--search <query>`, `-s`: Download first search result
* `--quality <low|high|max>`, `-q`: Set download quality, defaults to `quality` in config
* `--directory <path>`, `-d`: Set download directory, supports formatting, defaults to `downloadDirectory` in config
* `--filename <filename>`, `-f`: Set download filename, supports formatting, defaults to `downloadFilename` in config
* `--lyrics <yes|no>`, `-l`: Sets if lyrics should be embedded or not, defaults to `getLyrics` in config

## Configuration
`allowUserUploads` can be set to allow/block user uploaded tracks

`artistSeperator` can be set to null to use only main artist.

`coverFilename` can be set to null to delete jpg after embedding.

`segmentWaitMin` and `segmentWaitMax` adds a delay between downloading segments, can maybe reduce ban or rate limit risk (if there is one).

Check out `config.json` for more

## Dependencies
* [Node.js](https://nodejs.org)
* [Kid3-cli](https://kid3.kde.org) - Optional. Used to embed metadata

## Warning
I don't know the risks from doing this. It is possible you can get banned, I'm not sure

## How TIDAL authenticates a browser
* Browser sends request to `https://login.tidal.com/api/email/user/existing` containing a client ID, code challenge, redirect URI, scope, login credentials and more
* Browser sends request to `https://login.tidal.com/success` which redirects to `https://tidal.com/login/auth`, containing the code
* Browser requests token using the `authorization_code` grant type

## How TIDAL authenticates a Android TV (a "Limited Input Device")
* App sends request to `https://auth.tidal.com/v1/oauth2/device_authorization` containing client ID and scope. Response contains a device code, user code, how long the user code is valid for and a interval for requesting the token
* App periodically requests a token using the `urn:ietf:params:oauth:grant-type:device_code` grant type to verify sign in, request contains client ID, client secret, the device code from earlier and more

<small>please do not sue me</small>