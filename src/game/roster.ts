export type Perk = "bank" | "sticky" | "afterburner" | "glue" | "heavy" | "pickup" | "touch";

export type SkaterRatings = {
  speed: number;
  agility: number;
  shot: number;
  attack: number;
  defense: number;
  handling: number;
  toughness: number;
};

export type GoalieRatings = {
  speed: number;
  agility: number;
  iq: number;
  rebound: number;
  composure: number;
  poke: number;
};

export type Styles = {
  aggressive: number;
  shooter: number;
  wide: number;
  physical: number;
};

type CardBase = {
  id: string;
  name: string;
  overall: number;
  styles: Styles;
  perks: Perk[];
  hue: number;
  visor: number;
  antenna: number;
};

export type SkaterCard = CardBase & { kind: "skater"; ratings: SkaterRatings };
export type GoalieCard = CardBase & { kind: "goalie"; ratings: GoalieRatings };
export type PlayerCard = SkaterCard | GoalieCard;

export type TeamShape = {
  push: number;
  share: number;
  width: number;
  heat: number;
};

export type TeamHabits = {
  bounce: number;
  earlyShot: number;
  crash: number;
  patient: number;
  risk: number;
};

export type Kit = {
  primary: number;
  secondary: number;
  accent: number;
  mark?: number;
  neutral?: Partial<Record<"primary" | "secondary" | "accent", number>>;
};

export type KitSlot = "primary" | "secondary" | "accent";

export function kitColor(hue: number, saturation = 72, light = 54) {
  return `hsl(${Math.round(hue)} ${saturation}% ${light}%)`;
}

export function slotInk(kit: Kit, slot: KitSlot) {
  const ink = kit.neutral?.[slot];
  return typeof ink === "number" ? ink : null;
}

export function kitPaint(kit: Kit, slot: KitSlot, saturation = 72, light = 54) {
  const ink = slotInk(kit, slot);
  if (ink !== null) {
    const sat = ink < 12 || ink > 92 ? 0 : 7;
    return `hsl(220 ${sat}% ${ink}%)`;
  }
  return kitColor(kit[slot], saturation, light);
}

export function kitTone(kit: Kit, slot: KitSlot, alpha = 1, saturation = 70, light = 55) {
  const ink = slotInk(kit, slot);
  if (ink !== null) {
    const blended = Math.max(4, Math.min(96, Math.round(light * 0.45 + ink * 0.55)));
    const sat = ink < 14 || ink > 90 ? 0 : 8;
    return `hsla(220, ${sat}%, ${blended}%, ${alpha})`;
  }
  return `hsla(${Math.round(kit[slot])}, ${saturation}%, ${light}%, ${alpha})`;
}

export function slotsClash(a: Kit, aSlot: KitSlot, b: Kit, bSlot: KitSlot) {
  const left = slotInk(a, aSlot);
  const right = slotInk(b, bSlot);
  if (left !== null && right !== null) return Math.abs(left - right) < 20;
  if (left !== null || right !== null) return false;
  return hueGap(a[aSlot], b[bSlot]) < 36;
}

export function hueGap(a: number, b: number) {
  const gap = Math.abs(a - b) % 360;
  return Math.min(gap, 360 - gap);
}

export type FilledSide = { ice: PlayerCard[]; bench: PlayerCard[] };

export type Matchup = {
  home: FilledSide;
  away: FilledSide;
  homeHabits: TeamHabits;
  awayHabits: TeamHabits;
  homeHue?: number;
  awayHue?: number;
  homeTag?: string;
  awayTag?: string;
  homeName?: string;
  awayName?: string;
  homeInk?: number | null;
  awayInk?: number | null;
  homeKit?: Kit;
  awayKit?: Kit;
  rinkKit?: Kit;
};

export const TEAM_HUE = { home: 191, away: 338 } as const;

export function teamColor(side: keyof typeof TEAM_HUE) {
  return `hsl(${TEAM_HUE[side]} 88% 62%)`;
}

export const PERK_LABEL: Record<Perk, string> = {
  bank: "Bank",
  sticky: "Sticky",
  afterburner: "Afterburner",
  glue: "Glue",
  heavy: "Heavy",
  pickup: "Pickup",
  touch: "Touch",
};

export const PERKS: Perk[] = ["bank", "sticky", "afterburner", "glue", "heavy", "pickup", "touch"];

