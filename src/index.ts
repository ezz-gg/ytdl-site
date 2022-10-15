import {
  Application,
  Context,
  send,
} from "https://deno.land/x/oak@v11.1.0/mod.ts";
import staticFiles from "https://deno.land/x/static_files@1.1.6/mod.ts";
import ytsr from "https://deno.land/x/youtube_sr@v4.3.4-deno/mod.ts";
import ytdl from "https://deno.land/x/ytdl_core@v0.1.1/mod.ts";
import url from "https://deno.land/std@0.159.0/node/url.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { rmdir } from "https://deno.land/std@0.137.0/node/fs.ts?s=rmdir";

let fileDeleteTimer: [{ fileName: string; expireDate: number }] = [
  { fileName: "start", expireDate: Date.now() },
];

const app = new Application();

const kkPath = url.fileURLToPath(new URL(".", import.meta.url));

app.use(staticFiles("data"));

app.use(async (_ctx: Context<Record<string, any>, Record<string, any>>) => {
  const path = _ctx.request.url.pathname;

  if (path === "/")
    return (_ctx.response.body = `Hello\n/<title>.mp4\n/<title>.mp3`);

  if (path.startsWith("/data/"))
    return await send(_ctx, _ctx.request.url.pathname.slice(6), {
      root: kkPath + "data/",
      contentTypes: {
        ".mp4": "video/mp4",
        ".mp3": "audio/mpeg",
      },
    });

  const title = path.slice(1, -4);

  const song = await ytsr.searchOne(decodeURI(title), "video", false);

  if (!song) return (_ctx.response.body = "検索結果がありません");

  if (path.endsWith(".mp4"))
    return await ytdlVideo(
      song.url || "",
      song.id || "",
      song.title || "",
      _ctx
    );
  if (path.endsWith(".mp3"))
    return await ytdlMusic(
      song.url || "",
      song.id || "",
      song.title || "",
      _ctx
    );

  return (_ctx.response.body = "何かがおかしいんだお");
});

async function ytdlVideo(
  songurl: string,
  songid: string,
  songname: string,
  _ctx: Context<Record<string, any>, Record<string, any>>
) {
  const fileName = songid + ".mp4";

  if (await exists(fileName)) {
    return _ctx.response.redirect(
      new URL("./data/" + fileName, _ctx.request.url.origin)
    );
  }

  const yt = await ytdl(songurl, {
    quality: "highest",
    filter: "videoandaudio",
  });

  const chunks: Uint8Array[] = [];

  for await (const chunk of yt) {
    chunks.push(chunk);
  }

  const blob = new Blob(chunks);

  const ok = await Deno.writeFile(
    new URL("./data/" + fileName, import.meta.url),
    new Uint8Array(await blob.arrayBuffer())
  );

  return _ctx.response.redirect(
    new URL("./data/" + fileName, _ctx.request.url.origin)
  );
}
async function ytdlMusic(
  songurl: string,
  songid: string,
  songname: string,
  _ctx: Context<Record<string, any>, Record<string, any>>
) {
  const fileName = songid + ".mp3";

  if (await exists(fileName)) {
    _ctx.response.redirect(
      new URL("./data/" + fileName, _ctx.request.url.origin)
    );
    return await fileDeleteTimerRegister(fileName);
  }

  const yt = await ytdl(songurl, {
    quality: "highest",
    filter: "audioonly",
  });

  const chunks: Uint8Array[] = [];

  for await (const chunk of yt) {
    chunks.push(chunk);
  }

  const blob = new Blob(chunks);

  const ok = await Deno.writeFile(
    new URL("./data/" + fileName, import.meta.url),
    new Uint8Array(await blob.arrayBuffer())
  );

  _ctx.response.redirect(
    new URL("./data/" + fileName, _ctx.request.url.origin)
  );
  return await fileDeleteTimerRegister(fileName);
}

async function exists(fileName: string) {
  try {
    const file = await Deno.stat(
      new URL("./data/" + fileName, import.meta.url)
    );
    return file.isFile;
  } catch {
    return false;
  }
}

async function fileDeleteTimerRegister(fileName: string) {
  for (const i in fileDeleteTimer) {
    if (fileDeleteTimer[i].fileName === fileName)
      return (fileDeleteTimer[i].expireDate = Date.now() + 60 * 30);
  }

  fileDeleteTimer.push({
    fileName: fileName,
    expireDate: Date.now() + 60 * 30,
  });
}

async function fileDeleteTimerLoop() {
  for (const i in fileDeleteTimer) {
    if (fileDeleteTimer[i].expireDate <= Date.now()) {
      if (fileDeleteTimer[i].fileName !== "start") {
        await Deno.remove(
          new URL("./data/" + fileDeleteTimer[i].fileName, import.meta.url)
        );
      } else {
      }

      delete fileDeleteTimer[i];
    }
  }

  fileDeleteTimer.filter((j) => !(typeof j === "undefined"));

  await sleep(0.025);

  await fileDeleteTimerLoop();
}

fileDeleteTimerLoop();

for await (const i of Deno.readDir(new URL("./data", import.meta.url))) {
  await Deno.remove(i.name);
}

const port = Number(Deno.env.get("PORT")) || 25252;

console.log("ready http://0.0.0.0:" + port + "/");

await app.listen({ port: port });
