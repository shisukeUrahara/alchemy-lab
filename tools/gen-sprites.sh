#!/usr/bin/env bash
# Generate element sprites with sprite-gen (codex provider, no API key needed).
#
#   tools/gen-sprites.sh fire water earth      # only these
#   tools/gen-sprites.sh                       # every element still missing
#
# Existing files are skipped, so re-running only fills the gaps.
set -uo pipefail

SPRITE_GEN="${SPRITE_GEN:-$HOME/.claude/skills/sprite-gen/.venv/bin/sprite-gen}"
# Pillow lives in sprite-gen's venv; the system python may not have it.
PY_BIN="${PY_BIN:-$HOME/.claude/skills/sprite-gen/.venv/bin/python3}"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/sprites"
STYLE="clean vector-style flat game icon, bold dark outline, simple readable shapes, saturated colors, soft inner shading, centered, no text, no background scenery, mobile alchemy game icon art, solid pure magenta background"

mkdir -p "$OUT_DIR"

if [ $# -gt 0 ]; then
    IDS=("$@")
else
    mapfile -t IDS < <(node -e '
      const s = require("fs").readFileSync("src/data/elements.ts", "utf8");
      for (const m of s.matchAll(/\{\s*id:\s*"([a-z]+)"/g)) console.log(m[1]);
    ')
fi

declare -A SUBJECT=(
  [fire]="a single bright flame" [water]="a single water droplet" [earth]="a rounded chunk of brown rock and soil"
  [air]="a curling wind swirl in pale blue" [steam]="a rising curl of white steam vapour"
  [lava]="a glowing blob of molten orange lava" [mud]="a glossy splat of brown mud"
  [dust]="a small puff of drifting beige dust" [energy]="a crackling yellow energy spark"
  [rain]="three falling blue raindrops" [pressure]="two grey stone blocks squeezing together"
  [sea]="a rolling blue ocean wave" [stone]="a smooth grey boulder" [cloud]="a fluffy white cloud"
  [storm]="a dark storm cloud with a lightning bolt" [plant]="a small green sprout with two leaves"
  [sand]="a golden pile of sand" [obsidian]="a jagged black volcanic glass shard"
  [life]="a glowing pink DNA helix" [geyser]="a jet of water erupting from the ground"
  [glass]="a clear pale blue glass shard" [metal]="a polished steel ingot"
  [tree]="a round leafy green tree" [swamp]="a murky green swamp pool with reeds"
  [animal]="a simple brown fox sitting" [volcano]="an erupting volcano cone"
  [desert]="a sand dune with a cactus" [lightning]="a bright yellow lightning bolt"
  [human]="a simple standing human figure" [wood]="a stack of cut wooden logs"
  [steel]="a shining steel gear" [coal]="a lump of black coal"
  [oasis]="a palm tree beside a small blue pool" [bird]="a small blue bird in flight"
  [fish]="a simple orange fish" [tool]="a hammer and chisel crossed"
  [house]="a small cosy cottage" [fireplace]="a stone hearth with a burning fire"
  [diamond]="a brilliant cut cyan diamond" [boat]="a small wooden sailboat"
  [engine]="a chunky mechanical engine block" [phoenix]="a flaming orange phoenix bird"
  [city]="a cluster of tall city buildings" [ship]="a large steel ship"
  [train]="a steam locomotive" [dragon]="a red dragon with spread wings"
  [philosophy]="an open ancient scroll with a quill"
)

made=0; skipped=0; failed=0
for id in "${IDS[@]}"; do
    out="$OUT_DIR/$id.png"
    if [ -f "$out" ]; then
        echo "skip   $id (exists)"
        skipped=$((skipped + 1))
        continue
    fi
    subject="${SUBJECT[$id]:-$id}"
    echo "gen    $id — $subject"
    if "$SPRITE_GEN" gen --provider codex \
        --prompt "A single alchemy game icon: $subject. $STYLE" \
        --out "$out" --transparent --trim-alpha >/dev/null 2>&1; then
        # sprite-gen emits ~1000px PNGs (~500KB). The game draws them at 256px,
        # so downscale: 47 full-size sprites would be a 25MB page load.
        rm -f "$out.raw.png"
        "$PY_BIN" -c "
from PIL import Image
import sys
p = sys.argv[1]
im = Image.open(p).convert('RGBA')
im.thumbnail((256, 256), Image.LANCZOS)
im.save(p, optimize=True)
" "$out" 2>/dev/null || echo "  warn: could not downscale $id"
        echo "  ok   $id ($(du -h "$out" | cut -f1))"
        made=$((made + 1))
    else
        echo "  FAIL $id"
        failed=$((failed + 1))
    fi
done

echo "---"
echo "made=$made skipped=$skipped failed=$failed"
[ "$failed" -eq 0 ]