const SKATER_NAMES = [
  "Vex", "Quill", "Nox", "Juno", "Kite", "Rook", "Ion", "Hex", "Lumen", "Nimbus",
  "Torque", "Wisp", "Cinder", "Halo", "Flint", "Nova", "Rift", "Sable", "Tilt", "Umbra",
  "Vesper", "Wedge", "Axle", "Drift", "Echo", "Frost", "Glint", "Hush", "Quasar", "Byte",
  "Comet", "Dagger", "Ember", "Flux", "Grit", "Hawk", "Iris", "Jolt", "Knox", "Lynx",
  "Mica", "Onyx", "Pike", "Relic", "Sol", "Thorn", "Vega", "Brine",
];

const GOALIE_NAMES = ["Vault", "Kepler", "Moor", "Nyx", "Prism", "Orb", "Sentry", "Talon", "Umber", "Warden", "Quell", "Harbor", "Cipher", "Ione", "Joss", "Beryl"];

export function overallSkater(r: SkaterRatings) {
  const score =
    r.speed * 22 +
    r.agility * 18 +
    r.shot * 16 +
    r.attack * 15 +
    r.defense * 13 +
    r.handling * 8 +
    r.toughness * 8;
  return Math.round(score / 11);
}

/** Carry limit and when the red slap window opens.
 *  Rating 5 holds 1.5s and goes red at 1.28s. Elite handling goes red early
 *  (~0.78s) and still releases by ~1.5s. Poor handling is stuck longer (~1.9s)
 *  and only turns red at the end.
 */
export function handlingWindow(handling: number) {
  const h = Math.min(11, Math.max(1, handling));
  const carryMax = 1.5 + Math.max(0, 5 - h) * 0.095;
  const redAt = Math.min(carryMax * 0.92, Math.max(0.72, 1.275 - (h - 5) * 0.082));
  return { carryMax, redAt };
}

export function overallGoalie(r: GoalieRatings) {
  const score = r.iq * 24 + r.speed * 20 + r.agility * 16 + r.composure * 14 + r.poke * 16 + r.rebound * 10;
  return Math.round(score / 11);
}

export function pace(n: number) {
  return 0.78 + (Math.min(11, Math.max(1, n)) - 1) * 0.056;
}

/** One life, unless toughness is 11 or the Heavy perk grants a second. */
export function lifeCount(card: PlayerCard) {
  if (card.kind !== "skater") return 1;
  if (card.ratings.toughness >= 11 || card.perks.includes("heavy")) return 2;
  return 1;
}

export type TeamGrades = {
  overall: number;
  offense: number;
  defense: number;
  iq: number;
};

/** Starters play. Subs are spares, in the order they come in. Reserves do not dress. */
export function slotWeight(index: number) {
  if (index <= 3) return 1;
  if (index === 4) return 0.28;
  if (index === 5) return 0.12;
  if (index === 6) return 0.05;
  return 0;
}

export function teamShape(cards: (PlayerCard | null)[]): TeamShape {
  const rows = cards
    .map((c, i) => ({ c, w: slotWeight(i) }))
    .filter((row): row is { c: SkaterCard; w: number } => !!row.c && row.c.kind === "skater");
  if (rows.length === 0) return { push: 50, share: 50, width: 50, heat: 50 };
  const avg = (pick: (c: SkaterCard) => number) => {
    const den = rows.reduce((sum, row) => sum + row.w, 0);
    return rows.reduce((sum, row) => sum + pick(row.c) * row.w, 0) / den;
  };
  return {
    push: clamp(avg((c) => c.styles.aggressive) * 0.75 + (avg((c) => c.ratings.speed) / 11) * 100 * 0.25, 0, 100),
    share: clamp((100 - avg((c) => c.styles.shooter)) * 0.7 + (avg((c) => c.ratings.attack) / 11) * 100 * 0.3, 0, 100),
    width: clamp(avg((c) => c.styles.wide), 0, 100),
    heat: clamp(avg((c) => c.styles.physical) * 0.75 + (avg((c) => c.ratings.defense) / 11) * 100 * 0.25, 0, 100),
  };
}

export function teamGrades(cards: (PlayerCard | null)[]): TeamGrades {
  const offense = grade(cards, (c) =>
    c.kind === "skater" ? c.ratings.shot * 0.45 + c.ratings.attack * 0.35 + c.ratings.speed * 0.2 : null,
  );
  const defense = grade(cards, (c) =>
    c.kind === "skater"
      ? c.ratings.defense * 0.72 + c.ratings.toughness * 0.28
      : c.ratings.rebound * 0.22 + c.ratings.composure * 0.18 + c.ratings.agility * 0.14 + c.ratings.iq * 0.16 + c.ratings.poke * 0.3,
  );
  const iq = grade(cards, (c) => (c.kind === "skater" ? c.ratings.attack * 0.6 + c.ratings.handling * 0.4 : c.ratings.iq));
  const parts = [offense, defense, iq].filter((n): n is number => n !== null);
  return {
    offense: offense ?? 0,
    defense: defense ?? 0,
    iq: iq ?? 0,
    overall: parts.length ? Math.round(parts.reduce((sum, n) => sum + n, 0) / parts.length) : 0,
  };
}

