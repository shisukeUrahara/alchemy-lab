// Self-check for the element tree. Run: npm run check
// Fails loudly if a recipe points at a typo, or an element can never be reached.
import { ELEMENTS, RECIPES, BASE_ELEMENTS, combine, reachableElements, recipeKey } from "./elements";

const ids = new Set(ELEMENTS.map((e) => e.id));
const problems: string[] = [];

// 1. No duplicate ids.
if (ids.size !== ELEMENTS.length) problems.push("duplicate element id in ELEMENTS");

// 2. Every recipe output is a real element.
for (const [key, out] of RECIPES) {
  if (!ids.has(out)) problems.push(`recipe ${key} produces unknown element "${out}"`);
  for (const part of key.split("+")) {
    if (!ids.has(part)) problems.push(`recipe ${key} uses unknown element "${part}"`);
  }
}

// 3. Order does not matter.
if (combine("fire", "water") !== combine("water", "fire")) problems.push("combine is order-dependent");
if (recipeKey("a", "b") !== recipeKey("b", "a")) problems.push("recipeKey is order-dependent");

// 4. Bases exist and are not craftable (you start with them).
for (const b of BASE_ELEMENTS) {
  if (!ids.has(b)) problems.push(`base element "${b}" is missing from ELEMENTS`);
}
for (const out of RECIPES.values()) {
  if (BASE_ELEMENTS.includes(out)) problems.push(`base element "${out}" should not be a recipe output`);
}

// 5. Every element is actually reachable from the four bases. An unreachable
//    element is dead content: it shows in the count but can never be found.
const reachable = reachableElements();
for (const e of ELEMENTS) {
  if (!reachable.has(e.id)) problems.push(`"${e.id}" can never be discovered from the base elements`);
}

// 6. Known-good combinations still work.
const expected: [string, string, string][] = [
  ["fire", "water", "steam"],
  ["water", "fire", "steam"],
  ["fire", "earth", "lava"],
  ["steam", "air", "cloud"],
  ["lava", "water", "stone"],
];
for (const [a, b, want] of expected) {
  const got = combine(a, b);
  if (got !== want) problems.push(`combine(${a}, ${b}) = ${got}, expected ${want}`);
}

// 7. A nonsense pair yields nothing rather than throwing.
if (combine("fire", "nonsense-element") !== null) problems.push("unknown pair should combine to null");

if (problems.length > 0) {
  console.error("element tree FAILED:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

console.log(`element tree OK — ${ELEMENTS.length} elements, ${RECIPES.size} recipes, all reachable`);
