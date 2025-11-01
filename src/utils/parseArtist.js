const stripMarkup = require('./stripMarkup');

const { config, tidalArtistPictureSizes } = require('../globals');

function parseArtist(artist, additional = { }) {
    const parseAlbum = require('./parseAlbum');

    return {
        id: artist.id,
        name: artist.name,
        biography: additional?.biography?.text ? {
            originalText: additional.biography.text,
            text: stripMarkup(additional.biography.text),
            source: additional.biography.source
        } : null,
        pictures: artist.picture && Object.fromEntries(Object.entries(tidalArtistPictureSizes).map(([name, size]) => [name, `${config.resourcesBaseUrl}/images/${artist.picture.replace(/-/g, '/')}/${size}.jpg`])) || undefined,
        // picture: artist.picture && `${config.resourcesBaseUrl}/images/${artist.picture.replace(/-/g, '/')}/origin.jpg` || undefined,
        types: artist.artistTypes,
        roles: artist.artistRoles?.map(role => ({
            id: role.categoryId,
            name: role.category
        })),
        albums: additional?.albums?.map(album => parseAlbum(album))
    };
}

module.exports = parseArtist;