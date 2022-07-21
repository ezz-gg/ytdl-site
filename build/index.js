"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const Logger = __importStar(require("./logger"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const promises_1 = require("timers/promises");
const ytsr_1 = __importDefault(require("@distube/ytsr"));
const express_1 = __importDefault(require("express"));
process.on('uncaughtException', async (err) => { Logger.error(err); });
const app = (0, express_1.default)();
app.get("/", async function (req, res) {
    res.send("hello");
});
app.get("/video/:value", async (req, res) => {
    try {
        (0, ytsr_1.default)(decodeURI(req.params.value), { safeSearch: false, limit: 1 }).then(async (result) => {
            let song = result.items[0];
            await ytdlvideo({ songurl: song.url, songid: song.id, songname: song.name, req, res });
            await Logger.log(`"GET /video/${decodeURI(req.params.value)} HTTP/${req.httpVersion}" SongName：${song.name}`);
        });
    }
    catch (error) {
        res.send("検索結果がありません");
    }
});
app.get("/music/:value", async (req, res) => {
    try {
        (0, ytsr_1.default)(decodeURI(req.params.value), { safeSearch: false, limit: 1 }).then(async (result) => {
            let song = result.items[0];
            await ytdlmusic({ songurl: song.url, songid: song.id, songname: song.name, req, res });
            await Logger.log(`"GET /music/${decodeURI(req.params.value)} HTTP/${req.httpVersion}" SongName：${song.name}`);
        });
    }
    catch (error) {
        res.send("検索結果がありません");
    }
});
async function ytdlvideo({ songurl, songid, songname, req, res }) {
    try {
        await fs_extra_1.default.stat(path_1.default.join(__dirname, `../tmp/${songid}.mp4`));
        await sendvideo({ songurl, songid, songname, req, res });
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            (0, ytdl_core_1.default)(songurl)
                .pipe(fs_extra_1.default.createWriteStream(path_1.default.join(__dirname, `../tmp/${songid}.mp4`)))
                .on("close", async function () {
                await sendvideo({ songurl, songid, songname, req, res });
            });
        }
        ;
    }
    ;
}
;
async function ytdlmusic({ songurl, songid, songname, req, res }) {
    try {
        await fs_extra_1.default.stat(path_1.default.join(__dirname, `../tmp/${songid}.mp3`));
        await sendmusic({ songurl, songid, songname, req, res });
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            (0, ytdl_core_1.default)(songurl, { filter: 'audioonly' })
                .pipe(fs_extra_1.default.createWriteStream(path_1.default.join(__dirname, `../tmp/${songid}.mp3`)))
                .on("close", async function () {
                await sendmusic({ songurl, songid, songname, req, res });
            });
        }
        ;
    }
    ;
}
;
async function sendvideo({ songurl, songid, songname, req, res }) {
    await res.sendFile(path_1.default.join(__dirname, `../tmp/${songid}.mp4`));
    await (0, promises_1.setTimeout)(1800000);
    await fs_extra_1.default.remove(path_1.default.join(__dirname, `../tmp/${songid}.mp4`));
}
;
async function sendmusic({ songurl, songid, songname, req, res }) {
    await res.sendFile(path_1.default.join(__dirname, `../tmp/${songid}.mp3`));
    await (0, promises_1.setTimeout)(1800000);
    await fs_extra_1.default.remove(path_1.default.join(__dirname, `../tmp/${songid}.mp3`));
}
;
const port = process.env.PORT || 8080;
app.listen(port, async () => {
    await fs_extra_1.default.emptyDir(path_1.default.join(__dirname, `../tmp`));
    await Logger.log(`done => http://localhost:${port}/`);
});