function grade(cards: (PlayerCard | null)[], score: (c: PlayerCard) => number | null) {
  let num = 0;
  let den = 0;
  cards.forEach((card, index) => {
    if (!card) return;
    const value = score(card);
    if (value === null) return;
    const weight = slotWeight(index);
    num += value * weight;
    den += weight;
  });
  if (den === 0) return null;
  return Math.round(clamp((num / den / 11) * 100, 0, 100));
}

export function styleName(shape: TeamShape, habits: TeamHabits) {
  if (shape.heat > 68 && shape.push < 58) return "Grind-leaning";
  if (shape.push > 68 && shape.share < 42) return "Rush-leaning";
  if (shape.push < 38) return "Trap-leaning";
  if (shape.share > 64 && shape.width > 55) return "Cycle-leaning";
  if (habits.earlyShot > 66 || (shape.share < 40 && shape.push > 48)) return "Bomb-leaning";
  return "Even";
}

export function habitLine(h: TeamHabits) {
  const bits = (
    [
      ["bounce passes", h.bounce],
      ["early shots", h.earlyShot],
      ["crashing the net", h.crash],
      ["patience", h.patient],
      ["risky lanes", h.risk],
    ] as const
  )
    .filter(([, n]) => n > 62)
    .map(([name]) => name);
  return bits.length ? `Likes ${bits.join(", ")}` : "No strong habit";
}

export type Lean = "attack" | "defense" | "mix" | "acrobat" | "mechanical";

export function leanOf(styles: Styles): "attack" | "defense" | "mix" {
  if (styles.aggressive >= 61) return "attack";
  if (styles.aggressive <= 39) return "defense";
  return "mix";
}

/** Acrobat goalies live on speed and agility. Mechanical goalies live on the read, the rebound, and the poke. */
export function goalieLean(ratings: GoalieRatings): "acrobat" | "mechanical" | "mix" {
  const fly = (ratings.speed + ratings.agility) / 2;
  const mech = (ratings.iq + ratings.rebound + ratings.composure + ratings.poke) / 4;
  if (fly >= mech + 1.35) return "acrobat";
  if (mech >= fly + 1.05) return "mechanical";
  return "mix";
}

export function playerLean(card: { kind: "skater" | "goalie"; styles: Styles; ratings: SkaterRatings | GoalieRatings }): Lean {
  if (card.kind === "goalie") return goalieLean(card.ratings as GoalieRatings);
  return leanOf(card.styles);
}

export function fitHint(card: SkaterCard) {
  if (card.ratings.attack > card.ratings.defense + 2) return "Fits up ice";
  if (card.ratings.defense > card.ratings.attack + 2) return "Fits deeper";
  return "Fits anywhere";
}

const SKATER_KEYS = ["speed", "agility", "shot", "attack", "defense", "handling", "toughness"] as const;
const GOALIE_KEYS = ["speed", "agility", "iq", "rebound", "composure", "poke"] as const;
const OVR_BANDS = [30, 40, 50, 60, 70, 80, 90];

export function makePool(seed = Math.floor(Math.random() * 0x7fffffff)) {
  const rng = mulberry32(seed >>> 0);
  const skaterTargets = bandTargets(rng, 3);
  const goalieTargets = OVR_BANDS.flatMap((floor) => [floor === 90 ? 99 : pickInBand(rng, floor), pickInBand(rng, floor)]);
  const skaters: SkaterCard[] = skaterTargets.map((target, i) => {
    const ratings = ratingsFor(target, rng, SKATER_KEYS, overallSkater);
    return {
      id: `s${seed}-${i}`,
      name: SKATER_NAMES[i] ?? `Skater ${i + 1}`,
      kind: "skater",
      ratings,
      overall: overallSkater(ratings),
      styles: rollStyles(rng),
      perks: perksFor(rng, overallSkater(ratings)),
      hue: Math.floor(rng() * 360),
      visor: i % 3,
      antenna: i % 4,
    };
  });
  const goalies: GoalieCard[] = goalieTargets.map((target, i) => {
    const ratings = ratingsFor(target, rng, GOALIE_KEYS, overallGoalie);
    return {
      id: `g${seed}-${i}`,
      name: GOALIE_NAMES[i] ?? `Keeper ${i + 1}`,
      kind: "goalie",
      ratings,
      overall: overallGoalie(ratings),
      styles: rollStyles(rng),
      perks: perksFor(rng, overallGoalie(ratings)).slice(0, 2),
      hue: Math.floor(rng() * 360),
      visor: i % 3,
      antenna: 0,
    };
  });
  return { skaters, goalies };
}

