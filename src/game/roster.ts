export type Perk = "bank" | "sticky" | "afterburner" | "clean" | "glue" | "heavy" | "pickup";

export type SkaterRatings = {
  speed: number;
  agility: number;
  shot: number;
  attack: number;
  defense: number;
  blastArea: number;
  blastPower: number;
};

export type GoalieRatings = {
  speed: number;
  agility: number;
  iq: number;
  rebound: number;
  composure: number;
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

export type FilledSide = { ice: PlayerCard[]; bench: PlayerCard[] };

export type Matchup = {
  home: FilledSide;
  away: FilledSide;
  homeHabits: TeamHabits;
  awayHabits: TeamHabits;
};

export const TEAM_HUE = { home: 191, away: 338 } as const;

export function teamColor(side: keyof typeof TEAM_HUE) {
  return `hsl(${TEAM_HUE[side]} 88% 62%)`;
}

export const PERK_LABEL: Record<Perk, string> = {
  bank: "Bank",
  sticky: "Sticky",
  afterburner: "Afterburner",
  clean: "Clean Release",
  glue: "Glue",
  heavy: "Heavy",
  pickup: "Pickup",
};

export const PERKS: Perk[] = ["bank", "sticky", "afterburner", "clean", "glue", "heavy", "pickup"];

const SKATER_NAMES = [
  "Vex", "Quill", "Nox", "Juno", "Kite", "Rook", "Ion", "Hex", "Lumen", "Nimbus",
  "Torque", "Wisp", "Cinder", "Halo", "Flint", "Nova", "Rift", "Sable", "Tilt", "Umbra",
  "Vesper", "Wedge", "Axle", "Drift", "Echo", "Frost", "Glint", "Hush",
];

const GOALIE_NAMES = ["Vault", "Kepler", "Moor", "Nyx", "Prism", "Orb"];

export function overallSkater(r: SkaterRatings) {
  const score =
    r.speed * 24 +
    r.agility * 20 +
    r.shot * 18 +
    r.attack * 16 +
    r.defense * 14 +
    r.blastArea * 4 +
    r.blastPower * 4;
  return Math.round(score / 11);
}

export function overallGoalie(r: GoalieRatings) {
  const score = r.iq * 30 + r.speed * 24 + r.agility * 20 + r.composure * 16 + r.rebound * 10;
  return Math.round(score / 11);
}

export function pace(n: number) {
  return 0.78 + (Math.min(11, Math.max(1, n)) - 1) * 0.056;
}

export function teamShape(cards: PlayerCard[]): TeamShape {
  const sk = cards.filter((c): c is SkaterCard => c.kind === "skater");
  if (sk.length === 0) return { push: 50, share: 50, width: 50, heat: 50 };
  const avg = (pick: (c: SkaterCard) => number) => sk.reduce((sum, c) => sum + pick(c), 0) / sk.length;
  return {
    push: clamp(avg((c) => c.styles.aggressive) * 0.75 + (avg((c) => c.ratings.speed) / 11) * 100 * 0.25, 0, 100),
    share: clamp((100 - avg((c) => c.styles.shooter)) * 0.7 + (avg((c) => c.ratings.attack) / 11) * 100 * 0.3, 0, 100),
    width: clamp(avg((c) => c.styles.wide), 0, 100),
    heat: clamp(
      avg((c) => c.styles.physical) * 0.7 +
        (avg((c) => (c.ratings.blastArea + c.ratings.blastPower) / 2) / 11) * 100 * 0.3,
      0,
      100,
    ),
  };
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

export function fitHint(card: SkaterCard) {
  if (card.ratings.attack > card.ratings.defense + 2) return "Fits up ice";
  if (card.ratings.defense > card.ratings.attack + 2) return "Fits deeper";
  return "Fits anywhere";
}

export function makePool(seed = 7) {
  const rng = mulberry32(seed);
  const skaters: SkaterCard[] = SKATER_NAMES.slice(0, 16).map((name, i) => {
    const ratings: SkaterRatings = {
      speed: rollStat(rng),
      agility: rollStat(rng),
      shot: rollStat(rng),
      attack: rollStat(rng),
      defense: rollStat(rng),
      blastArea: rollStat(rng),
      blastPower: rollStat(rng),
    };
    return {
      id: `s${i}`,
      name,
      kind: "skater",
      ratings,
      overall: overallSkater(ratings),
      styles: rollStyles(rng),
      perks: rollPerks(rng),
      hue: Math.floor(rng() * 360),
      visor: i % 3,
      antenna: i % 4,
    };
  });
  const goalies: GoalieCard[] = GOALIE_NAMES.slice(0, 4).map((name, i) => {
    const ratings: GoalieRatings = {
      speed: rollStat(rng),
      agility: rollStat(rng),
      iq: rollStat(rng),
      rebound: rollStat(rng),
      composure: rollStat(rng),
    };
    return {
      id: `g${i}`,
      name,
      kind: "goalie",
      ratings,
      overall: overallGoalie(ratings),
      styles: rollStyles(rng),
      perks: rollPerks(rng).slice(0, 2),
      hue: 190 + i * 28,
      visor: i % 3,
      antenna: 0,
    };
  });
  return { skaters, goalies };
}

export function rollHabits(seed: number): TeamHabits {
  const rng = mulberry32(seed);
  const one = () => Math.floor(rng() * 101);
  return { bounce: one(), earlyShot: one(), crash: one(), patient: one(), risk: one() };
}

export function dealRandom(skaters: SkaterCard[], goalies: GoalieCard[], stars: boolean) {
  const sk = [...skaters].sort((a, b) => (stars ? b.overall - a.overall : Math.random() - 0.5));
  const gl = [...goalies].sort((a, b) => (stars ? b.overall - a.overall : Math.random() - 0.5));
  const homeSk = stars ? sk.slice(0, 6) : sk.slice(0, 6);
  const awaySk = stars ? sk.slice(-6) : sk.slice(6, 12);
  return {
    home: { ice: [homeSk[0], homeSk[1], homeSk[2], gl[0]] as PlayerCard[], bench: homeSk.slice(3, 6) },
    away: { ice: [awaySk[0], awaySk[1], awaySk[2], gl[stars ? gl.length - 1 : 1]] as PlayerCard[], bench: awaySk.slice(3, 6) },
  };
}

function rollStat(rng: () => number) {
  const a = 2 + Math.floor(rng() * 7);
  const b = 2 + Math.floor(rng() * 7);
  let n = Math.round((a + b) / 2);
  if (rng() < 0.08) n += 2;
  if (rng() < 0.04) n = 11;
  return Math.min(11, Math.max(1, n));
}

function rollStyles(rng: () => number): Styles {
  const one = () => 12 + Math.floor(rng() * 76);
  return { aggressive: one(), shooter: one(), wide: one(), physical: one() };
}

function rollPerks(rng: () => number): Perk[] {
  const roll = rng();
  const count = roll < 0.38 ? 0 : roll < 0.72 ? 1 : roll < 0.92 ? 2 : 3;
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
