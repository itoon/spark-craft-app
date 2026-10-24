/**
 * Built-in sounds for the Sound plugin, synthesized with Web Audio.
 *
 * No audio files: nothing to license, nothing to download, and they play the
 * same in the editor, shared/live links and the APK (even offline).
 */

export type SoundGroup = "game" | "quiz" | "ui" | "music";

export interface SoundInfo {
  id: string;
  /** Thai name shown in the picker */
  label: string;
  group: SoundGroup;
}

export const SOUND_GROUP_LABELS: Record<SoundGroup, string> = {
  quiz: "Quiz",
  game: "เกม",
  ui: "ปุ่ม / แจ้งเตือน",
  music: "เพลงพื้นหลัง",
};

export const SOUND_LIBRARY: SoundInfo[] = [
  { id: "correct", label: "ตอบถูก", group: "quiz" },
  { id: "wrong", label: "ตอบผิด", group: "quiz" },
  { id: "win", label: "ชนะ", group: "quiz" },
  { id: "lose", label: "แพ้", group: "quiz" },
  { id: "tick", label: "นาฬิกาเดิน", group: "quiz" },
  { id: "countdown", label: "นับถอยหลัง 3-2-1", group: "quiz" },
  { id: "coin", label: "เก็บเหรียญ", group: "game" },
  { id: "jump", label: "กระโดด", group: "game" },
  { id: "pop", label: "ป๊อป", group: "game" },
  { id: "laser", label: "ยิงเลเซอร์", group: "game" },
  { id: "powerup", label: "พลังเพิ่ม", group: "game" },
  { id: "hit", label: "โดนชน", group: "game" },
  { id: "explosion", label: "ระเบิด", group: "game" },
  { id: "click", label: "คลิก", group: "ui" },
  { id: "ding", label: "ติ๊ง", group: "ui" },
  { id: "whoosh", label: "วูบ", group: "ui" },
  { id: "shutter", label: "ชัตเตอร์กล้อง", group: "ui" },
  { id: "bgm-happy", label: "สนุกสนาน (วนได้)", group: "music" },
  { id: "bgm-chill", label: "สบายๆ (วนได้)", group: "music" },
];

export const DEFAULT_SOUND_ID = "coin";

export function findSound(id: string): SoundInfo | undefined {
  return SOUND_LIBRARY.find((sound) => sound.id === id);
}

// ── Synthesis ──────────────────────────────────────────────────────────────

interface Voice {
  ctx: AudioContext;
  out: AudioNode;
  sources: AudioScheduledSourceNode[];
}

type Wave = OscillatorType;

/** One note: start → end pitch with a quick attack and exponential decay. */
function tone(
  v: Voice,
  at: number,
  { freq, to = freq, dur, type = "square", gain = 0.25, attack = 0.005 }: {
    freq: number;
    to?: number;
    dur: number;
    type?: Wave;
    gain?: number;
    attack?: number;
  },
) {
  const osc = v.ctx.createOscillator();
  const amp = v.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), at + dur);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(amp).connect(v.out);
  osc.start(at);
  osc.stop(at + dur + 0.02);
  v.sources.push(osc);
}

let noiseBuffer: AudioBuffer | null = null;

