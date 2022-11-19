import { serve } from "https://deno.land/std@0.165.0/http/server.ts";
import { Context, Hono } from "https://deno.land/x/hono@v2.5.2/mod.ts";
import {
  logger,
  serveStatic,
} from "https://deno.land/x/hono@v2.5.2/middleware.ts";
import ytsr from "https://deno.land/x/youtube_sr@v4.3.4-deno/mod.ts";
import ytdl from "https://deno.land/x/ytdl_core@v0.1.1/mod.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { Environment } from "https://deno.land/x/hono@v2.5.2/types.ts";
import { Schema } from "https://deno.land/x/hono@v2.5.2/validator/schema.ts";

const port = Number(Deno.env.get("PORT")) || 49152;

// deno-lint-ignore prefer-const
let fileDeleteTimer: [{ fileName: string; expireDate: number }] = [
  { fileName: "start", expireDate: Date.now() },
];

const app = new Hono();

app.use("*", logger());

app.use("/data/*", serveStatic({ root: "./src" }));

app.get("/", (c: Context<string, Environment, Schema>) => {
  return c.body("Hello\n/<title>.mp4\n/<title>.mp3", 200, {
    "content-type": "text/plain",
  });
});

app.get("/:title", async (c: Context<string, Environment, Schema>) => {
  const path: string = c.req.param("title");

  const title = path.slice(0, -4);

  const song = await ytsr.searchOne(decodeURI(title), "video", false);

  if (!song) return c.body("検索結果がありません", 200, { "content-type": "text/html" });

  if (path.endsWith(".mp4")) {
    return await ytdlVideo(
      song.url || "",
      song.title || "",
      song.id || "",
      c,
    );
  }

  if (path.endsWith(".mp3")) {
    return await ytdlMusic(
      song.url || "",
      song.title || "",
      song.id || "",
      c,
    );
  }
});

async function ytdlVideo(
  songurl: string,
  _songtitle: string,
  songid: string,
  c: Context<string, Environment, Schema>,
) {
  const fileName = songid + ".mp4";

  if (await exists(fileName)) {
    fileDeleteTimerRegister(fileName);

    const file =
      await (await fetch(new URL("./data/" + fileName, import.meta.url)))
        .arrayBuffer();
    return c.body(
      file,
      200,
      { "content-type": "video/mp4" },
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

  // deno-lint-ignore no-unused-vars
  const ok = await Deno.writeFile(
    new URL("./data/" + fileName, import.meta.url),
    new Uint8Array(await blob.arrayBuffer()),
  );

  fileDeleteTimerRegister(fileName);

  const file =
    await (await fetch(new URL("./data/" + fileName, import.meta.url)))
      .arrayBuffer();

  return c.body(
    file,
    200,
    { "content-type": "video/mp4" },
  );
}

async function ytdlMusic(
  songurl: string,
  _songtitle: string,
  songid: string,
  c: Context<string, Environment, Schema>,
) {
  const fileName = songid + ".mp3";

  if (await exists(fileName)) {
    fileDeleteTimerRegister(fileName);

    const file =
      await (await fetch(new URL("./data/" + fileName, import.meta.url)))
        .arrayBuffer();

    return c.body(
      file,
      200,
      { "content-type": "audio/mpeg" },
    );
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

  // deno-lint-ignore no-unused-vars
  const ok = await Deno.writeFile(
    new URL("./data/" + fileName, import.meta.url),
    new Uint8Array(await blob.arrayBuffer()),
  );

  fileDeleteTimerRegister(fileName);

  const file =
    await (await fetch(new URL("./data/" + fileName, import.meta.url)))
      .arrayBuffer();

  return c.body(
    file,
    200,
    { "content-type": "audio/mpeg" },
  );
}

async function exists(fileName: string) {
  try {
    const file = await Deno.stat(
      new URL("./data/" + fileName, import.meta.url),
    );
    return file.isFile;
  } catch {
    return false;
  }
}

function fileDeleteTimerRegister(fileName: string) {
  for (const i in fileDeleteTimer) {
    if (fileDeleteTimer[i].fileName === fileName) {
      return (fileDeleteTimer[i].expireDate = Date.now() + 1000 * 60 * 30);
    }
  }

  fileDeleteTimer.push({
    fileName: fileName,
    expireDate: Date.now() + 1000 * 60 * 30,
  });
}

async function fileDeleteTimerLoop() {
  for (const i in fileDeleteTimer) {
    if (fileDeleteTimer[i].expireDate <= Date.now()) {
      if (fileDeleteTimer[i].fileName !== "start") {
        await Deno.remove(
          new URL("./data/" + fileDeleteTimer[i].fileName, import.meta.url),
        );
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

serve(app.fetch, { hostname: "0.0.0.0", port: port });
