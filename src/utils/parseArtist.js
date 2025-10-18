const { config } = require("../globals");

function parseArtist(artist, additional = { }) {
    const parseAlbum = require("./parseAlbum");

    return {
        id: artist.id,
        name: artist.name,
        picture: artist.picture && `${config.resourcesBaseUrl}/images/${artist.picture.replace(/-/g, "/")}/origin.jpg` || undefined,
        types: artist.artistTypes,
        roles: artist.artistRoles?.map(role => ({
            id: role.categoryId,
            name: role.category
        })),
        albums: additional?.albums?.map(album => parseAlbum(album))
    };
}

module.exports = parseArtist;