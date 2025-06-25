function parseArgs(argv = process.argv, argOptions) {
    // TODO: finish, rushed just to get working atm
    const args = {
        tracks: [],
        artists: [],
        albums: [],
    };

    argv.forEach((arg, argIndex) => {
        const shortArg = arg.match(/^(?<!-)-([^-\s]+)$/)?.[1];
        const longArg = arg.match(/^--([^-\s]+)$/)?.[1];
        const argName = shortArg || longArg;

        if (!argName) return;
       
        const value = argv[argIndex + 1];

        if (!value) return;

        if (args[`${argName}s`]) {
            args[`${argName}s`].push(value);
        } else {
            args[argName] = value.toLowerCase();
        }
    });

    return args;
}

module.exports = parseArgs;