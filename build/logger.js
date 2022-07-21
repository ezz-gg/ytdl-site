"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = exports.log = void 0;
async function log(message) {
    process.stdout.write(`[${new Date().toLocaleString()}] [LOG]\t${message}\n`);
}
exports.log = log;
async function error(message) {
    process.stderr.write(`\x1b[31m[${new Date().toLocaleString()}] [ERROR]\t${message instanceof Error ? `${message.name}\n\t${message.message}\n\t${message.stack}` : message}\x1b[0m\n`);
}
exports.error = error;
