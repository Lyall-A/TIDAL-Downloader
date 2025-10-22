# Tidalwave
A TIDAL downloader for tracks, albums, artist discographies and playlists

## Arguments
* `--track <id>`, `-t`: Download single track
* `--album <id>`, `-m`: Download single album
* `--video <id>`, `-v`: Download single video
* `--artist <id>`, `-a`: Download artist's discography
* `--playlist <uuid>`, `-p`: Download playlist
* `--search <query>`, `-s`: Download first search result
* `--url <url>`, `-u`: Download from URL
* `--track-quality <low|high|max>`, `-tq`: Set download quality, defaults to `trackQuality` in config
* `--video-quality low|high|max|<height>`, `-vq`: Set download quality, defaults to `videoQuality` in config
* `--lyrics <yes|no>`, `-l`: Sets if lyrics should be embedded or not, defaults to `getLyrics` in config

## Usage
Coming eventually

## Screenshots
<img src="https://raw.githubusercontent.com/Lyall-A/tidalwave/main/assets/screenshot-1.png">

## Configuration
`coverSize` can be set to `original` for very high quality cover art, however this breaks FFmpeg embedding if it's over 16MB

`metadataEmbedder` can be set to `ffmpeg` or `kid3` to change how metadata is embedded, `kid3` must be downloaded for it to work

`allowUserUploads` can be set to allow/block user uploaded tracks

`artistSeperator` can be set to null to use only main artist

`coverFilename` can be set to null to delete jpg after embedding

`segmentWaitMin` and `segmentWaitMax` adds a delay between downloading segments, can maybe reduce ban or rate limit risk (if there is one)

Check out `config.json` for more

## Dependencies
* [Node.js](https://nodejs.org) - JavaScript runtime
* [FFmpeg](https://www.ffmpeg.org/) - Used to extract FLAC/M4A from MP4 container and embed metadata
* [Kid3-cli](https://kid3.kde.org) - Alternative option for embedding metadata

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