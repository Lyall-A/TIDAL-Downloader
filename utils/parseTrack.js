function parseTrack(track) {
    const parseArtist = require("./parseArtist");
    const parseAlbum = require("./parseAlbum");

    return {
        id: track.id,
        title: track.title,
        duration: track.duration,
        upload: track.upload,
        copyright: track.copyright,
        explicit: track.explicit,
        quality: track.audioQuality,
        modes: track.audioModes,
        qualityTypes: track.mediaMetadata?.tags,
        trackNumber: track.trackNumber,
        volumeNumber: track.volumeNumber,
        replayGain: track.replayGain,
        peak: track.peak,
        bpm: track.bpm,
        artists: track.artists?.map(parseArtist),
        album: track.album && parseAlbum(track.album) || undefined
    };
}

module.exports = parseTrack;