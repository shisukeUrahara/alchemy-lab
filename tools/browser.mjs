// Shared Chromium launch for capture and playtest.
//
// WebGL in headless Chromium needs the software-GL fallback explicitly enabled;
// without these flags Babylon throws "WebGL not supported" and the page dies
// before it can set its ready flag. On a GPU box ANGLE/Vulkan is used instead
// and `--use-gl=angle` is harmless.
import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
import { join } from "node:path";

export function findChrome() {
  const root = `${process.env.HOME}/.cache/ms-playwright`;
  const dirs = readdirSync(root)
    .filter((d) => d.startsWith("chromium-"))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of dirs) {
    const exe = join(root, d, "chrome-linux64", "chrome");
    try {
      readdirSync(join(root, d, "chrome-linux64"));
      return exe;
    } catch {
      /* try the next build */
    }
  }
  throw new Error("no chromium under ~/.cache/ms-playwright — run: npx playwright install chromium");
}

export const GPU_ARGS = [
  "--use-gl=angle",
  "--use-angle=vulkan",
  "--enable-features=Vulkan",
  "--enable-unsafe-swiftshader", // allow the software path rather than failing outright
  "--ignore-gpu-blocklist",
  "--enable-gpu-rasterization",
  "--no-sandbox",
];

export async function launch() {
  return chromium.launch({ executablePath: findChrome(), headless: true, args: GPU_ARGS });
}

/** Log the renderer and warn when we silently fell back to software. */
export async function reportRenderer(page) {
  const renderer = await page.evaluate(() => {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return "no-webgl";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "unknown";
  });
  console.log("WebGL renderer:", renderer);
  if (/swiftshader|llvmpipe|lavapipe/i.test(renderer)) {
    console.warn("WARNING: software rendering — capture is slow and may not reflect GPU output.");
  }
  return renderer;
}
