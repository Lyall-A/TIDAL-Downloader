const { config, tidalAlbumCoverSizes } = require('../globals');

function parseAlbum(album, additional = { }) {
    const parseTrack = require('./parseTrack');
    const parseArtist = require('./parseArtist');

    return {
        id: album.id,
        title: album.title,
        version: album.version,
        description: additional?.description,
        duration: album.duration,
        upload: album.upload,
        trackCount: album.numberOfTracks,
        volumeCount: album.numberOfVolumes,
        releaseDate: album.releaseDate,
        copyright: album.copyright,
        explicit: album.explicit,
        upc: album.upc,
        covers: album.cover && Object.fromEntries(Object.entries(tidalAlbumCoverSizes).map(([name, size]) => [name, `${config.resourcesBaseUrl}/images/${album.cover.replace(/-/g, '/')}/${size}.jpg`])) || undefined,
        videoCovers: album.videoCover && Object.fromEntries(Object.entries(tidalAlbumCoverSizes).map(([name, size]) => [name, `${config.resourcesBaseUrl}/videos/${album.cover.replace(/-/g, '/')}/${size}.mp4`])) || undefined,
        // cover: album.cover && `${config.resourcesBaseUrl}/images/${album.cover.replace(/-/g, '/')}/origin.jpg` || undefined,
        // videoCover: album.videoCover && `${config.resourcesBaseUrl}/videos/${album.videoCover.replace(/-/g, '/')}/origin.mp4` || undefined,
        quality: album.audioQuality,
        modes: album.audioModes,
        qualityTypes: album.mediaMetadata?.tags,
        credits: additional?.credits?.items,
        review: additional?.review,
        url: album.url,
        artists: album.artists?.map(parseArtist),
        tracks: additional?.tracks?.map(parseTrack),
    };
}

module.exports = parseAlbum;