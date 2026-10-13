// Samples live in public/sfx. A missing file stays silent.

const FILES = {
  slap: "sfx/slap.ogg",
  shot1: "sfx/shot-1.mp3",
  shot2: "sfx/shot-2.mp3",
  shot3: "sfx/shot-3.mp3",
  tip: "sfx/tip.wav",
  pickup: "sfx/pickup.wav",
  save: "sfx/save.wav",
  poke: "sfx/poke.wav",
  blast: "sfx/blast.wav",
  glassOn: "sfx/glass-on.flac",
  glassOff: "sfx/glass-off.wav",
  goal: "sfx/goal.wav",
  cheer: "sfx/cheer.mp3",
  win: "sfx/win.wav",
  loss: "sfx/loss.wav",
  click: "sfx/click.wav",
  boost: "sfx/boost.ogg",
} as const;

type Sample = keyof typeof FILES;

export type Cue = "slap" | "shot" | "pass" | "tip" | "pickup" | "save" | "poke" | "blast" | "glassOn" | "glassOff" | "goal" | "cheer" | "win" | "loss" | "click";

const GAIN: Record<Cue | "boost", number> = {
  slap: 0.9,
  shot: 0.62,
  pass: 0.46,
  tip: 0.7,
  pickup: 0.5,
  save: 0.72,
  poke: 0.55,
  blast: 0.78,
  glassOn: 0.48,
  glassOff: 0.42,
  goal: 0.82,
  cheer: 0.58,
  win: 0.8,
  loss: 0.8,
  click: 0.85,
  boost: 0.34,
};

