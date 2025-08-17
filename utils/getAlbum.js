const tidalApi = require("./tidalApi");
const parseAlbum = require("./parseAlbum");

function getAlbum(albumId) {
    return tidalApi("privatev1", "/pages/album", {
        query: {
            albumId
        }
    }).then(({ json }) => {
        const { album, description, credits, review } = json.rows[0].modules[0];
        const tracks = json.rows[1].modules[0].pagedList.items.filter(({ type }) => type === "track").map(({ item }) => item); // Default limit seems to be 9999
        return parseAlbum(album, {
            description,
            credits,
            review,
            tracks
        })
    });
}

module.exports = getAlbum;