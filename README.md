# Alchemy Lab

A browser alchemy game. Start with **fire, water, earth, air** and drag them
together to discover 35 elements, ending at Dragon, Phoenix and Diamond.

Built with Babylon.js + Vite + TypeScript on the godogen runtime.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

The dev server binds `0.0.0.0:5173`, so the URL also works from other devices
on the LAN.

## Play

- **Click** an element in the sidebar to place it on the board.
- **Drag** one token onto another to combine them.
- A new discovery shows a gold toast; a dead-end pair bounces apart.
- **Hint** places a pair on the board that leads somewhere new.
- Sound is on by default; the speaker button by the title mutes it. Browsers
  block audio until you click, so the first click starts it.
- Discoveries save to `localStorage` and survive a reload. **Reset** clears them.

## Status

| Part | State |
|------|-------|
| Element tree (35 elements, 54 recipes) | Done — every element proven reachable |
| Drag-and-drop merging | Done |
| Save / load / reset | Done |
| Sidebar, search, progress count | Done |
| Hint button | Done |
| Sprite art | Generated with sprite-gen (codex provider) |
| Sound effects + background music | Done — synthesized, no audio files |
| More elements beyond tier 2 | Not built — see *Adding elements* |

## Checks

```bash
npm run check    # element tree: no typos, no unreachable elements, recipes symmetric
npm run build    # typecheck + production build (compile gate only)

# Behaviour, against a running dev server — this is the real proof:
xvfb-run -a -s "-screen 0 1280x800x24" node tools/playtest.mjs
```

`tools/playtest.mjs` drives a real browser: it merges fire + water, asserts
Steam is discovered, asserts a dead-end pair changes nothing and eats no
tokens, then reloads to confirm the save and resets to confirm the wipe.

## Layout

```
src/data/elements.ts        elements + recipes (the whole game design)
src/data/elements.check.ts  self-check for the tree
src/state.ts                discovery state, save/load
src/audio.ts                synthesized sound effects + generative music
src/scene.ts                Babylon workbench: tokens, dragging, merging
src/main.ts                 wiring, sidebar, toasts
public/sprites/<id>.png     one sprite per element
tools/gen-sprites.sh        regenerate sprite art
tools/playtest.mjs          scripted browser playtest
tools/capture.mjs           screenshot / proof video
tools/browser.mjs           shared headless Chromium launch
```

## Assets

| Asset | Source | Notes |
|-------|--------|-------|
| `public/sprites/*.png` | sprite-gen, `codex` provider | 160px, transparent, one file per element id |
| `tools/sheets/batch-5x5.png` | sprite-gen, one 5x5 grid generation | Source sheet for 25 of the sprites; kept for reference |
| Sound effects, music | Synthesized at runtime (`src/audio.ts`) | No files — Web Audio oscillators |

Sprites are optional: every element has a colour and emoji fallback drawn at
runtime, so the game is fully playable with `public/sprites/` empty.

Two ways to make them:

```bash
./tools/gen-sprites.sh fire water     # one generation per element
./tools/gen-sprites.sh                # everything still missing

./tools/slice-sheet.py <sheet.png> id1,id2,...   # slice one grid image into many
```

25 of the current sprites came from a single 5x5 grid generation
(`tools/sheets/batch-5x5.png`), which is far faster than 25 separate calls and
gives a more consistent style, since every icon is drawn in one pass.

## Adding elements

Edit `src/data/elements.ts`: add an entry to `ELEMENTS`, then one or more
`[a, b, result]` rows to `RAW_RECIPES`. Run `npm run check` — it fails if the
new element can never be reached from the four bases, or if a recipe names an
element that does not exist. Then `./tools/gen-sprites.sh <new-id>` for art.
