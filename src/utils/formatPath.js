const path = require('path');

const formatString = require('./formatString');

function formatPath(unformattedPath, obj) {
    const { root } = path.parse(unformattedPath);
    return `${root}${unformattedPath.replace(root, '').split(path.sep).map(i => formatString(i, obj).replace(/\/|\\|\?|\*|\:|\||\"|\<|\>/g, '')).join(path.sep)}`;
};

module.exports = formatPath;