/** Filtered white-noise burst (whoosh, shutter, explosion). */
function noise(
  v: Voice,
  at: number,
  { dur, gain = 0.3, filter = "lowpass", from = 4000, to = from, q = 0.8 }: {
    dur: number;
    gain?: number;
    filter?: BiquadFilterType;
    from?: number;
    to?: number;
    q?: number;
  },
) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== v.ctx.sampleRate) {
    noiseBuffer = v.ctx.createBuffer(1, v.ctx.sampleRate, v.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = v.ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const bq = v.ctx.createBiquadFilter();
  bq.type = filter;
  bq.Q.value = q;
  bq.frequency.setValueAtTime(from, at);
  if (to !== from) bq.frequency.exponentialRampToValueAtTime(Math.max(to, 1), at + dur);
  const amp = v.ctx.createGain();
  amp.gain.setValueAtTime(gain, at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(bq).connect(amp).connect(v.out);
  src.start(at);
  src.stop(at + dur + 0.02);
  v.sources.push(src);
}

const NOTE = (semitonesFromA4: number) => 440 * 2 ** (semitonesFromA4 / 12);
// C major-ish helpers (semitones from A4)
const C5 = 3, D5 = 5, E5 = 7, F5 = 8, G5 = 10, A5 = 12, B5 = 14, C6 = 15, E6 = 19, G6 = 22;
const C4 = -9, E4 = -5, G4 = -2, A4 = 0, F4 = -4, D4 = -7;

/** Plays a melody of [semitone | null, beats] steps; returns its length in seconds. */
function melody(v: Voice, at: number, steps: [number | null, number][], beat: number, type: Wave, gain: number) {
  let t = at;
  for (const [note, beats] of steps) {
    if (note !== null) tone(v, t, { freq: NOTE(note), dur: beats * beat * 0.95, type, gain, attack: 0.01 });
    t += beats * beat;
  }
  return t - at;
}

/** Schedules the sound on `v` starting at `at`; returns its length in seconds. */
const RECIPES: Record<string, (v: Voice, at: number) => number> = {
  correct(v, at) {
    tone(v, at, { freq: NOTE(E5), dur: 0.12, type: "triangle", gain: 0.35 });
    tone(v, at + 0.1, { freq: NOTE(A5), dur: 0.28, type: "triangle", gain: 0.35 });
    return 0.4;
  },
  wrong(v, at) {
    tone(v, at, { freq: 196, to: 160, dur: 0.22, type: "sawtooth", gain: 0.18 });
    tone(v, at + 0.2, { freq: 160, to: 110, dur: 0.32, type: "sawtooth", gain: 0.18 });
    return 0.55;
  },
  win(v, at) {
    const len = melody(v, at, [[C5, 1], [E5, 1], [G5, 1], [C6, 3]], 0.11, "square", 0.16);
    tone(v, at + 0.33, { freq: NOTE(E6), dur: 0.45, type: "triangle", gain: 0.12 });
    return len;
  },
  lose(v, at) {
    return melody(v, at, [[G4, 1.5], [F4 + 1, 1.5], [F4, 1.5], [E4, 4]], 0.13, "triangle", 0.3);
  },
  tick(v, at) {
    tone(v, at, { freq: 1800, dur: 0.04, type: "square", gain: 0.12, attack: 0.001 });
    return 0.06;
  },
  countdown(v, at) {
    for (let i = 0; i < 3; i++) tone(v, at + i, { freq: 660, dur: 0.18, type: "square", gain: 0.16 });
    tone(v, at + 3, { freq: 1320, dur: 0.5, type: "square", gain: 0.16 });
    return 3.55;
  },
  coin(v, at) {
    tone(v, at, { freq: NOTE(B5), dur: 0.07, type: "square", gain: 0.16 });
    tone(v, at + 0.07, { freq: NOTE(E6), dur: 0.32, type: "square", gain: 0.16 });
    return 0.4;
  },
  jump(v, at) {
    tone(v, at, { freq: 220, to: 660, dur: 0.22, type: "square", gain: 0.14 });
    return 0.25;
  },
  pop(v, at) {
    tone(v, at, { freq: 900, to: 300, dur: 0.08, type: "sine", gain: 0.45, attack: 0.002 });
    return 0.1;
  },
  laser(v, at) {
    tone(v, at, { freq: 1600, to: 180, dur: 0.25, type: "sawtooth", gain: 0.14 });
    return 0.28;
  },
  powerup(v, at) {
    for (let i = 0; i < 6; i++) {
      tone(v, at + i * 0.06, { freq: NOTE(C5 + i * 2), dur: 0.08, type: "square", gain: 0.12 });
    }
    tone(v, at + 0.36, { freq: NOTE(C6), dur: 0.3, type: "square", gain: 0.12 });
    return 0.68;
  },
  hit(v, at) {
    tone(v, at, { freq: 180, to: 60, dur: 0.18, type: "square", gain: 0.25 });
    noise(v, at, { dur: 0.1, gain: 0.25, from: 1200 });
    return 0.2;
  },
  explosion(v, at) {
    noise(v, at, { dur: 0.9, gain: 0.55, from: 1800, to: 80 });
    tone(v, at, { freq: 90, to: 35, dur: 0.6, type: "sine", gain: 0.5 });
    return 0.92;
  },
  click(v, at) {
    tone(v, at, { freq: 1200, to: 800, dur: 0.03, type: "square", gain: 0.12, attack: 0.001 });
    return 0.04;
  },
  ding(v, at) {
    tone(v, at, { freq: NOTE(E6), dur: 0.9, type: "sine", gain: 0.3, attack: 0.003 });
    tone(v, at, { freq: NOTE(E6) * 2.01, dur: 0.5, type: "sine", gain: 0.08, attack: 0.003 });
    return 0.92;
  },
  whoosh(v, at) {
    noise(v, at, { dur: 0.45, gain: 0.35, filter: "bandpass", from: 300, to: 3000, q: 1.2 });
    return 0.47;
  },
  shutter(v, at) {
    noise(v, at, { dur: 0.05, gain: 0.5, filter: "highpass", from: 2500 });
    noise(v, at + 0.08, { dur: 0.06, gain: 0.4, filter: "highpass", from: 2000 });
    return 0.16;
  },
  "bgm-happy"(v, at) {
    const beat = 0.18;
    const lead: [number | null, number][] = [
      [C5, 1], [E5, 1], [G5, 1], [E5, 1], [F5, 1], [A5, 1], [G5, 2],
      [E5, 1], [G5, 1], [C6, 1], [G5, 1], [F5, 1], [D5, 1], [C5, 2],
    ];
    const bass: [number | null, number][] = [
      [C4, 2], [G4 - 12, 2], [F4, 2], [C4, 2], [A4 - 12, 2], [E4, 2], [G4 - 12, 2], [C4, 2],
    ];
    melody(v, at, bass, beat, "triangle", 0.18);
    return melody(v, at, lead, beat, "square", 0.07);
  },
  "bgm-chill"(v, at) {
    const beat = 0.32;
    const chords: [number, number, number][] = [
      [C4, E4, G4], [A4 - 12, C4, E4], [F4, A4 - 12 + 12, C5 - 12], [G4 - 12, D4, G4],
    ];
    chords.forEach((notes, i) => {
      for (const n of notes) tone(v, at + i * beat * 4, { freq: NOTE(n), dur: beat * 4, type: "sine", gain: 0.07, attack: 0.25 });
    });
    melody(v, at, [[E5, 2], [G5, 2], [C5, 4], [E5, 2], [D5, 2], [C5, 4]], beat, "triangle", 0.09);
    return beat * 16;
  },
};

/** True when there is a recipe that can play this id */
export function hasSoundRecipe(id: string): boolean {
  return id in RECIPES;
}

// ── Player ─────────────────────────────────────────────────────────────────

export interface SoundHandle {
  stop(): void;
  /** Resolves when the sound finishes on its own (not when stopped). */
  ended: Promise<void>;
}

export interface SoundOptions {
  /** 0–100 */
  volume?: number;
  loop?: boolean;
}

// ── App sounds: one entry per Sound element, shared by every page ──────────

interface Playing {
  handle: SoundHandle;
  soundId: string;
  loop: boolean;
}

const playingByElement = new Map<string, Set<Playing>>();

/**
 * Plays the sound for a Sound element (`key` = its id).
 * - A looping sound that is already playing keeps going (so `bgm.play()` in
 *   every page's onShow doesn't restart the music).
 * - Short sounds may overlap (fast taps stay snappy).
 */
export function playElementSound(key: string, soundId: string, options: SoundOptions = {}): SoundHandle | null {
  const entries = playingByElement.get(key) ?? new Set<Playing>();
  playingByElement.set(key, entries);
  if (options.loop) {
    for (const entry of entries) {
      if (entry.loop && entry.soundId === soundId) return entry.handle;
    }
  }
  // A new loop replaces whatever this element was playing
  if (options.loop) stopElementSound(key);
  const handle = playSound(soundId, options);
  if (!handle) return null;
  const entry: Playing = { handle, soundId, loop: Boolean(options.loop) };
  entries.add(entry);
  playingByElement.set(key, entries);
  handle.ended.then(() => entries.delete(entry));
  return handle;
}

export function stopElementSound(key: string) {
  const entries = playingByElement.get(key);
  if (!entries) return;
  for (const entry of entries) entry.handle.stop();
  entries.clear();
}

/** Silence everything (leaving Run, restarting, closing the app) */
export function stopAllSounds() {
  for (const key of playingByElement.keys()) stopElementSound(key);
  playingByElement.clear();
}

let sharedContext: AudioContext | null = null;
let unlockListening = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  // Phones keep audio locked until the first tap; resume on it
  if (!unlockListening) {
    unlockListening = true;
    const unlock = () => void sharedContext?.resume();
    for (const type of ["pointerdown", "touchend", "keydown"]) {
      window.addEventListener(type, unlock, { capture: true, passive: true });
    }
  }
  if (sharedContext.state === "suspended") void sharedContext.resume();
  return sharedContext;
}

/**
 * Plays a built-in sound. Returns null when audio isn't available
 * (server, tests) or the id is unknown.
 */
export function playSound(id: string, { volume = 80, loop = false }: SoundOptions = {}): SoundHandle | null {
  const recipe = RECIPES[id];
  const ctx = getContext();
  if (!recipe || !ctx) return null;

  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume / 100));
  master.connect(ctx.destination);

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const voice: Voice = { ctx, out: master, sources: [] };
  let finish: () => void = () => undefined;
  const ended = new Promise<void>((resolve) => {
    finish = resolve;
  });

  const schedule = (at: number) => {
    const length = recipe(voice, at);
    const msUntilEnd = (at + length - ctx.currentTime) * 1000;
    timer = setTimeout(() => {
      if (stopped) return;
      if (loop) {
        voice.sources = [];
        schedule(Math.max(ctx.currentTime, at + length));
      } else {
        master.disconnect();
        finish();
      }
    }, Math.max(0, msUntilEnd));
  };
  schedule(ctx.currentTime + 0.01);

  return {
    ended,
    stop() {
      if (stopped) return;
      stopped = true;
      if (timer) clearTimeout(timer);
      const now = ctx.currentTime;
      // Short fade so stopping never clicks
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.04);
      for (const source of voice.sources) {
        try {
          source.stop(now + 0.05);
        } catch {
          // already stopped
        }
      }
      setTimeout(() => master.disconnect(), 80);
    },
  };
}
