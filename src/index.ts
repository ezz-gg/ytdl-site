import { Application, Context } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import staticFiles from "https://deno.land/x/static_files@1.1.6/mod.ts";
import ytsr from "https://deno.land/x/youtube_sr@v4.3.4-deno/mod.ts";
import ytdl from "https://deno.land/x/ytdl_core@v0.1.1/mod.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";

let fileDeleteTimer: [
  { fileName: string; titleName: string; expireDate: number }
] = [{ fileName: "start", titleName: "start", expireDate: Date.now() }];

const app = new Application();

app.use(
  staticFiles("src/data", {
    prefix: "/data",
    redirect: true,
  })
);

app.use(async (_ctx: Context<Record<string, any>, Record<string, any>>) => {
  const path = _ctx.request.url.pathname;

  if (path.startsWith("/data/")) return;

  if (path === "/")
    return (_ctx.response.body = `Hello\n/<title>.mp4\n/<title>.mp3`);

  const title = path.slice(1, -4);

  const song = await ytsr.searchOne(decodeURI(title), "video", false);

  if (!song) return (_ctx.response.body = "検索結果がありません");

  if (path.endsWith(".mp4"))
    return await ytdlVideo(
      song.url || "",
      song.title || "",
      song.id || "",
      _ctx
    );
  if (path.endsWith(".mp3"))
    return await ytdlMusic(
      song.url || "",
      song.title || "",
      song.id || "",
      _ctx
    );

  return (_ctx.response.body = "何かがおかしいんだお");
});

async function ytdlVideo(
  songurl: string,
  songtitle: string,
  songid: string,
  _ctx: Context<Record<string, any>, Record<string, any>>
) {
  const fileName = songid + ".mp4";
  const titleName = songtitle.replaceAll(/\.|\,|\/|\\/g, "") + ".mp4";

  if (await exists(fileName)) {
    _ctx.response.redirect(
      new URL("./data/" + titleName, _ctx.request.url.origin)
    );

    return await fileDeleteTimerRegister(fileName, titleName);
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

  await Deno.symlink(
    new URL("./data/" + fileName, import.meta.url),
    new URL("./data/" + titleName, import.meta.url),
    { type: "file" }
  );

  _ctx.response.redirect(
    new URL("./data/" + titleName, _ctx.request.url.origin)
  );

  return await fileDeleteTimerRegister(fileName, titleName);
}
async function ytdlMusic(
  songurl: string,
  songtitle: string,
  songid: string,
  _ctx: Context<Record<string, any>, Record<string, any>>
) {
  const fileName = songid + ".mp3";
  const titleName = songtitle.replaceAll(/\.|\,|\/|\\/g, "") + ".mp3";

  if (await exists(fileName)) {
    _ctx.response.redirect(
      new URL("./data/" + titleName, _ctx.request.url.origin)
    );

    return await fileDeleteTimerRegister(fileName, titleName);
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

  await Deno.symlink(
    new URL("./data/" + fileName, import.meta.url),
    new URL("./data/" + titleName, import.meta.url),
    { type: "file" }
  );

  _ctx.response.redirect(
    new URL("./data/" + titleName, _ctx.request.url.origin)
  );

  return await fileDeleteTimerRegister(fileName, titleName);
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

async function fileDeleteTimerRegister(fileName: string, titleName: string) {
  for (const i in fileDeleteTimer) {
    if (fileDeleteTimer[i].fileName === fileName)
      return (fileDeleteTimer[i].expireDate = Date.now() + 1000 * 60 * 30);
  }

  fileDeleteTimer.push({
    fileName: fileName,
    titleName: titleName,
    expireDate: Date.now() + 1000 * 60 * 30,
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
  await Deno.remove(new URL("./data/" + i.name, import.meta.url));
}

const port = Number(Deno.env.get("PORT")) || 49152;

console.log("ready http://0.0.0.0:" + port + "/");

await app.listen({ port: port });
