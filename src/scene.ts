// Babylon.js layer: an orthographic 2D workbench where element tokens are
// dragged, dropped and merged. All gameplay rules live in state.ts.
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Rendering/edgesRenderer";

import { getElement } from "./data/elements";

/** World half-height of the orthographic camera; width follows the aspect. */
const VIEW_HEIGHT = 10;
const TOKEN_SIZE = 1.9;

export interface Token {
  mesh: Mesh;
  elementId: string;
}

export interface SceneHooks {
  /** Two tokens overlapped. Return the merged element id, or null to bounce apart. */
  onMerge(a: Token, b: Token): string | null;
  onPickUp(t: Token): void;
}

export class Workbench {
  readonly engine: Engine;
  readonly scene: Scene;
  private camera: FreeCamera;
  private tokens: Token[] = [];
  private dragging: Token | null = null;
  private spriteCache = new Map<string, Texture>();
  /** Set once the first frame with content has rendered — capture waits on this. */
  ready = false;

  constructor(private canvas: HTMLCanvasElement, private hooks: SceneHooks) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.05, 0.05, 0.09, 1);

    this.camera = new FreeCamera("cam", new Vector3(0, 0, -20), this.scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.mode = 1; // ORTHOGRAPHIC_CAMERA
    this.applyOrtho();

    const light = new HemisphericLight("light", new Vector3(0, 0, -1), this.scene);
    light.intensity = 1.0;
    light.groundColor = new Color3(1, 1, 1);

    this.attachPointer();
    window.addEventListener("resize", () => {
      this.engine.resize();
      this.applyOrtho();
    });

    this.engine.runRenderLoop(() => {
      this.scene.render();
      if (!this.ready && this.scene.getEngine().frameId > 2) this.ready = true;
    });
  }

  private applyOrtho(): void {
    const aspect = this.engine.getAspectRatio(this.camera) || 1;
    this.camera.orthoTop = VIEW_HEIGHT;
    this.camera.orthoBottom = -VIEW_HEIGHT;
    this.camera.orthoLeft = -VIEW_HEIGHT * aspect;
    this.camera.orthoRight = VIEW_HEIGHT * aspect;
  }

  /** World bounds of the visible area, so tokens can be clamped inside it. */
  get bounds() {
    return {
      left: this.camera.orthoLeft ?? -10,
      right: this.camera.orthoRight ?? 10,
      top: this.camera.orthoTop ?? 10,
      bottom: this.camera.orthoBottom ?? -10,
    };
  }

  /**
   * Texture for an element: the generated sprite if it exists, otherwise a
   * drawn fallback (glyph on a tinted disc) so the game is fully playable
   * before any art is generated.
   */
  private textureFor(elementId: string): Texture {
    const cached = this.spriteCache.get(elementId);
    if (cached) return cached;

    const def = getElement(elementId);
    const size = 256;
    const dt = new DynamicTexture(`tex-${elementId}`, { width: size, height: size }, this.scene, true);
    dt.hasAlpha = true;
    const ctx = dt.getContext() as CanvasRenderingContext2D;

    const drawFallback = () => {
      ctx.clearRect(0, 0, size, size);
      const r = size * 0.42;
      const grad = ctx.createRadialGradient(size * 0.42, size * 0.38, r * 0.15, size / 2, size / 2, r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.35, def.color);
      grad.addColorStop(1, shade(def.color, -0.45));
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = size * 0.035;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.stroke();
      ctx.font = `${Math.round(size * 0.42)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(def.glyph, size / 2, size / 2 + size * 0.03);
      dt.update();
    };

    drawFallback();

    // Upgrade to the generated sprite if one is present. Vite serves anything
    // under public/ at the root, so a missing file is a 404 we simply ignore.
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      // Fit the sprite inside the square without stretching it.
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      dt.update();
    };
    img.onerror = () => {
      /* no sprite yet: the fallback stays */
    };
    img.src = `sprites/${elementId}.png`;

    this.spriteCache.set(elementId, dt as unknown as Texture);
    return dt as unknown as Texture;
  }

  spawn(elementId: string, x: number, y: number): Token {
    const mesh = MeshBuilder.CreatePlane(`token-${elementId}-${this.tokens.length}`, { size: TOKEN_SIZE }, this.scene);
    mesh.position.set(x, y, 0);

    const mat = new StandardMaterial(`mat-${elementId}-${this.tokens.length}`, this.scene);
    mat.diffuseTexture = this.textureFor(elementId);
    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mesh.material = mat;

    const token: Token = { mesh, elementId };
    this.tokens.push(token);
    return token;
  }

  /**
   * A free spot near the middle of the board. Purely random placement stacks
   * tokens on top of each other, which reads as one token and makes them
   * impossible to pick apart — so walk outwards until nothing is in the way.
   */
  findFreeSpot(): { x: number; y: number } {
    const b = this.bounds;
    const half = TOKEN_SIZE / 2;
    const maxX = b.right - half;
    const maxY = b.top - half;
    const clear = (x: number, y: number) =>
      this.tokens.every((t) => Math.hypot(t.mesh.position.x - x, t.mesh.position.y - y) > TOKEN_SIZE * 1.15);

    for (let attempt = 0; attempt < 80; attempt++) {
      // Grow the search radius as attempts fail, so a busy board spreads out.
      const spread = 0.25 + (attempt / 80) * 0.7;
      const x = (Math.random() * 2 - 1) * maxX * spread;
      const y = (Math.random() * 2 - 1) * maxY * spread;
      if (clear(x, y)) return { x, y };
    }
    // Board is genuinely full: fall back to anywhere rather than hanging.
    return { x: (Math.random() * 2 - 1) * maxX * 0.8, y: (Math.random() * 2 - 1) * maxY * 0.8 };
  }

  remove(token: Token): void {
    this.tokens = this.tokens.filter((t) => t !== token);
    token.mesh.material?.dispose();
    token.mesh.dispose();
  }

  clearTokens(): void {
    for (const t of [...this.tokens]) this.remove(t);
  }

  get tokenCount(): number {
    return this.tokens.length;
  }

  /** Token positions in page pixels, for automated playtests. */
  debugTokenScreenPositions(): { id: string; x: number; y: number }[] {
    const rect = this.canvas.getBoundingClientRect();
    const { left, right, top, bottom } = this.bounds;
    return this.tokens.map((t) => ({
      id: t.elementId,
      x: rect.left + ((t.mesh.position.x - left) / (right - left)) * rect.width,
      y: rect.top + ((top - t.mesh.position.y) / (top - bottom)) * rect.height,
    }));
  }

  /** Pointer position on the z=0 plane, in world units. */
  private pointerWorld(): Vector3 {
    const { left, right, top, bottom } = this.bounds;
    const nx = this.scene.pointerX / this.engine.getRenderWidth();
    const ny = this.scene.pointerY / this.engine.getRenderHeight();
    return new Vector3(left + nx * (right - left), top - ny * (top - bottom), 0);
  }

  private tokenAt(p: Vector3): Token | null {
    // Topmost first: later tokens render over earlier ones.
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const t = this.tokens[i];
      const d = Math.hypot(t.mesh.position.x - p.x, t.mesh.position.y - p.y);
      if (d < TOKEN_SIZE * 0.55) return t;
    }
    return null;
  }

  private attachPointer(): void {
    const down = () => {
      const p = this.pointerWorld();
      const hit = this.tokenAt(p);
      if (!hit) return;
      this.dragging = hit;
      // Bring to front so the dragged token draws above the rest.
      this.tokens = this.tokens.filter((t) => t !== hit);
      this.tokens.push(hit);
      hit.mesh.position.z = -0.1;
      this.hooks.onPickUp(hit);
    };

    const move = () => {
      if (!this.dragging) return;
      const p = this.pointerWorld();
      const b = this.bounds;
      const half = TOKEN_SIZE / 2;
      this.dragging.mesh.position.x = clamp(p.x, b.left + half, b.right - half);
      this.dragging.mesh.position.y = clamp(p.y, b.bottom + half, b.top - half);
    };

    const up = () => {
      const held = this.dragging;
      this.dragging = null;
      if (!held) return;
      held.mesh.position.z = 0;

      // Merge with whatever it was dropped on top of.
      const target = this.tokens.find(
        (t) =>
          t !== held &&
          Math.hypot(t.mesh.position.x - held.mesh.position.x, t.mesh.position.y - held.mesh.position.y) <
            TOKEN_SIZE * 0.8
      );
      if (!target) return;

      const resultId = this.hooks.onMerge(held, target);
      if (!resultId) {
        // Nothing combines: nudge them apart so the player sees the rejection.
        held.mesh.position.x += TOKEN_SIZE * 0.9;
        return;
      }

      const x = (held.mesh.position.x + target.mesh.position.x) / 2;
      const y = (held.mesh.position.y + target.mesh.position.y) / 2;
      this.remove(held);
      this.remove(target);
      this.spawn(resultId, x, y);
    };

    this.canvas.addEventListener("pointerdown", down);
    this.canvas.addEventListener("pointermove", move);
    this.canvas.addEventListener("pointerup", up);
    this.canvas.addEventListener("pointerleave", up);
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(Math.min(255, Math.max(0, c + 255 * amount)))
  );
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}
