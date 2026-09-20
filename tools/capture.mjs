// Screenshot / record the running dev server in a real GPU-backed Chromium.
//
//   node tools/capture.mjs shot  out.png
//   node tools/capture.mjs video out-dir/        (frames, then ffmpeg)
//
// Run under xvfb-run on a headless Linux box so ANGLE can reach the GPU:
//   xvfb-run -a -s "-screen 0 1280x800x24" node tools/capture.mjs shot shot.png
import { launch, reportRenderer } from "./browser.mjs";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const MODE = process.argv[2] ?? "shot";
const OUT = process.argv[3] ?? (MODE === "shot" ? "shot.png" : "frames");
const URL = process.env.GAME_URL ?? "http://127.0.0.1:5173/";
const SECONDS = Number(process.env.CAPTURE_SECONDS ?? 16);
const FPS = 30;

const browser = await launch();

const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(String(e)));

await page.goto(URL, { waitUntil: "networkidle" });
await reportRenderer(page);


// Gate on the game's own ready flag rather than a blind delay.
await page.waitForFunction(() => globalThis.__gameReady?.() === true, null, { timeout: 20000 });
await page.waitForTimeout(400);

if (MODE === "shot") {
  await page.screenshot({ path: OUT });
  console.log("wrote", OUT);
} else {
  mkdirSync(OUT, { recursive: true });

  // Scripted play so the clip shows the game actually working, not a still board.
  const drag = async (from, to) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
  };

  let frame = 0;
  const shooting = setInterval(async () => {
    try {
      await page.screenshot({ path: join(OUT, `frame_${String(frame++).padStart(4, "0")}.png`) });
    } catch {
      /* page closing */
    }
  }, 1000 / FPS);

  const board = { x: 780, y: 400 };
  await page.waitForTimeout(900);
  // fire + water -> steam
  await drag({ x: board.x - 130, y: 660 }, { x: board.x, y: 400 });
  await page.waitForTimeout(700);
  // earth + fire -> lava
  await drag({ x: board.x + 130, y: 660 }, { x: board.x + 10, y: 405 });
  await page.waitForTimeout(1500);

  await page.waitForTimeout(Math.max(0, SECONDS * 1000 - 5200));
  clearInterval(shooting);
  await page.waitForTimeout(200);
  console.log("wrote frames to", OUT);
}

if (consoleErrors.length) {
  console.error("PAGE ERRORS:");
  for (const e of consoleErrors.slice(0, 15)) console.error("  " + e);
}

await browser.close();
process.exit(consoleErrors.length ? 1 : 0);
