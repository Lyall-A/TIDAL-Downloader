const { config, tidalPlaylistImageSizes } = require ('../globals');

const parseTrack = require('./parseTrack');

function parsePlaylist(playlist, additional = { }) {
    return {
        uuid: playlist.uuid,
        title: playlist.title,
        description: playlist.description,
        duration: playlist.duration,
        images: playlist.squareImage && Object.fromEntries(Object.entries(tidalPlaylistImageSizes).map(([name, size]) => [name, `${config.resourcesBaseUrl}/images/${playlist.squareImage.replace(/-/g, '/')}/${size}.jpg`])) || undefined,
        // image: playlist.squareImage && `${config.resourcesBaseUrl}/images/${playlist.squareImage.replace(/-/g, '/')}/origin.jpg` || undefined,
        customImage: playlist.customImageUrl,
        trackCount: playlist.numberOfTracks,
        sharing: playlist.sharingLevel,
        created: new Date(playlist.created),
        lastUpdated: new Date(playlist.lastUpdated),
        tracks: additional?.items?.filter(({ type }) => type === 'track').map(({ item }) => parseTrack(item))
    };
}

module.exports = parsePlaylist;