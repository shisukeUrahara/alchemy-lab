// The element tree. Four bases, 31 things to discover.
// `id` doubles as the sprite filename: public/sprites/<id>.png

export interface ElementDef {
  id: string;
  name: string;
  /** Short line shown when the element is first discovered. */
  blurb: string;
  /** Fallback tint used before/without a sprite. */
  color: string;
  /** Emoji fallback so the game is playable with zero generated art. */
  glyph: string;
  tier: number;
}

export const ELEMENTS: ElementDef[] = [
  // ---- tier 0: the four you start with ----
  { id: "fire",  name: "Fire",  blurb: "The first spark.",      color: "#ff6b2c", glyph: "🔥", tier: 0 },
  { id: "water", name: "Water", blurb: "It flows and fills.",   color: "#3aa7ff", glyph: "💧", tier: 0 },
  { id: "earth", name: "Earth", blurb: "Solid ground beneath.", color: "#8b6239", glyph: "🪨", tier: 0 },
  { id: "air",   name: "Air",   blurb: "Unseen, everywhere.",   color: "#bcd9e8", glyph: "🌬️", tier: 0 },

  // ---- tier 1 ----
  { id: "steam", name: "Steam", blurb: "Water learns to fly.",  color: "#d6e8f0", glyph: "♨️", tier: 1 },
  { id: "lava",  name: "Lava",  blurb: "Stone turned furious.", color: "#ff3b17", glyph: "🌋", tier: 1 },
  { id: "mud",   name: "Mud",   blurb: "Earth drinks deep.",    color: "#6b4a2a", glyph: "🟤", tier: 1 },
  { id: "dust",  name: "Dust",  blurb: "Earth, scattered thin.", color: "#c9b28a", glyph: "🌫️", tier: 1 },

  // ---- tier 2 ----
  { id: "cloud", name: "Cloud", blurb: "Steam that found the sky.", color: "#e8eef2", glyph: "☁️", tier: 2 },
  { id: "stone", name: "Stone", blurb: "Lava, cooled and patient.", color: "#8d8d8d", glyph: "🪨", tier: 2 },
  { id: "energy", name: "Energy", blurb: "Fire without a body.",    color: "#ffe14d", glyph: "⚡", tier: 2 },
  { id: "sand",  name: "Sand",  blurb: "Stone ground to grains.",   color: "#e3c66b", glyph: "🏖️", tier: 2 },
  { id: "rain",  name: "Rain",  blurb: "The sky gives water back.", color: "#5f9ea0", glyph: "🌧️", tier: 2 },
  { id: "sea",   name: "Sea",   blurb: "Water without an edge.",    color: "#1b6ca8", glyph: "🌊", tier: 2 },

  // ---- tier 3 ----
  { id: "plant",     name: "Plant",     blurb: "Mud reaches for the light.", color: "#4caf50", glyph: "🌱", tier: 3 },
  { id: "storm",     name: "Storm",     blurb: "The sky loses its temper.",  color: "#4a5568", glyph: "⛈️", tier: 3 },
  { id: "glass",     name: "Glass",     blurb: "Sand that learned clarity.", color: "#bfe9ee", glyph: "🔷", tier: 3 },
  { id: "metal",     name: "Metal",     blurb: "Stone with a spine.",        color: "#b0b6bd", glyph: "🔩", tier: 3 },
  { id: "life",      name: "Life",      blurb: "Something begins to want.",  color: "#ff8fb1", glyph: "🧬", tier: 3 },
  { id: "desert",    name: "Desert",    blurb: "Sand, and nothing else.",    color: "#e0b256", glyph: "🏜️", tier: 3 },

  // ---- tier 4 ----
  { id: "tree",      name: "Tree",      blurb: "A plant that kept going.",   color: "#2f7d32", glyph: "🌳", tier: 4 },
  { id: "lightning", name: "Lightning", blurb: "The storm's signature.",     color: "#fff07a", glyph: "🌩️", tier: 4 },
  { id: "animal",    name: "Animal",    blurb: "Life that decided to move.", color: "#c98b52", glyph: "🐾", tier: 4 },
  { id: "steel",     name: "Steel",     blurb: "Metal, forged harder.",      color: "#8a929b", glyph: "⚙️", tier: 4 },
  { id: "volcano",   name: "Volcano",   blurb: "A mountain with opinions.",  color: "#a8321b", glyph: "🌋", tier: 4 },

  // ---- tier 5 ----
  { id: "human",  name: "Human",  blurb: "An animal that asks why.",   color: "#f0c39b", glyph: "🧍", tier: 5 },
  { id: "wood",   name: "Wood",   blurb: "A tree, made useful.",       color: "#9c6b3f", glyph: "🪵", tier: 5 },
  { id: "coal",   name: "Coal",   blurb: "A forest's long memory.",    color: "#2b2b2b", glyph: "🪨", tier: 5 },
  { id: "bird",   name: "Bird",   blurb: "An animal that beat the sky.", color: "#79c7f2", glyph: "🐦", tier: 5 },

  // ---- tier 6: the far end ----
  { id: "tool",      name: "Tool",      blurb: "A human's borrowed hand.",    color: "#a4712f", glyph: "🔨", tier: 6 },
  { id: "house",     name: "House",     blurb: "Somewhere to come back to.",  color: "#c26e4a", glyph: "🏠", tier: 6 },
  { id: "diamond",   name: "Diamond",   blurb: "Coal that survived.",         color: "#a8f0ff", glyph: "💎", tier: 6 },
  { id: "boat",      name: "Boat",      blurb: "Wood that refused to sink.",  color: "#8a5a2b", glyph: "⛵", tier: 6 },
  { id: "phoenix",   name: "Phoenix",   blurb: "A bird that refuses to end.", color: "#ff9d2e", glyph: "🕊️", tier: 6 },
  { id: "dragon",    name: "Dragon",    blurb: "Every element, angry at once.", color: "#c2352e", glyph: "🐉", tier: 6 },
];

