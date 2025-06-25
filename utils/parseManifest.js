function parseManifest(manifest, manifestType) {
    const parsedManifest = {
        contentType: null,
        mimeType: null,
        segmentAlignment: null,
        codecs: null,
        bandwith: null,
        audioSamplingRate: null,
        timescale: null,
        initialization: null,
        media: null,
        startNumber: null,

        segments: []
    };

    if (manifestType === "application/dash+xml") {
        // TODO: a little less jank perhaps
        parsedManifest.codecs = manifest.match(/(?:<|\s)codecs="(.*?)"/)?.[1];
        parsedManifest.audioSamplingRate = parseInt(manifest.match(/(?:<|\s)audioSamplingRate="(.*?)"/)?.[1]);
        parsedManifest.initialization = manifest.match(/(?:<|\s)initialization="(.*?)"/)?.[1];
        parsedManifest.media = manifest.match(/(?:<|\s)media="(.*?)"/)?.[1];
        parsedManifest.startNumber = parseInt(manifest.match(/(?:<|\s)startNumber="(.*?)"/)?.[1]);

        for (let segmentIndex = 0; segmentIndex < parseInt(manifest.match(/(?:<|\s)r="(.*?)"/)?.[1]) + 3; segmentIndex++) {
            parsedManifest.segments.push(parsedManifest.media.replace(/\$Number\$/, segmentIndex))
        }
    } else {
        throw new Error(`Unknown manifest MIME type "${manifestType}"`);
    }

    return parsedManifest;
}

module.exports = parseManifest;