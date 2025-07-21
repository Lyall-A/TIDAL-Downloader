const { config } = require("../globals");

function parseAlbum(album, additional = { }) {
    const parseTrack = require("./parseTrack");
    const parseArtist = require("./parseArtist");

    return {
        id: album.id,
        title: album.title,
        description: additional?.description,
        duration: album.duration,
        trackCount: album.numberOfTracks,
        volumeCount: album.numberOfVolumes,
        releaseDate: album.releaseDate,
        copyright: album.copyright,
        explicit: album.explicit,
        cover: `${config.resourcesBaseUrl}/images/${album.cover.replace(/-/g, "/")}/origin.jpg`,
        quality: album.audioQuality,
        modes: album.audioModes,
        qualityTypes: album.mediaMetadata?.tags,
        credits: additional?.credits?.items,
        review: additional?.review,
        artists: album.artists?.map(parseArtist),
        tracks: additional?.tracks?.map(parseTrack),
    };
}

module.exports = parseAlbum;