export const BASE_ELEMENTS = ["fire", "water", "earth", "air"];

/**
 * Recipes. Key is the two ingredient ids sorted and joined with "+",
 * so order never matters at lookup time.
 */
const RAW_RECIPES: [string, string, string][] = [
  // tier 1
  ["fire", "water", "steam"],
  ["fire", "earth", "lava"],
  ["water", "earth", "mud"],
  ["earth", "air", "dust"],

  // tier 2
  ["steam", "air", "cloud"],
  ["lava", "water", "stone"],
  ["lava", "air", "stone"],
  ["fire", "air", "energy"],
  ["stone", "air", "sand"],
  ["stone", "dust", "sand"],
  ["cloud", "water", "rain"],
  ["water", "water", "sea"],
  ["rain", "rain", "sea"],

  // tier 3
  ["mud", "energy", "plant"],
  ["mud", "rain", "plant"],
  ["cloud", "energy", "storm"],
  ["rain", "energy", "storm"],
  ["sand", "fire", "glass"],
  ["sand", "energy", "glass"],
  ["stone", "fire", "metal"],
  ["stone", "energy", "metal"],
  ["sea", "energy", "life"],
  ["mud", "energy", "plant"],
  ["sand", "sand", "desert"],
  ["sand", "air", "desert"],

  // tier 4
  ["plant", "plant", "tree"],
  ["plant", "earth", "tree"],
  ["storm", "energy", "lightning"],
  ["cloud", "storm", "lightning"],
  ["life", "earth", "animal"],
  ["life", "mud", "animal"],
  ["metal", "fire", "steel"],
  ["metal", "energy", "steel"],
  ["lava", "stone", "volcano"],
  ["lava", "mud", "volcano"],

  // tier 5
  ["animal", "life", "human"],
  ["animal", "energy", "human"],
  ["tree", "metal", "wood"],
  ["tree", "steel", "wood"],
  ["tree", "fire", "coal"],
  ["tree", "lava", "coal"],
  ["animal", "air", "bird"],
  ["animal", "cloud", "bird"],

  // tier 6
  ["human", "metal", "tool"],
  ["human", "stone", "tool"],
  ["human", "wood", "house"],
  ["wood", "tool", "house"],
  ["coal", "energy", "diamond"],
  ["coal", "lightning", "diamond"],
  ["wood", "sea", "boat"],
  ["wood", "water", "boat"],
  ["bird", "fire", "phoenix"],
  ["bird", "lava", "phoenix"],
  ["animal", "volcano", "dragon"],
  ["phoenix", "volcano", "dragon"],
];

const byId = new Map(ELEMENTS.map((e) => [e.id, e]));

export function recipeKey(a: string, b: string): string {
  return [a, b].sort().join("+");
}

export const RECIPES: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [a, b, result] of RAW_RECIPES) {
    // Drop any recipe referencing an element that does not exist. Keeps a typo
    // from silently creating an unreachable or crashing combination.
    if (!byId.has(a) || !byId.has(b) || !byId.has(result)) continue;
    map.set(recipeKey(a, b), result);
  }
  return map;
})();

export function getElement(id: string): ElementDef {
  const el = byId.get(id);
  if (!el) throw new Error(`unknown element: ${id}`);
  return el;
}

export function combine(a: string, b: string): string | null {
  return RECIPES.get(recipeKey(a, b)) ?? null;
}

/** Every element that some recipe can actually produce, plus the bases. */
export function reachableElements(): Set<string> {
  const reachable = new Set(BASE_ELEMENTS);
  // Fixed point: keep combining what we have until nothing new appears.
  let grew = true;
  while (grew) {
    grew = false;
    const have = [...reachable];
    for (const a of have) {
      for (const b of have) {
        const result = combine(a, b);
        if (result && !reachable.has(result)) {
          reachable.add(result);
          grew = true;
        }
      }
    }
  }
  return reachable;
}

export const TOTAL_DISCOVERABLE = reachableElements().size;
