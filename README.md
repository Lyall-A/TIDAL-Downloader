# Tidalwave
A TIDAL downloader for tracks, albums, videos, artist discographies and playlists

## Features
* **Lossless audio** - Downloads in lossless quality by default
* **Metadata** - Embeds all standard music metadata (title, artists, album, date, etc.)
* **Lyrics** - Embeds synced/plain lyrics
* **Cover art** - Downloads and embeds album cover art
* **Advanced metadata** - Embeds as much metadata as possible, including BPM, copyright, barcode, replaygain, explicit rating and more
* **Videos** - Can download videos from TIDAL (music videos, etc.)
* **Playlists** - Can download all tracks from a playlist
* **Discographies** - Can download an entire artist's discography
* **Searching** - Allows searching instead of having to provide URL's or ID's

## Arguments
* `--help`, `-h`: Displays help menu
* `--track <id>`, `-t`: Downloads track
* `--album <id>`, `-m`: Downloads album
* `--video <id>`, `-v`: Downloads videos
* `--artist <id>`, `-a`: Downloads artist discography
* `--playlist <uuid>`, `-p`: Downloads items from playlist
* `--search <query>`, `-s`: Downloads top search result
* `--search:track <query>`, `-s:t`: Downloads top search result for tracks
* `--search:album <query>`, `-s:m`: Downloads top search result for albums
* `--search:video <query>`, `-s:v`: Downloads top search result for videos
* `--search:artist <query>`, `-s:a`: Downloads top search result for artists
* `--search:playlist <query>`, `-s:p`: Downloads top search result for playlists
* `--url <url>`, `-u`: Download from URL
* `--track-quality <low|high|max>`, `-tq`: Sets track download quality, defaults to config `trackQuality`
* `--video-quality <low|high|max|<height>>`, `-vq`: Sets video download quality, defaults to config `videoQuality`
* `--lyrics <yes|no>`, `-l`: Enables or disables lyrics embedding, defaults to config `getLyrics`
* `--cover <yes|no>`, `-c`: Enables or disables cover embedding, defaults to config `getCover`

## Usage
Coming eventually

## Screenshots
<img src="https://raw.githubusercontent.com/Lyall-A/tidalwave/main/assets/screenshot-1.png">

## Configuration
`useArtistsTag` can be set to `true` or `false` to enable/disable `artists` and `albumartists` tag

`trackCoverSize` can be set to `original` for very high quality cover art, however this breaks FFmpeg embedding if it's over 16MB

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
There may be a risk of getting banned for using a tool like this, however i've yet to see that happen

## How TIDAL authenticates a browser
* Browser sends request to `https://login.tidal.com/api/email/user/existing` containing a client ID, code challenge, redirect URI, scope, login credentials and more
* Browser sends request to `https://login.tidal.com/success` which redirects to `https://tidal.com/login/auth`, containing the code
* Browser requests token using the `authorization_code` grant type

## How TIDAL authenticates a Android TV (a "Limited Input Device")
* App sends request to `https://auth.tidal.com/v1/oauth2/device_authorization` containing client ID and scope. Response contains a device code, user code, how long the user code is valid for and a interval for requesting the token
* App periodically requests a token using the `urn:ietf:params:oauth:grant-type:device_code` grant type to verify sign in, request contains client ID, client secret, the device code from earlier and more

<small>please do not sue me</small>