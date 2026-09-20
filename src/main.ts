// Wires the element tree, the save state, the Babylon workbench and the
// sidebar together.
import "./style.css";
import { GameState } from "./state";
import { Workbench, type Token } from "./scene";
import { getElement } from "./data/elements";
import { Audio } from "./audio";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const listEl = document.getElementById("element-list") as HTMLDivElement;
const countEl = document.getElementById("count") as HTMLSpanElement;
const totalEl = document.getElementById("total") as HTMLSpanElement;
const toastEl = document.getElementById("toast") as HTMLDivElement;
const searchEl = document.getElementById("search") as HTMLInputElement;
const hintBtn = document.getElementById("hint") as HTMLButtonElement;
const clearBtn = document.getElementById("clear-board") as HTMLButtonElement;
const resetBtn = document.getElementById("reset") as HTMLButtonElement;
const muteBtn = document.getElementById("mute") as HTMLButtonElement;

const state = new GameState();
const audio = new Audio();

const bench = new Workbench(canvas, {
  onPickUp: () => {
    audio.play("place");
  },
  onMerge: (a: Token, b: Token) => {
    const result = state.tryCombine(a.elementId, b.elementId);
    if (result.kind === "fail") {
      audio.play("fail");
      toast(`${getElement(a.elementId).name} + ${getElement(b.elementId).name} … nothing happens`, "fail");
      return null;
    }
    const def = getElement(result.id!);
    if (result.kind === "new") {
      audio.play("discovery");
      toast(`New! ${def.name} — ${def.blurb}`, "new");
      renderList();
    } else {
      audio.play("merge");
      toast(`${def.name}`, "known");
    }
    return result.id!;
  },
});

/** Drop a token on a clear patch of the board. */
function spawnFromSidebar(elementId: string): void {
  const { x, y } = bench.findFreeSpot();
  bench.spawn(elementId, x, y);
}

function renderList(): void {
  const filter = searchEl.value.trim().toLowerCase();
  listEl.innerHTML = "";

  for (const id of state.list()) {
    const def = getElement(id);
    if (filter && !def.name.toLowerCase().includes(filter)) continue;

    const item = document.createElement("button");
    item.className = "element-chip";
    item.type = "button";
    item.title = def.blurb;
    item.style.setProperty("--chip", def.color);

    const icon = document.createElement("span");
    icon.className = "chip-icon";
    // Same rule as the scene: generated sprite if present, glyph otherwise.
    const img = new Image();
    img.alt = "";
    img.onload = () => {
      icon.textContent = "";
      icon.appendChild(img);
    };
    img.src = `sprites/${id}.png`;
    icon.textContent = def.glyph;

    const label = document.createElement("span");
    label.className = "chip-name";
    label.textContent = def.name;

    item.append(icon, label);
    item.addEventListener("click", () => spawnFromSidebar(id));
    listEl.appendChild(item);
  }

  countEl.textContent = String(state.count);
  totalEl.textContent = String(state.total);
}

let toastTimer: number | undefined;
function toast(message: string, kind: "new" | "known" | "fail"): void {
  toastEl.textContent = message;
  toastEl.className = `toast show ${kind}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.className = "toast";
  }, kind === "new" ? 2600 : 1400);
}

hintBtn.addEventListener("click", () => {
  const hint = state.findHint();
  if (!hint) {
    toast("Nothing left to find — you have everything.", "known");
    return;
  }
  const [a, b] = hint;
  // Put the pair on the board so the hint is one drag away, not a puzzle itself.
  spawnFromSidebar(a);
  spawnFromSidebar(b);
  toast(`Try ${getElement(a).name} + ${getElement(b).name}`, "known");
});

searchEl.addEventListener("input", renderList);
clearBtn.addEventListener("click", () => bench.clearTokens());
resetBtn.addEventListener("click", () => {
  if (!confirm("Erase all discoveries and start over?")) return;
  state.reset();
  bench.clearTokens();
  renderList();
  seedBoard();
});

function seedBoard(): void {
  const b = bench.bounds;
  const bases = ["fire", "water", "earth", "air"];
  bases.forEach((id, i) => {
    const x = (i - (bases.length - 1) / 2) * 2.6;
    bench.spawn(id, x, b.bottom * 0.45);
  });
}

function syncMuteButton(): void {
  muteBtn.textContent = audio.muted ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-pressed", String(audio.muted));
  muteBtn.setAttribute("aria-label", audio.muted ? "Unmute sound" : "Mute sound");
}

muteBtn.addEventListener("click", () => {
  audio.setMuted(!audio.muted);
  syncMuteButton();
});

// Browsers only allow audio to start inside a user gesture, so arm it on the
// first interaction anywhere and then stop listening.
const armAudio = () => {
  audio.unlock();
  syncMuteButton();
};
for (const ev of ["pointerdown", "keydown"] as const) {
  window.addEventListener(ev, armAudio, { once: true });
}

renderList();
seedBoard();
syncMuteButton();

// Capture tooling waits on this instead of a fixed delay.
const hooks = window as unknown as Record<string, unknown>;
hooks.__gameReady = () => bench.ready && bench.tokenCount > 0;
// Used by tools/playtest.mjs to aim drags at real token positions instead of
// hard-coded pixels, which drift whenever the layout changes.
hooks.__debugTokens = () => bench.debugTokenScreenPositions();
