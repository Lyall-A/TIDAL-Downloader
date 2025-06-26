function parseArgs(argv = process.argv, argOptions) {
    // TODO: finish, rushed just to get working atm
    const args = {
        tracks: [],
        artists: [],
        albums: [],
        playlists: [],
        search: [],
    };

    argv.forEach((arg, argIndex) => {
        const shortArg = arg.match(/^(?<!-)-([^-\s]+)$/)?.[1];
        const longArg = arg.match(/^--([^-\s]+)$/)?.[1];
        const argName = shortArg || longArg;

        if (!argName) return;
       
        const value = argv[argIndex + 1];

        if (!value) return;

        if (args[argName] || args[`${argName}s`]) {
            args[args[argName] ? argName : `${argName}s`].push(value);
        } else {
            args[argName] = value;
        }
    });

    return args;
}

module.exports = parseArgs;