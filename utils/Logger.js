class Logger {
    lastLog = '';

    constructor(options = { }) {
        this.debugLogs = options.debugLogs ?? false;
        this.levelPadding = options.levelPadding ?? null;
        this.levels = options.levels ?? [
            { name: 'INFO', id: 'info', fgColor: 34 },
            { name: 'WARN', id: 'warn', fgColor: 93 },
            { name: 'ERROR', id: 'error', fgColor: 31 },
            { name: 'DEBUG', id: 'debug', fgColor: 90 },
        ];

        for (const level of this.levels) {
            if (!this.constructor.prototype[level.id]) {
                this.constructor.prototype[level.id] = (msg, replaceLine) => this.log(level.id, msg, replaceLine);
            }
        }
    }

    log(levelId, msg, replaceLine) {
        const level = this.levels.find(i => i.id === levelId);
        if (!this.debugLogs && level.id === 'debug') return;

        if (replaceLine && !this.debugLogs) {
            const lastLogLines = this.lastLog.split('\n');
            const [windowWidth, windowHeight] = process.stdout.getWindowSize();
            const lastLogLineCount = lastLogLines.length + lastLogLines.reduce((sum, line) => sum + Math.floor((line.replace(/\x1b\[[0-9;]*m/g, '').length - 1) / windowWidth), 0); // calculate line count, including \n's and text wrapping
            
            for (let lineIndex = 0; lineIndex < lastLogLineCount; lineIndex++) {
                process.stdout.moveCursor(0, -1);
                process.stdout.clearLine();
            }
        }

        const prefix = level.prefix ?? level ? `[${this.applyColor(level.fgColor, level.bgColor, level.name)}]${this.levelPadding ? ' '.repeat(this.levelPadding - level.name.length) : ''} ` : '';
        const suffix = level.suffix ?? '';
        this.lastLog = `${prefix}${msg}${suffix}\n`;
        process.stdout.write(this.lastLog);
    }

    applyColor(fgColor, bgColor, string) {
        return `${fgColor ? `\x1b[${fgColor}m` : ''}${bgColor ? `\x1b[${bgColor}m` : ''}${string ? `${string}\x1b[0m` : ''}`;
    }
}

module.exports = Logger;