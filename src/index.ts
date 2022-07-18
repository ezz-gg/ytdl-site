import ytsr from '@distube/ytsr'
import express from 'express'
import ytdl, { validateURL } from 'ytdl-core';
import * as path from "path";
import * as fs from 'fs';
import { setTimeout } from 'timers/promises';
const app = express()

app.get("/video/:value", function(req, res){
    ytsr(decodeURI(req.params.value), { safeSearch: false, limit: 1 }).then((result): void => {
        let song = result.items[0];
        ytdlol(song.url, song.id, song.name, req, res)
        sendfile(song.id, song.name, req, res)
    })
}).listen(8000)

async function ytdlol(songurl: string, songid: string, songname: string, req, res) {
    try {
        fs.statSync(path.join(__dirname, `../tmp/${songid}.mp4`));
        return;
    } catch (error) {
        if (error.code === 'ENOENT') {
            ytdl(songurl, {
                filter: (format) => format.container === 'mp4'
            })
            .pipe(fs.createWriteStream(path.join(__dirname, `../tmp/${songid}.mp4`)))
            return;
        };
    };
};

async function sendfile(songid: string, songname: string, req, res): Promise<void> {
    await setTimeout(1500);
    await res.sendFile(path.join(__dirname, `../tmp/${songid}.mp4`));
};