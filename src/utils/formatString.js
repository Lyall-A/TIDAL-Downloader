function parseString(string, obj) {
    return string
        .replace(/{{(.*?)}}/g, (match, group) => group.split(".").reduce((acc, key) => acc && acc[key], obj) || "");
}

module.exports = parseString;