import ytdl from "ytdl-core";
import ytsr from "@distube/ytsr";
import express from "express";

process.on("uncaughtException", async (err): Promise<void> => {
  console.error(err);
});

const app = express();

app.get("/", async (req: express.Request, res: express.Response) => {
  console.log(`"GET / HTTP/${req.httpVersion}"`);

  res.send(
    "Hello\n/video 映像と音をバッファーで\n/music 音だけをバッファーで\n/dl/video 映像と音をファイルとしてダウンロード\n/dl/music 音だけをファイルとしてダウンロード"
  );
});
app.get("/:value", async (req: express.Request, res: express.Response) => {
  const value = decodeURI(req.params.value);

  try {
    if (value.endsWith(".mp4")) {
      const title = value.slice(0, -4);
      const song = await search(title);

      console.log(
        `"GET /${value} HTTP/${req.httpVersion}" SongName：${song.name}`
      );

      await ytdlvideo(song.url, song.id, song.name, req, res);
    } else if (value.endsWith(".mp3")) {
      const title = value.slice(0, -4);
      const song = await search(title);

      console.log(
        `"GET /${value} HTTP/${req.httpVersion}" SongName：${song.name}`
      );

      await ytdlmusic(song.url, song.id, song.name, req, res);
    }
  } catch (error: any) {
    res.send("検索結果がありません");
  }
});

app.get(
  "/video/:value",
  async (req: express.Request, res: express.Response) => {
    try {
      const song = await search(decodeURI(req.params.value));
      console.log(
        `"GET /video/${decodeURI(req.params.value)} HTTP/${
          req.httpVersion
        }" SongName：${song.name}`
      );
      await ytdlvideo(song.url, song.id, song.name, req, res);
    } catch (error: any) {
      res.send("検索結果がありません");
    }
  }
);

app.get(
  "/music/:value",
  async (req: express.Request, res: express.Response) => {
    try {
      const song = await search(decodeURI(req.params.value));
      console.log(
        `"GET /music/${decodeURI(req.params.value)} HTTP/${
          req.httpVersion
        }" SongName：${song.name}`
      );
      await ytdlmusic(song.url, song.id, song.name, req, res);
    } catch (error: any) {
      res.send("検索結果がありません");
    }
  }
);

app.get(
  "/dl/video/:value",
  async (req: express.Request, res: express.Response) => {
    try {
      const song = await search(decodeURI(req.params.value));
      console.log(
        `"GET /dl/video/${decodeURI(req.params.value)} HTTP/${
          req.httpVersion
        }" SongName：${song.name}`
      );
      await ytdlvideo_dl(song.url, song.id, song.name, req, res);
    } catch (error: any) {
      res.send("検索結果がありません");
    }
  }
);

app.get(
  "/dl/music/:value",
  async (req: express.Request, res: express.Response) => {
    try {
      const song = await search(decodeURI(req.params.value));
      console.log(
        `"GET /dl/music/${decodeURI(req.params.value)} HTTP/${
          req.httpVersion
        }" SongName：${song.name}`
      );
      await ytdlmusic_dl(song.url, song.id, song.name, req, res);
    } catch (error: any) {
      res.send("検索結果がありません");
    }
  }
);

async function search(value: string): Promise<any> {
  try {
    const result = await ytsr(value, { safeSearch: false, limit: 1 }).then(
      async (result): Promise<any> => {
        let song = result.items[0];
        return song;
      }
    );
    return result;
  } catch (error: any) {
    return null;
  }
}

async function ytdlvideo(
  songurl: string,
  songid: string,
  songname: string,
  req: express.Request,
  res: express.Response
): Promise<void> {
  res.setHeader("content-type", "video/mp4");

  ytdl(songurl, {
    quality: "highestvideo",
    filter: "videoandaudio",
  }).pipe(res);
}

async function ytdlmusic(
  songurl: string,
  songid: string,
  songname: string,
  req: express.Request,
  res: express.Response
): Promise<void> {
  res.setHeader("content-type", "audio/mpeg");

  ytdl(songurl, {
    quality: "highestaudio",
    filter: "audioonly",
  }).pipe(res);
}

async function ytdlvideo_dl(
  songurl: string,
  songid: string,
  songname: string,
  req: express.Request,
  res: express.Response
): Promise<void> {
  let data: any = [];

  ytdl(songurl, {
    quality: "highestvideo",
    filter: "videoandaudio",
  })
    .on("data", (chunk: any) => {
      data.push(chunk);
    })
    .on("end", () => {
      let buffer: Buffer | null = Buffer.concat(data);

      res.setHeader("content-type", "video/mp4");
      res.setHeader(
        "content-disposition",
        `attachment; filename="${songname.replaceAll(/.|,|\/|\\/gi, "")}"`
      );
      res.setHeader("content-length", buffer.length);

      res.send(buffer);

      data = null;
      buffer = null;
    });
}

async function ytdlmusic_dl(
  songurl: string,
  songid: string,
  songname: string,
  req: express.Request,
  res: express.Response
): Promise<void> {
  let data: any = [];

  ytdl(songurl, {
    quality: "highestaudio",
    filter: "audioonly",
  })
    .on("data", (chunk: any) => {
      data.push(chunk);
    })
    .on("end", () => {
      let buffer: Buffer | null = Buffer.concat(data);

      res.setHeader("content-type", "audio/mpeg");
      res.setHeader(
        "content-disposition",
        `attachment; filename="${songname.replaceAll(/.|,|\/|\\/gi, "")}"`
      );
      res.setHeader("content-length", buffer.length);

      res.send(buffer);

      data = null;
      buffer = null;
    });
}

const port = Number(process.env.PORT) || 25252;

app.listen(port, "0.0.0.0", async () => {
  console.log(`ready => http://localhost:${port}/`);
});
