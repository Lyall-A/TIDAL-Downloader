function stripMarkup(str) {
    return str
        .replace(/\[wimpLink.*?\](.*?)\[\/wimpLink\]/g, (match, content) => content)
        .replace(/<br\/?>/g, '\n');
}

module.exports = stripMarkup;