const COOLDOWN: Partial<Record<Cue, number>> = {
  shot: 0.08,
  pass: 0.08,
  pickup: 0.12,
  glassOff: 0.2,
  tip: 0.2,
  poke: 0.15,
  save: 0.1,
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<Sample, AudioBuffer>();
const failed = new Set<Sample>();
const lastAt = new Map<string, number>();
let boostNode: AudioBufferSourceNode | null = null;
let boostGain: GainNode | null = null;
let boostHeld = false;
let boostFade = 0;
const riding = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();
let armed = false;

function context() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function asset(path: string) {
  const base = import.meta.env.BASE_URL || "/";
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}${path.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

async function load(name: Sample) {
  if (buffers.has(name) || failed.has(name)) return buffers.get(name) ?? null;
  const audio = context();
  if (!audio) return null;
  try {
    const res = await fetch(asset(FILES[name]));
    if (!res.ok) throw new Error(String(res.status));
    const buf = await audio.decodeAudioData(await res.arrayBuffer());
    buffers.set(name, buf);
    return buf;
  } catch {
    failed.add(name);
    return null;
  }
}

function preload() {
  for (const name of Object.keys(FILES) as Sample[]) void load(name);
}

function sampleFor(cue: Cue): Sample {
  if (cue === "shot" || cue === "pass") {
    const n = 1 + Math.floor(Math.random() * 3);
    return `shot${n}` as Sample;
  }
  return cue;
}

export function play(cue: Cue, opts?: { gain?: number; delay?: number }) {
  const audio = context();
  if (!audio || !master) return;
  const wait = COOLDOWN[cue] ?? 0;
  const now = audio.currentTime;
  if (wait && now - (lastAt.get(cue) ?? -10) < wait) return;
  lastAt.set(cue, now);
  const name = sampleFor(cue);
  const start = (buf: AudioBuffer) => {
    const src = audio.createBufferSource();
    src.buffer = buf;
    if (cue === "pass") src.playbackRate.value = 1.1;
    else if (cue === "shot") src.playbackRate.value = 0.96 + Math.random() * 0.06;
    const gain = audio.createGain();
    gain.gain.value = GAIN[cue] * (opts?.gain ?? 1);
    src.connect(gain);
    gain.connect(master!);
    src.start(audio.currentTime + (opts?.delay ?? 0));
  };
  const ready = buffers.get(name);
  if (ready) start(ready);
  else void load(name);
}

export function setBoost(on: boolean) {
  const audio = context();
  if (!audio || !master) return;
  if (!on) {
    if (!boostHeld) return;
    boostHeld = false;
    if (!boostGain) return;
    const t = audio.currentTime;
    boostGain.gain.cancelScheduledValues(t);
    boostGain.gain.setValueAtTime(boostGain.gain.value, t);
    boostGain.gain.linearRampToValueAtTime(0, t + 0.45);
    window.clearTimeout(boostFade);
    boostFade = window.setTimeout(() => {
      if (boostHeld || !boostNode) return;
      boostNode.stop();
      boostNode = null;
      boostGain = null;
    }, 500);
    return;
  }
  const buf = buffers.get("boost");
  if (!buf) return;
  if (boostHeld && boostNode && boostGain) return;
  window.clearTimeout(boostFade);
  if (!boostNode || !boostGain) {
    const src = audio.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = audio.createGain();
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(master);
    src.start();
    boostNode = src;
    boostGain = gain;
  }
  const t = audio.currentTime;
  boostGain.gain.cancelScheduledValues(t);
  boostGain.gain.setValueAtTime(boostGain.gain.value, t);
  boostGain.gain.linearRampToValueAtTime(GAIN.boost, t + 0.08);
  boostHeld = true;
}

/** Ride sound. Stops the moment that robot leaves the glass, instead of the rest of the clip. */
export function startGlass(id: string, gainMul = 1) {
  if (riding.has(id)) return;
  const audio = context();
  const buf = buffers.get("glassOn");
  if (!audio || !master) return;
  if (!buf) {
    void load("glassOn");
    return;
  }
  const src = audio.createBufferSource();
  src.buffer = buf;
  const gain = audio.createGain();
  gain.gain.value = GAIN.glassOn * gainMul;
  src.connect(gain);
  gain.connect(master);
  src.start();
  riding.set(id, { src, gain });
  src.onended = () => {
    if (riding.get(id)?.src === src) riding.delete(id);
  };
}

export function stopGlass(id: string) {
  const cur = riding.get(id);
  if (!cur) return;
  riding.delete(id);
  const audio = context();
  if (!audio) {
    cur.src.stop();
    return;
  }
  const t = audio.currentTime;
  cur.gain.gain.cancelScheduledValues(t);
  cur.gain.gain.setValueAtTime(cur.gain.gain.value, t);
  cur.gain.gain.linearRampToValueAtTime(0, t + 0.03);
  cur.src.stop(t + 0.035);
}

export function stopAllGlass() {
  for (const id of [...riding.keys()]) stopGlass(id);
}

/** Call once from the client. The first tap unlocks audio; buttons get the click. */
export function stopCountdown() {
  stopNode(countSrc);
  countSrc = null;
}

const MENU_TRACKS = [
  ["sfx/galaxy hockey condensed.mp3", "sfx/galaxy-hockey.mp3", "sfx/galaxy hockey.mp3"],
  ["sfx/victory rush condensed.mp3", "sfx/victory-rush.mp3", "sfx/victory rush.mp3"],
  ["sfx/ice showdown condensed.mp3", "sfx/ice-showdown.mp3", "sfx/ice showdown.mp3"],
];
const CROWD_PATHS = ["sfx/crowd ambient mp3.mp3", "sfx/crowd ambient.mp3", "sfx/crowd.mp3", "sfx/ambient.mp3"];
const COUNT_PATHS = ["sfx/3 2 1 go.mp3", "sfx/321-go.mp3", "sfx/3-2-1-go.mp3"];

const MENU_GAIN = 0.4;
const CROWD_GAIN = 0.2;

let bed: "menu" | "crowd" | "off" = "off";
let menuSrc: AudioBufferSourceNode | null = null;
let menuGain: GainNode | null = null;
let menuToken = 0;
let menuIndex = Math.floor(Math.random() * MENU_TRACKS.length);
let crowdSrc: AudioBufferSourceNode | null = null;
let crowdGain: GainNode | null = null;
let crowdToken = 0;
let countSrc: AudioBufferSourceNode | null = null;
const beds = new Map<string, AudioBuffer>();
const bedMissing = new Set<string>();

async function loadPath(path: string) {
  if (beds.has(path)) return beds.get(path) ?? null;
  if (bedMissing.has(path)) return null;
  const audio = context();
  if (!audio) return null;
  try {
    const res = await fetch(asset(path));
    if (!res.ok) throw new Error(String(res.status));
    const buf = await audio.decodeAudioData(await res.arrayBuffer());
    beds.set(path, buf);
    return buf;
  } catch {
    bedMissing.add(path);
    return null;
  }
}

async function loadFirst(paths: string[]) {
  for (const path of paths) {
    const buf = await loadPath(path);
    if (buf) return buf;
  }
  return null;
}

function stopNode(src: AudioBufferSourceNode | null) {
  if (!src) return;
  try {
    src.onended = null;
    src.stop();
  } catch {
    /* already stopped */
  }
}

function stopMenu() {
  menuToken += 1;
  stopNode(menuSrc);
  menuSrc = null;
  menuGain = null;
}

function stopCrowd() {
  crowdToken += 1;
  stopNode(crowdSrc);
  crowdSrc = null;
  crowdGain = null;
}

let menuJob: Promise<void> | null = null;
let crowdJob: Promise<void> | null = null;

async function ensureMenu() {
  if (menuSrc || menuJob || bed !== "menu") return;
  const audio = context();
  if (!audio || !master || audio.state === "suspended") return;
  const token = menuToken;
  let started = false;
  menuJob = (async () => {
    for (let n = 0; n < MENU_TRACKS.length; n += 1) {
      const index = (menuIndex + n) % MENU_TRACKS.length;
      const buf = await loadFirst(MENU_TRACKS[index]);
      if (token !== menuToken || bed !== "menu" || !master) return;
      if (!buf) continue;
      menuIndex = index;
      const src = audio.createBufferSource();
      src.buffer = buf;
      const gain = audio.createGain();
      gain.gain.value = MENU_GAIN;
      src.connect(gain);
      gain.connect(master);
      src.onended = () => {
        if (menuSrc !== src) return;
        menuSrc = null;
        menuGain = null;
        menuIndex = (index + 1) % MENU_TRACKS.length;
        if (bed === "menu") void ensureMenu();
      };
      src.start();
      menuSrc = src;
      menuGain = gain;
      started = true;
      return;
    }
  })().finally(() => {
    menuJob = null;
    if (!started && bed === "menu" && token !== menuToken) void ensureMenu();
  });
  await menuJob;
}

async function ensureCrowd() {
  if (crowdSrc || crowdJob || bed !== "crowd") return;
  const audio = context();
  if (!audio || !master || audio.state === "suspended") return;
  const token = crowdToken;
  let started = false;
  crowdJob = (async () => {
    const found: AudioBuffer[] = [];
    for (const path of CROWD_PATHS) {
      const buf = await loadPath(path);
      if (buf) found.push(buf);
    }
    if (token !== crowdToken || bed !== "crowd" || !master || !found.length) return;
    const src = audio.createBufferSource();
    src.buffer = found[Math.floor(Math.random() * found.length)];
    src.loop = true;
    const gain = audio.createGain();
    gain.gain.value = CROWD_GAIN;
    src.connect(gain);
    gain.connect(master);
    src.start();
    crowdSrc = src;
    crowdGain = gain;
    started = true;
  })().finally(() => {
    crowdJob = null;
    if (!started && bed === "crowd" && token !== crowdToken) void ensureCrowd();
  });
  await crowdJob;
}

function syncBed() {
  const audio = context();
  if (!audio || !master) return;
  if (bed !== "menu") stopMenu();
  if (bed !== "crowd") stopCrowd();
  const run = () => {
    if (bed === "menu") void ensureMenu();
    if (bed === "crowd") void ensureCrowd();
  };
  if (audio.state === "suspended") void audio.resume().then(run);
  else run();
}

/** Menu music outside a match. Crowd bed during one. */
export function setBed(next: "menu" | "crowd" | "off") {
  if (bed === next) {
    syncBed();
    return;
  }
  bed = next;
  syncBed();
}

/** Starts the 3-2-1-go sting. Calls onStart at the moment audio begins, so the numerals can match it. */
export function playCountdown(onStart?: () => void) {
  const audio = context();
  if (!audio || !master) {
    onStart?.();
    return;
  }
  const run = () => {
    const cached = COUNT_PATHS.map((path) => beds.get(path)).find(Boolean) ?? null;
    const begin = (buf: AudioBuffer | null) => {
      if (buf && master && audio) {
        stopNode(countSrc);
        const src = audio.createBufferSource();
        src.buffer = buf;
        const gain = audio.createGain();
        gain.gain.value = 0.9;
        src.connect(gain);
        gain.connect(master);
        src.start();
        countSrc = src;
        src.onended = () => {
          if (countSrc === src) countSrc = null;
        };
        if (crowdGain) {
          const t = audio.currentTime;
          crowdGain.gain.cancelScheduledValues(t);
          crowdGain.gain.setValueAtTime(crowdGain.gain.value, t);
          crowdGain.gain.linearRampToValueAtTime(CROWD_GAIN * 0.35, t + 0.05);
          crowdGain.gain.setValueAtTime(CROWD_GAIN * 0.35, t + 4);
          crowdGain.gain.linearRampToValueAtTime(CROWD_GAIN, t + 4.5);
        }
      }
      onStart?.();
    };
    if (cached) begin(cached);
    else void loadFirst(COUNT_PATHS).then(begin);
  };
  if (audio.state === "suspended") void audio.resume().then(run);
  else run();
}

/** Call once from the client. The first tap unlocks audio; buttons get the click. */
export function armSfx() {
  if (armed || typeof window === "undefined") return () => {};
  armed = true;
  const wake = (e: Event) => {
    context();
    preload();
    void loadFirst(COUNT_PATHS);
    for (const paths of MENU_TRACKS) void loadFirst(paths);
    void loadFirst(CROWD_PATHS);
    syncBed();
    const node = e.target instanceof Element ? e.target : null;
    if (node?.closest("button, a, [role='button']")) play("click");
  };
  const onKey = () => {
    context();
    preload();
    void loadFirst(COUNT_PATHS);
    for (const paths of MENU_TRACKS) void loadFirst(paths);
    void loadFirst(CROWD_PATHS);
    syncBed();
  };
  window.addEventListener("pointerdown", wake, true);
  window.addEventListener("keydown", onKey);
  return () => {
    window.removeEventListener("pointerdown", wake, true);
    window.removeEventListener("keydown", onKey);
    armed = false;
  };
}
