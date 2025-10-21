const { config, tidalVideoCoverSizes } = require('../globals');

// TODO: confirm album is always null
function parseVideo(video) {
    const parseArtist = require('./parseArtist');

    return {
        id: video.id,
        title: video.title,
        type: video.type,
        duration: video.duration,
        releaseDate: new Date(video.releaseDate),
        explicit: video.explicit,
        quality: video.quality,
        images: video.imageId && Object.fromEntries(Object.entries(tidalVideoCoverSizes).map(([name, size]) => [name, `${config.resourcesBaseUrl}/images/${video.imageId.replace(/-/g, '/')}/${size}.jpg`])) || undefined,
        trackNumber: video.trackNumber,
        volumeNumber: video.volumeNumber,
        artists: video.artists?.map(parseArtist),
    };
}

module.exports = parseVideo;