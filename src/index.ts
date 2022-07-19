import ytsr from '@distube/ytsr'
import express from 'express'
import ytdl from 'ytdl-core';
import * as path from "path";
import * as fs from 'fs-extra';
import { setTimeout } from 'timers/promises';

process.on('uncaughtException', function(err) {console.error(err)});

const app = express();

app.get("/", async function(req, res) {
    res.send("hello")
})
app.get("/music/:value", async function(req, res){
    ytsr(decodeURI(req.params.value), { safeSearch: false, limit: 1 }).then((result): void => {
        let song = result.items[0];
        ytdlmusic(song.url, song.id, song.name, req, res)
        sendmusic(song.id, song.name, req, res)
    })
})

app.get("/video/:value", async function(req, res){
    ytsr(decodeURI(req.params.value), { safeSearch: false, limit: 1 }).then((result): void => {
        let song = result.items[0];
        ytdlvideo(song.url, song.id, song.name, req, res)
        sendvideo(song.id, song.name, req, res)
    })
})

export async function ytdlvideo(songurl: string, songid: string, songname: string, req, res) {
    try {
        fs.statSync(path.join(__dirname, `./tmp/${songid}.mp4`));
        return;
    } catch (error) {
        if (error.code === 'ENOENT') {
            ytdl(songurl, {
                filter: (format) => format.container === 'mp4'
            })
            .pipe(fs.createWriteStream(path.join(__dirname, `./tmp/${songid}.mp4`)))
            return;
        };
    };
};

export async function ytdlmusic(songurl: string, songid: string, songname: string, req, res) {
    try {
        fs.statSync(path.join(__dirname, `./tmp/${songid}.mp3`));
        return;
    } catch (error) {
        if (error.code === 'ENOENT') {
            ytdl(songurl, {
                filter: 'audioonly'
            })
            .pipe(fs.createWriteStream(path.join(__dirname, `./tmp/${songid}.mp3`)))
            return;
        };
    };
};

export async function sendvideo(songid: string, songname: string, req, res): Promise<void> {
    await setTimeout(1500);
    await res.sendFile(path.join(__dirname, `./tmp/${songid}.mp4`));
    await setTimeout(1800000);
    await fs.remove(path.join(__dirname, `./tmp/${songid}.mp4`))
};

export async function sendmusic(songid: string, songname: string, req, res): Promise<void> {
    await setTimeout(1500);
    await res.sendFile(path.join(__dirname, `./tmp/${songid}.mp3`));
    await setTimeout(1800000);
    await fs.remove(path.join(__dirname, `./tmp/${songid}.mp3`))
};

const port = process.env.PORT || 8000;
app.listen(port, () => {
    fs.emptyDir(path.join(__dirname, `./tmp`));
    console.log(`done => http://localhost:${port}`);
});
export default app;