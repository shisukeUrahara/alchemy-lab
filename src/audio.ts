// All sound is synthesized in the browser with the Web Audio API — no audio
// files, so nothing to download and nothing to generate.
//
// Browsers block audio until the player interacts with the page, so the context
// is created lazily on the first gesture and every call is a no-op before that.

type Voice = "discovery" | "merge" | "fail" | "place";

const MASTER_VOLUME = 0.22;
const MUSIC_VOLUME = 0.055;
const MUTE_KEY = "alchemy-lab.muted.v1";

/** A minor pentatonic scale in Hz — any two notes sound fine together. */
const SCALE = [220.0, 261.63, 293.66, 349.23, 392.0, 440.0, 523.25, 587.33];

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | undefined;
  private musicStep = 0;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      /* storage blocked: default to unmuted */
    }
  }

  /**
   * Must be called from inside a real user gesture (click/keydown), otherwise
   * the browser leaves the context suspended and nothing is ever heard.
   */
  unlock(): void {
    if (this.ctx) {
      // Chrome suspends the context when a tab is backgrounded.
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return; // No Web Audio: the game stays silent but fully playable.

    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = MUSIC_VOLUME;
    this.musicGain.connect(this.master);

    this.startMusic();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* not fatal */
    }
    if (this.master && this.ctx) {
      // Ramp instead of jumping, which would click. linearRampToValueAtTime
      // (not setTargetAtTime) so muting actually reaches exactly 0 — an
      // exponential approach leaves a faint audible tail forever.
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOLUME, now + 0.08);
    }
  }

  /** One short synthesized tone. */
  private tone(
    freq: number,
    startOffset: number,
    duration: number,
    type: OscillatorType,
    peak: number,
    dest: AudioNode
  ): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + startOffset;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);

    // Short attack, exponential decay — a plucked/struck shape rather than a beep.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  play(voice: Voice): void {
    if (!this.ctx || !this.master || this.muted) return;

    switch (voice) {
      case "discovery": {
        // Rising arpeggio: the reward sound.
        const notes = [SCALE[2], SCALE[4], SCALE[6], SCALE[7]];
        notes.forEach((f, i) => this.tone(f, i * 0.075, 0.42, "triangle", 0.5, this.master!));
        break;
      }
      case "merge": {
        // Already-known result: quieter, two notes, no fanfare.
        this.tone(SCALE[3], 0, 0.22, "triangle", 0.32, this.master);
        this.tone(SCALE[5], 0.06, 0.26, "triangle", 0.24, this.master);
        break;
      }
      case "fail": {
        // Dull descending thud.
        this.tone(150, 0, 0.16, "sine", 0.34, this.master);
        this.tone(110, 0.05, 0.2, "sine", 0.26, this.master);
        break;
      }
      case "place": {
        this.tone(SCALE[1] * 2, 0, 0.09, "sine", 0.16, this.master);
        break;
      }
    }
  }

  /**
   * Ambient background music: a slow random walk over the pentatonic scale with
   * a low drone underneath. Generative, so it never loops audibly and costs
   * nothing to ship.
   */
  private startMusic(): void {
    if (!this.ctx || !this.musicGain) return;

    // Low drone, always present.
    const drone = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    drone.type = "sine";
    drone.frequency.value = 110;
    droneGain.gain.value = 0.35;
    drone.connect(droneGain);
    droneGain.connect(this.musicGain);
    drone.start();

    const STEP_MS = 2000;
    const step = () => {
      if (!this.ctx || !this.musicGain || this.ctx.state !== "running") return;
      // Wander up and down the scale rather than jumping randomly, so
      // consecutive notes stay related.
      this.musicStep = Math.max(0, Math.min(SCALE.length - 1, this.musicStep + (Math.floor(Math.random() * 3) - 1)));
      const f = SCALE[this.musicStep];
      this.tone(f, 0, 2.6, "sine", 0.5, this.musicGain);
      // A fifth above, sometimes, for a little movement.
      if (Math.random() < 0.4) this.tone(f * 1.5, 0.35, 2.0, "sine", 0.22, this.musicGain);
    };

    step();
    this.musicTimer = window.setInterval(step, STEP_MS);
  }

  stopMusic(): void {
    window.clearInterval(this.musicTimer);
  }
}
