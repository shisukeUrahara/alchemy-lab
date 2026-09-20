// Drives the running game like a player and asserts the rules hold.
// Run: node tools/playtest.mjs   (dev server must be up)
import { launch } from "./browser.mjs";

const URL = process.env.GAME_URL ?? "http://127.0.0.1:5173/";

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  // Missing sprite PNGs are expected before art is generated.
  const t = m.text();
  if (m.type() === "error" && !/404|Failed to load resource/.test(t)) errors.push(t);
});

// Count real Web Audio nodes so "sound plays" is measured, not assumed.
await page.addInitScript(() => {
  const probe = { contexts: 0, oscillators: 0, lastCtx: null, get masterGain() { return this._master?.gain?.value ?? -1; }, _master: null };
  globalThis.__audioProbe = probe;
  const Real = globalThis.AudioContext;
  if (!Real) return;
  globalThis.AudioContext = class extends Real {
    constructor(...args) {
      super(...args);
      probe.contexts++;
      probe.lastCtx = this;
      const realOsc = this.createOscillator.bind(this);
      this.createOscillator = () => { probe.oscillators++; return realOsc(); };
      const realGain = this.createGain.bind(this);
      let first = true;
      this.createGain = () => { const g = realGain(); if (first) { probe._master = g; first = false; } return g; };
    }
  };
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => globalThis.__gameReady?.() === true, null, { timeout: 20000 });

const fails = [];
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name} ${detail}`);
    fails.push(name);
  }
};

const count = () => page.$eval("#count", (e) => Number(e.textContent));
const chips = () => page.$$eval(".element-chip .chip-name", (n) => n.map((x) => x.textContent));
const toastText = () => page.$eval("#toast", (e) => e.textContent ?? "");

/** Live token positions in page pixels — never hard-coded, so layout changes
 *  don't silently turn a real failure into a missed drag. */
const tokens = () => page.evaluate(() => globalThis.__debugTokens());

async function tokenPos(id) {
  const all = await tokens();
  const t = all.find((t) => t.id === id);
  if (!t) throw new Error(`no "${id}" token on the board (have: ${all.map((x) => x.id).join(",")})`);
  return t;
}

async function drag(from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 10, from.y + ((to.y - from.y) * i) / 10);
    await page.waitForTimeout(14);
  }
  await page.mouse.up();
  await page.waitForTimeout(280);
}

/** Drag token `a` onto token `b` and let them merge. Handles a self-recipe
 *  (water + water) by picking two *distinct* tokens of that element. */
async function mergeTokens(aId, bId) {
  const all = await tokens();
  const matching = (id) => all.filter((t) => t.id === id);
  let a, b;
  if (aId === bId) {
    const both = matching(aId);
    if (both.length < 2) throw new Error(`need 2 "${aId}" tokens, have ${both.length}`);
    [a, b] = both;
  } else {
    a = matching(aId)[0];
    b = matching(bId)[0];
    if (!a || !b) throw new Error(`missing token (${aId}:${!!a} ${bId}:${!!b}) — have ${all.map((t) => t.id).join(",")}`);
  }
  await drag(a, b);
}

/** Click a sidebar chip by name to put a fresh token on the board. */
async function place(name) {
  await page.click(`.element-chip:has(.chip-name:text-is("${name}"))`);
  await page.waitForTimeout(220);
}

console.log("playtest:");

// 1. Starts with exactly the four bases.
check("starts with 4 elements", (await count()) === 4, `got ${await count()}`);
const startChips = await chips();
check("sidebar lists the 4 bases", ["Air", "Earth", "Fire", "Water"].every((n) => startChips.includes(n)));

// 2. fire + water -> steam (a real discovery).
await mergeTokens("fire", "water");
check("fire + water discovers Steam", (await chips()).includes("Steam"), await toastText());
check("count rose to 5", (await count()) === 5, `got ${await count()}`);

// 2b. The two ingredients are consumed and replaced by one result token.
const afterMerge = (await tokens()).map((t) => t.id);
check("merge consumes both ingredients", !afterMerge.includes("fire") && !afterMerge.includes("water"), afterMerge.join(","));
check("merge leaves a Steam token", afterMerge.includes("steam"), afterMerge.join(","));

// 2c. A pair with no recipe (steam + water) must discover nothing and must
//     leave both tokens on the board instead of eating them.
await place("Water");
await place("Steam");
const beforeDud = await count();
const dudA = (await tokens()).filter((t) => t.id === "steam").pop();
const dudB = (await tokens()).filter((t) => t.id === "water").pop();
await drag(dudA, dudB);
check("steam + water discovers nothing", (await count()) === beforeDud, `${beforeDud} -> ${await count()}`);
const afterDud = (await tokens()).map((t) => t.id);
check("failed merge keeps steam", afterDud.includes("steam"), afterDud.join(","));
check("failed merge keeps water", afterDud.includes("water"), afterDud.join(","));

// 3. Placing tokens from the sidebar must not itself discover anything —
//    only a successful merge may raise the count.
const before = await count();
await place("Earth");
await place("Fire");
const afterPlacing = await count();
check("placing tokens does not change the count", afterPlacing === before, `${before} -> ${afterPlacing}`);

// 4. Discoveries survive a reload (save works).
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => globalThis.__gameReady?.() === true, null, { timeout: 20000 });
check("save persists across reload", (await chips()).includes("Steam"), (await chips()).join(","));
check("count persists", (await count()) === 5, `got ${await count()}`);

// 5. Reset clears back to the four bases.
page.once("dialog", (d) => d.accept());
await page.click("#reset");
await page.waitForTimeout(400);
check("reset returns to 4", (await count()) === 4, `got ${await count()}`);
check("reset drops discoveries", !(await chips()).includes("Steam"));

// 6. Hint suggests a pair that actually yields something new.
const beforeHint = await count();
await page.click("#hint");
await page.waitForTimeout(300);
const hintMsg = await toastText();
check("hint names a pair", /Try .+ \+ .+/.test(hintMsg), hintMsg);
check("hint does not itself discover", (await count()) === beforeHint, `${beforeHint} -> ${await count()}`);
const m = hintMsg.match(/Try (.+) \+ (.+)/);
if (m) {
  const idOf = (name) => name.trim().toLowerCase();
  await mergeTokens(idOf(m[1]), idOf(m[2]));
  check("following the hint discovers something new", (await count()) === beforeHint + 1, `${beforeHint} -> ${await count()}: ${await toastText()}`);
}

// 7. Audio. Real oscillators are counted by patching the AudioContext, because
//    a silent bug (context suspended, wrong node graph) otherwise looks fine.
const audioState = () => page.evaluate(() => ({
  ctxCount: globalThis.__audioProbe?.contexts ?? 0,
  state: globalThis.__audioProbe?.lastCtx?.state ?? "none",
  oscillators: globalThis.__audioProbe?.oscillators ?? 0,
}));

let a = await audioState();
check("audio context created after interaction", a.ctxCount === 1, JSON.stringify(a));
check("audio context is running (not blocked)", a.state === "running", JSON.stringify(a));
check("background music is playing", a.oscillators > 0, `${a.oscillators} oscillators`);

// A discovery must make more sound than silence.
const beforeSfx = (await audioState()).oscillators;
await place("Fire");
await place("Earth");
const fireTok = (await tokens()).filter((t) => t.id === "fire").pop();
const earthTok = (await tokens()).filter((t) => t.id === "earth").pop();
await drag(fireTok, earthTok);
await page.waitForTimeout(250);
const afterSfx = (await audioState()).oscillators;
check("merging plays a sound", afterSfx > beforeSfx, `${beforeSfx} -> ${afterSfx} oscillators`);

// Muting must actually silence the master gain, not just change the icon.
await page.click("#mute");
await page.waitForTimeout(300); // let the 80ms mute ramp finish
const muted = await page.evaluate(() => globalThis.__audioProbe?.masterGain ?? -1);
check("mute drops master gain to 0", muted === 0, `gain=${muted}`);
await page.click("#mute");
await page.waitForTimeout(300);
const unmuted = await page.evaluate(() => globalThis.__audioProbe?.masterGain ?? -1);
check("unmute restores gain", unmuted > 0, `gain=${unmuted}`);

// 8. The mute choice must survive a reload like discoveries do.
await page.click("#mute");
await page.waitForTimeout(200);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => globalThis.__gameReady?.() === true, null, { timeout: 20000 });
const icon = await page.$eval("#mute", (e) => e.textContent);
check("mute setting persists across reload", icon === "\u{1F507}", `icon=${icon}`);
await page.click("#mute"); // leave it unmuted for anything after

check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();

if (fails.length) {
  console.error(`\nplaytest FAILED: ${fails.join(", ")}`);
  process.exit(1);
}
console.log("\nplaytest passed");
