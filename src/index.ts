import ytdl from 'ytdl-core';
import * as Logger from "./logger";
import path from 'path';
import fse from "fs-extra";
import { setTimeout } from 'timers/promises';
import ytsr from '@distube/ytsr';
import express from 'express';

process.on('uncaughtException', async (err): Promise<void> => { Logger.error(err); });

const app = express();

app.get("/", async function (req, res) {
    res.send("hello");
});

app.get("/video/:value", async (req, res): Promise<void> => {
    try {
        ytsr(decodeURI(req.params.value), { safeSearch: false, limit: 1 }).then(async (result): Promise<void> => {
            let song = result.items[0];
            await ytdlvideo({ songurl: song.url, songid: song.id, songname: song.name, req, res });
            await Logger.log(`"GET /video/${decodeURI(req.params.value)} HTTP/${req.httpVersion}" SongName：${song.name}`);
        });
    } catch(error:any) {
        res.send("検索結果がありません")
    }
});

app.get("/music/:value", async (req, res): Promise<void> => {
    try {
        ytsr(decodeURI(req.params.value), { safeSearch: false, limit: 1 }).then(async (result): Promise<void> => {
            let song = result.items[0];
            await ytdlmusic({ songurl: song.url, songid: song.id, songname: song.name, req, res });
            await Logger.log(`"GET /music/${decodeURI(req.params.value)} HTTP/${req.httpVersion}" SongName：${song.name}`);
        });
    } catch(error:any) {
        res.send("検索結果がありません")
    }
});

async function ytdlvideo({ songurl, songid, songname, req, res }: { songurl; songid; songname; req; res; }): Promise<void> {
    try {
        await fse.stat(path.join(__dirname, `../tmp/${songid}.mp4`))
        await sendvideo({ songurl, songid, songname, req, res })
    } catch(error:any) {
        if (error.code === 'ENOENT') {
            ytdl(songurl)
                .pipe(fse.createWriteStream(path.join(__dirname, `../tmp/${songid}.mp4`)))
                .on("close", async function (): Promise<void> {
                    await sendvideo({ songurl, songid, songname, req, res });
                });
        };
    };
};
async function ytdlmusic({ songurl, songid, songname, req, res }: { songurl; songid; songname; req; res; }): Promise<void> {
    try {
        await fse.stat(path.join(__dirname, `../tmp/${songid}.mp3`))
        await sendmusic({ songurl, songid, songname, req, res })
    } catch(error:any) {
        if (error.code === 'ENOENT') {
            ytdl(songurl, {filter: 'audioonly'})
                .pipe(fse.createWriteStream(path.join(__dirname, `../tmp/${songid}.mp3`)))
                .on("close", async function (): Promise<void> {
                    await sendmusic({ songurl, songid, songname, req, res });
                });
        };
    };
};

async function sendvideo({ songurl, songid, songname, req, res }: { songurl; songid; songname; req; res; }): Promise<void> {
    await res.sendFile(path.join(__dirname, `../tmp/${songid}.mp4`));
    await setTimeout(1800000);
    await fse.remove(path.join(__dirname, `../tmp/${songid}.mp4`));
};

async function sendmusic({ songurl, songid, songname, req, res }: { songurl; songid; songname; req; res; }): Promise<void> {
    await res.sendFile(path.join(__dirname, `../tmp/${songid}.mp3`));
    await setTimeout(1800000);
    await fse.remove(path.join(__dirname, `../tmp/${songid}.mp3`));
};

const port = process.env.PORT || 8080;
app.listen(port, async () => {
    await fse.emptyDir(path.join(__dirname, `../tmp`));
    await Logger.log(`done => http://localhost:${port}/`);
});
