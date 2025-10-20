function parseTrack(video) {
    const parseArtist = require('./parseArtist');
    const parseAlbum = require('./parseAlbum');

    return {
        id: video.id,
        title: video.title,
        duration: video.duration,
        // upload: video.upload,
        // copyright: video.copyright,
        explicit: video.explicit,
        quality: video.audioQuality,
        // modes: video.audioModes,
        // qualityTypes: video.mediaMetadata?.tags,
        trackNumber: video.trackNumber,
        volumeNumber: video.volumeNumber,
        // replayGain: video.replayGain,
        // peak: video.peak,
        // bpm: video.bpm,
        // url: video.url,
        artists: video.artists?.map(parseArtist),
        album: video.album && parseAlbum(video.album) || undefined
    };
}

module.exports = parseTrack;