function bandTargets(rng: () => number, studs: number) {
  const targets = OVR_BANDS.flatMap((floor) => Array.from({ length: 5 }, () => (floor === 90 ? 90 + Math.floor(rng() * 9) : pickInBand(rng, floor))));
  for (let i = 0; i < studs; i++) targets.push(99);
  return targets;
}

function pickInBand(rng: () => number, floor: number) {
  return floor + Math.floor(rng() * 10);
}

function ratingsFor<T extends SkaterRatings | GoalieRatings>(target: number, rng: () => number, keys: readonly (keyof T)[], overall: (ratings: T) => number): T {
  const ratings = {} as T;
  const mean = clamp(Math.round(target / 9.05), 1, 11);
  for (const key of keys) ratings[key] = clamp(mean + Math.floor(rng() * 5) - 2, 1, 11) as T[keyof T];
  let guard = 0;
  while (guard++ < 120 && overall(ratings) !== target) {
    const ovr = overall(ratings);
    const movable = keys.filter((key) => (ovr < target ? (ratings[key] as number) < 11 : (ratings[key] as number) > 1));
    if (!movable.length) break;
    const key = movable[Math.floor(rng() * movable.length)];
    ratings[key] = ((ratings[key] as number) + (ovr < target ? 1 : -1)) as T[keyof T];
  }
  return ratings;
}

export function rollHabits(seed: number): TeamHabits {
  const rng = mulberry32(seed);
  const one = () => Math.floor(rng() * 101);
  return { bounce: one(), earlyShot: one(), crash: one(), patient: one(), risk: one() };
}

export type DealBias = "random" | "stars" | "weak" | "duel";

export function dealRandom(skaters: SkaterCard[], goalies: GoalieCard[], stars: boolean | DealBias = "random") {
  const mode: DealBias = stars === true ? "stars" : stars === false ? "random" : stars;
  const sk = [...skaters];
  const gl = [...goalies];
  if (mode === "random") {
    shuffle(sk);
    shuffle(gl);
  } else {
    sk.sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
    gl.sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
  }
  const homeSk = mode === "weak" ? sk.slice(-6) : mode === "duel" ? snake(sk.slice(0, 12), true) : sk.slice(0, 6);
  const awaySk = mode === "stars" ? sk.slice(-6) : mode === "weak" ? sk.slice(0, 6) : mode === "duel" ? snake(sk.slice(0, 12), false) : sk.slice(6, 12);
  const homeGl = mode === "weak" ? gl[gl.length - 1] : gl[0];
  const awayGl = mode === "weak" ? gl[0] : mode === "stars" ? gl[gl.length - 1] : gl[1] ?? gl[0];
  return {
    home: { ice: [homeSk[0], homeSk[1], homeSk[2], homeGl] as PlayerCard[], bench: homeSk.slice(3, 6) },
    away: { ice: [awaySk[0], awaySk[1], awaySk[2], awayGl] as PlayerCard[], bench: awaySk.slice(3, 6) },
  };
}

function snake<T>(ranked: T[], home: boolean) {
  return ranked.filter((_, index) => (index % 4 === 0 || index % 4 === 3) === home);
}

function shuffle<T>(list: T[]) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function rollStyles(rng: () => number): Styles {
  const one = () => 12 + Math.floor(rng() * 76);
  return { aggressive: one(), shooter: one(), wide: one(), physical: one() };
}

function perksFor(rng: () => number, overall: number): Perk[] {
  const roll = rng();
  const count = overall >= 97 ? 2 + (roll < 0.55 ? 1 : 0) : overall < 40 ? (roll < 0.8 ? 0 : 1) : roll < 0.38 ? 0 : roll < 0.72 ? 1 : roll < 0.92 ? 2 : 3;
  const bag = [...PERKS];
  const out: Perk[] = [];
  for (let i = 0; i < count; i++) {
    const at = Math.floor(rng() * bag.length);
    out.push(bag.splice(at, 1)[0]);
  }
  return out;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
