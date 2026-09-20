// Discovery state + save/load. Kept separate from rendering so the rules are
// testable without a canvas.
import { BASE_ELEMENTS, RECIPES, combine, getElement } from "./data/elements";

const SAVE_KEY = "alchemy-lab.save.v1";

export interface CombineResult {
  kind: "new" | "known" | "fail";
  /** Set for "new" and "known". */
  id?: string;
}

export class GameState {
  discovered = new Set<string>(BASE_ELEMENTS);
  /** Recipe keys the player has already performed, for the "known" vs "new" split. */
  seenRecipes = new Set<string>();

  constructor() {
    this.load();
  }

  get count(): number {
    return this.discovered.size;
  }

  /** Total the player can possibly reach — used for the progress readout. */
  get total(): number {
    const all = new Set(BASE_ELEMENTS);
    for (const out of RECIPES.values()) all.add(out);
    return all.size;
  }

  has(id: string): boolean {
    return this.discovered.has(id);
  }

  /** Discovered ids in a stable order: by tier, then name. */
  list(): string[] {
    return [...this.discovered].sort((a, b) => {
      const ea = getElement(a);
      const eb = getElement(b);
      return ea.tier - eb.tier || ea.name.localeCompare(eb.name);
    });
  }

  tryCombine(a: string, b: string): CombineResult {
    const out = combine(a, b);
    if (!out) return { kind: "fail" };

    const isNew = !this.discovered.has(out);
    this.discovered.add(out);
    if (isNew) this.save();
    return { kind: isNew ? "new" : "known", id: out };
  }

  /**
   * A combination the player can make right now that yields something new.
   * Returns the two ingredient ids, or null when everything reachable is found.
   */
  findHint(): [string, string] | null {
    const have = [...this.discovered];
    const options: [string, string][] = [];
    for (let i = 0; i < have.length; i++) {
      for (let j = i; j < have.length; j++) {
        const out = combine(have[i], have[j]);
        if (out && !this.discovered.has(out)) options.push([have[i], have[j]]);
      }
    }
    if (options.length === 0) return null;
    // Random so repeated presses suggest different next steps.
    return options[Math.floor(Math.random() * options.length)];
  }

  reset(): void {
    this.discovered = new Set(BASE_ELEMENTS);
    this.seenRecipes.clear();
    this.save();
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify([...this.discovered]));
    } catch {
      // Private browsing or blocked storage: the game still plays, it just
      // won't remember. Not worth interrupting the player over.
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const ids = JSON.parse(raw);
      if (!Array.isArray(ids)) return;
      for (const id of ids) {
        // Ignore ids that no longer exist, so an old save can't crash a new build.
        try {
          getElement(id);
          this.discovered.add(id);
        } catch {
          /* dropped */
        }
      }
    } catch {
      /* corrupt save: start fresh */
    }
  }
}
