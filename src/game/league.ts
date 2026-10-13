import {
  PERKS,
  hueGap,
  overallGoalie,
  overallSkater,
  slotWeight,
  slotsClash,
  teamGrades,
  type GoalieRatings,
  type Kit,
  type Matchup,
  type Perk,
  type PlayerCard,
  type SkaterRatings,
  type Styles,
  type TeamHabits,
} from "./roster.ts";

export const LEAGUE_NAME = [
  "Dust League",
  "Cinder League",
  "Drift League",
  "Comet League",
  "Signal League",
  "Quasar League",
  "Nova League",
  "Crown League",
];

const BASE = [180, 360, 620, 980, 1450, 1980, 2480, 3050];
const TIER_MEAN = [54, 61, 67, 73, 78, 83, 87, 91];
const PER_WIN = [6, 9, 13, 18, 25, 34, 46, 60];
const RS_BONUS = [28, 42, 60, 86, 120, 164, 220, 290];
const PO_WIN = [10, 16, 24, 34, 48, 66, 90, 120];
const CUP_BONUS = [22, 34, 50, 72, 100, 140, 190, 250];
const UNI_WIN = [18, 26, 36, 48, 64, 84, 110, 140];
const UNI_BONUS = [80, 110, 150, 200, 260, 330, 420, 520];
const TERM_FACTOR = [0, 1.16, 1.08, 1, 0.93, 0.86];
const PLANETS = ["Vesper", "Kite", "Marrow", "Lumen", "Brine", "Sable", "Quill", "Nimbus", "Cairn", "Halo", "Dune", "Orbis"];

const SLOT_KEY = "space-hockey-slot-";
const LEGACY_KEY = "space-hockey-career";

export type Phase = "sign" | "season" | "playoffs" | "relegation" | "universe" | "market";

export type SeasonForm = {
  games: number;
  goals: number;
  assists: number;
  shots: number;
  rushes: number;
  blasts: number;
  wins: number;
  ga: number;
  saves: number;
  pokes: number;
  shutouts: number;
};

export type SeasonLine = SeasonForm & {
  year: number;
  club: string;
  tier: number;
  note: string;
};

export type Award = { year: number; tier: number; title: "Scoring title" | "Best goalie" };

export type LeaguePlayer = PlayerCard & {
  seasonsPlayed: number;
  history: SeasonLine[];
  season: SeasonForm;
  awards: Award[];
  retired: boolean;
  planet: string;
  potential: SkaterRatings | GoalieRatings;
  prior: SkaterRatings | GoalieRatings | null;
};

export type Contract = {
  playerId: string;
  clubId: string;
  wage: number;
  seasonsLeft: number;
  signedInWindow: boolean;
};

export type ClubYear = {
  year: number;
  tier: number;
  wins: number;
  losses: number;
  gf: number;
  ga: number;
  finish: number;
  playoff: string;
  universe: string;
  blastoffs: number;
  offense: number;
  defense: number;
  iq: number;
};

export type ClubLedger = Omit<ClubYear, "universe">;

export type Club = {
  id: string;
  name: string;
  tag: string;
  kit: Kit;
  tier: number;
  user: boolean;
  budget: number;
  budgetNote: string;
  roster: string[];
  habits: TeamHabits;
  wins: number;
  losses: number;
  gf: number;
  ga: number;
  blastoffs: number;
  awardCash: number;
  playoffWins: number;
  rsTitle: boolean;
  cupTitle: boolean;
  universeWins: number;
  universeChamp: boolean;
  history: ClubYear[];
  ledger: ClubLedger | null;
  planet: string;
  rights: string[];
  unretained: string[];
};

export type BoxLine = {
  id: string;
  name: string;
  kind: "skater" | "goalie";
  goals: number;
  assists: number;
  shots: number;
  rushes: number;
  blasts: number;
  saves: number;
  ga: number;
  pokes: number;
};

export type BoxScore = { blastoff: boolean; home: BoxLine[]; away: BoxLine[] };

export type GameReport = {
  label: string;
  homeId: string;
  awayId: string;
  hg: number;
  ag: number;
  box: BoxScore;
};

export type Fixture = {
  id: string;
  tier: number;
  round: number;
  homeId: string;
  awayId: string;
  hg: number | null;
  ag: number | null;
  box: BoxScore | null;
};

export type Knockout = {
  id: string;
  competition: "playoff" | "relegation" | "universe";
  tier: number;
  round: number;
  homeId: string;
  awayId: string;
  hg: number | null;
  ag: number | null;
  box: BoxScore | null;
  homeFrom: string;
  awayFrom: string;
  seated: boolean;
};

export type Qualifier = { clubId: string; tier: number; rank: number; champ: boolean };

export type Save = {
  v: 1;
  seed: number;
  season: number;
  phase: Phase;
  nextSerial: number;
  clubs: Club[];
  players: LeaguePlayer[];
  contracts: Contract[];
  fixtures: Fixture[];
  knockout: Knockout[];
  qualifiers: Qualifier[];
  userClubId: string;
  news: string[];
  report: GameReport | null;
};

export type MatchLine = {
  id: string;
  shots: number;
  goals: number;
  rushes: number;
  assists: number;
  blasts: number;
  saves: number;
  ga: number;
  pokes: number;
};

export type MatchSheet = { blastoff: boolean; lines: MatchLine[] };

export type SideSheet = { home: MatchLine[]; away: MatchLine[]; blastoff: boolean };

export type UserMatch = {
  kind: "fixture" | "knockout";
  id: string;
  opponentId: string;
  opponentName: string;
  userHome: boolean;
  label: string;
};

type Rng = { next: () => number; seed: () => number };

const SLOT_NAMES = ["Attack", "Mid", "Defense", "Goalie", "Sub 1", "Sub 2", "Sub 3", "Reserve 1", "Reserve 2", "Reserve 3"];
const ACTIVE_SLOTS = 7;

export type SlotId = 1 | 2 | 3;

export type CareerSlot = {
  id: SlotId;
  occupied: boolean;
  name: string;
  league: string;
  season: number;
  phase: string;
};

export function leagueName(tier: number) {
  return LEAGUE_NAME[clamp(tier, 0, 7)] ?? LEAGUE_NAME[0];
}

export function rungLabel(tier: number) {
  if (tier <= 0) return "Bottom rung";
  if (tier >= 7) return "Top rung";
  return `Rung ${tier + 1} of 8`;
}

export function playerWage(overall: number) {
  const o = Math.max(42, Math.min(99, overall));
  const core = 8 + ((o - 42) / 7) ** 2.2 * 5;
  const elite = o <= 82 ? 0 : ((o - 82) / 5) ** 1.65 * 22;
  return Math.round(core + elite);
}

export function listSlots(): CareerSlot[] {
  return ([1, 2, 3] as SlotId[]).map((id) => {
    const save = readSlot(id);
    const club = save?.clubs.find((item) => item.id === save.userClubId);
    if (!save || !club) return { id, occupied: false, name: "", league: "", season: 0, phase: "" };
    return { id, occupied: true, name: club.name, league: leagueName(club.tier), season: save.season, phase: phaseLabel(save.phase) };
  });
}

export function loadCareer(slot: SlotId = 1): Save | null {
  return readSlot(slot);
}

export function saveCareer(save: Save, slot: SlotId = 1) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(SLOT_KEY + slot, JSON.stringify(save));
  } catch {
    /* ignore a full or blocked store */
  }
}

export function clearCareer(slot: SlotId = 1) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(SLOT_KEY + slot);
    if (slot === 1) localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

function phaseLabel(phase: Phase) {
  if (phase === "sign" || phase === "market") return "Market";
  if (phase === "season") return "Season";
  if (phase === "playoffs") return "Playoffs";
  if (phase === "relegation") return "Relegation";
  return "Universe";
}

function readSlot(slot: SlotId): Save | null {
  try {
    if (typeof localStorage === "undefined") return null;
    let raw = localStorage.getItem(SLOT_KEY + slot);
    if (!raw && slot === 1) raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw) as Save & { clubs: (Club & { hue?: number })[] };
    if (save?.v !== 1 || !save.userClubId || !Array.isArray(save.clubs)) return null;
    normalize(save);
    return save;
  } catch {
    return null;
  }
}

function normalize(save: Save & { clubs: (Club & { hue?: number })[] }) {
  for (const club of save.clubs) {
    if (!club.kit && typeof club.hue === "number") club.kit = kitAround(club.hue);
    if (!club.history) club.history = [];
    if (typeof club.blastoffs !== "number") club.blastoffs = 0;
    if (typeof club.awardCash !== "number") club.awardCash = 0;
    if (club.ledger === undefined) club.ledger = null;
    if (!club.planet) club.planet = PLANETS[Math.abs(hashCode(club.id)) % PLANETS.length];
    if (!Array.isArray(club.rights)) club.rights = [];
    if (!Array.isArray(club.unretained)) club.unretained = [];
    while (club.roster.length < SLOT_NAMES.length) club.roster.push("");
    club.roster = club.roster.slice(0, SLOT_NAMES.length);
  }
  for (const player of save.players ?? []) {
    player.history = (player.history ?? []).map((line) => ({ ...emptyForm(), ...line }));
    player.season = { ...emptyForm(), ...player.season };
    if (!player.awards) player.awards = [];
    if (player.retired !== true) player.retired = false;
    if (!player.planet) player.planet = "Vesper";
    if (!player.potential) player.potential = { ...player.ratings };
    if (player.prior === undefined) player.prior = null;
  }
  for (const deal of save.contracts ?? []) {
    if (typeof deal.signedInWindow !== "boolean") deal.signedInWindow = false;
  }
  for (const fixture of save.fixtures ?? []) if (!fixture.box) fixture.box = null;
  for (const match of save.knockout ?? []) if (!match.box) match.box = null;
  if (!save.report) save.report = null;
  repairPromotion(save);
}

function hashCode(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h;
}

export function createCareer(input: { name: string; tag: string; kit: Kit }, seed = Date.now() % 100000): Save {
  const rng = makeRng(seed);
  const opening = 9 + Math.floor(rng.next() * 4);
  const save: Save = {
    v: 1,
    seed,
    season: opening,
    phase: "sign",
    nextSerial: 1,
    clubs: [],
    players: [],
    contracts: [],
    fixtures: [],
    knockout: [],
    qualifiers: [],
    userClubId: "user",
    news: [`The leagues are already in year ${opening}. You are the new club on the bottom rung.`],
    report: null,
  };
  const usedNames = new Set<string>();
  const user = blankClub("user", cleanName(input.name), cleanTag(input.tag), input.kit, 0, true);
  user.planet = PLANETS[Math.floor(rng.next() * PLANETS.length)];
  user.budget = BASE[0];
  user.budgetNote = "Starting purse for the Dust League.";
  usedNames.add(user.name);
  save.clubs.push(user);
  for (let tier = 0; tier < 8; tier++) {
    const count = tier === 0 ? 9 : 10;
    for (let i = 0; i < count; i++) {
      const club = blankClub(serial(save, "c"), clubName(rng, usedNames), "", randomKit(rng), tier, false);
      club.tag = uniqueTag(save, club.name);
      club.planet = PLANETS[Math.floor(rng.next() * PLANETS.length)];
      club.habits = habitsFrom(rng);
      save.clubs.push(club);
      const mean = TIER_MEAN[tier];
      fillAiRoster(save, rng, club, mean);
      inventClubHistory(rng, club, opening);
      const pay = payroll(save, club.id);
      club.budget = Math.max(BASE[tier], pay);
      club.budgetNote = "Opening books.";
    }
  }
  for (let i = 0; i < 3; i++) stockFree(save, rng, makeGoalie(save, rng, 46 + Math.floor(rng.next() * 12)));
  for (let i = 0; i < 2; i++) stockFree(save, rng, makeGoalie(save, rng, 66 + Math.floor(rng.next() * 14)));
  stockFree(save, rng, makeGoalie(save, rng, 82 + Math.floor(rng.next() * 10)));
  for (let i = 0; i < 12; i++) stockFree(save, rng, makeSkater(save, rng, 44 + Math.floor(rng.next() * 12)));
  for (let i = 0; i < 8; i++) stockFree(save, rng, makeSkater(save, rng, 58 + Math.floor(rng.next() * 12)));
  for (let i = 0; i < 6; i++) stockFree(save, rng, makeSkater(save, rng, 72 + Math.floor(rng.next() * 12)));
  for (let i = 0; i < 4; i++) stockFree(save, rng, makeSkater(save, rng, 84 + Math.floor(rng.next() * 10)));
  save.seed = rng.seed();
  return save;
}

export function wornHues(home: Kit, away: Kit) {
  let strip: "primary" | "secondary" | "accent" = "primary";
  if (slotsClash(home, "primary", away, "primary")) {
    strip = "secondary";
    if (slotsClash(home, "primary", away, "secondary")) strip = "accent";
  }
  const awayInk = slotInkOf(away, strip);
  const homeInk = slotInkOf(home, "primary");
  return {
    homeHue: homeInk === null ? home.primary : 220,
    awayHue: awayInk === null ? away[strip] : 220,
    awayStrip: strip,
    homeInk,
    awayInk,
  };
}

function slotInkOf(kit: Kit, slot: "primary" | "secondary" | "accent") {
  const ink = kit.neutral?.[slot];
  return typeof ink === "number" ? ink : null;
}

export function emptyForm(): SeasonForm {
  return { games: 0, goals: 0, assists: 0, shots: 0, rushes: 0, blasts: 0, wins: 0, ga: 0, saves: 0, pokes: 0, shutouts: 0 };
}

export function shotPct(form: SeasonForm) {
  if (form.shots <= 0) return null;
  return Math.max(0, form.goals - form.rushes) / form.shots;
}

export function savePct(form: SeasonForm) {
  const faced = form.saves + form.ga;
  if (faced <= 0) return null;
  return form.saves / faced;
}

export function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

export function careerTotals(player: LeaguePlayer): SeasonForm {
  const total = emptyForm();
  for (const line of [...player.history, player.season]) {
    total.games += line.games;
    total.goals += line.goals;
    total.assists += line.assists;
    total.shots += line.shots;
    total.rushes += line.rushes;
    total.blasts += line.blasts;
    total.wins += line.wins;
    total.ga += line.ga;
    total.saves += line.saves;
    total.pokes += line.pokes;
    total.shutouts += line.shutouts;
  }
  return total;
}

export function clubForPlayer(save: Save, playerId: string) {
  const deal = contractFor(save, playerId);
  return deal ? clubById(save, deal.clubId) : null;
}

export function payroll(save: Save, clubId: string) {
  return save.contracts.filter((c) => c.clubId === clubId).reduce((sum, c) => sum + c.wage, 0);
}

export function room(save: Save, clubId: string) {
  const club = clubById(save, clubId);
  return (club?.budget ?? 0) - payroll(save, clubId);
}

export function clubById(save: Save, id: string) {
  return save.clubs.find((c) => c.id === id) ?? null;
}

export function playerById(save: Save, id: string) {
  return save.players.find((p) => p.id === id) ?? null;
}

export function clubGrades(save: Save, clubId: string) {
  const club = clubById(save, clubId);
  if (!club) return null;
  const cards = club.roster.map((id) => (id ? playerById(save, id) : null));
  if (!cards.some(Boolean)) return null;
  return teamGrades(cards);
}

export function clubLeaders(save: Save, clubId: string) {
  const club = clubById(save, clubId);
  if (!club) return [];
  const rows = club.roster.flatMap((id) => {
    const player = id ? playerById(save, id) : null;
    if (!player) return [];
    return [{ player, form: clubForm(player) }];
  });
  if (!rows.some((row) => row.form.games > 0)) return [];
  const skaters = rows.filter((row) => row.player.kind === "skater");
  const goalies = rows.filter((row) => row.player.kind === "goalie");
  const out: { key: string; label: string; playerId: string; name: string; value: string }[] = [];
  const high = (pool: typeof rows, label: string, read: (row: (typeof rows)[number]) => number, text: (row: (typeof rows)[number]) => string) => {
    if (!pool.length) return;
    const best = [...pool].sort((a, b) => read(b) - read(a) || a.player.name.localeCompare(b.player.name))[0];
    if (read(best) <= 0) return;
    out.push({ key: label, label, playerId: best.player.id, name: best.player.name, value: text(best) });
  };
  high(skaters, "Goals", (row) => row.form.goals, (row) => String(row.form.goals));
  high(skaters, "Assists", (row) => row.form.assists, (row) => String(row.form.assists));
  high(skaters, "Shots", (row) => row.form.shots, (row) => String(row.form.shots));
  high(skaters, "Shot %", (row) => shotPct(row.form) ?? -1, (row) => formatPct(shotPct(row.form)));
  high(skaters, "Rushes", (row) => row.form.rushes, (row) => String(row.form.rushes));
  high(skaters, "Blasts", (row) => row.form.blasts, (row) => String(row.form.blasts));
  high(goalies, "Saves", (row) => row.form.saves, (row) => String(row.form.saves));
  if (goalies.some((row) => row.form.games > 0)) {
    const best = [...goalies].sort((a, b) => a.form.ga - b.form.ga || b.form.saves - a.form.saves || a.player.name.localeCompare(b.player.name))[0];
    out.push({ key: "GA", label: "Goals allowed", playerId: best.player.id, name: best.player.name, value: String(best.form.ga) });
  }
  high(goalies, "Save %", (row) => savePct(row.form) ?? -1, (row) => formatPct(savePct(row.form)));
  high(goalies, "Pokes", (row) => row.form.pokes, (row) => String(row.form.pokes));
  high(goalies, "Shutouts", (row) => row.form.shutouts, (row) => String(row.form.shutouts));
  return out;
}

export function clubForm(player: LeaguePlayer): SeasonForm {
  if (player.season.games > 0) return player.season;
  const last = [...player.history].reverse().find((line) => line.games > 0);
  return last ?? player.season;
}

export function contractFor(save: Save, playerId: string) {
  return save.contracts.find((c) => c.playerId === playerId) ?? null;
}

export function userClub(save: Save) {
  return clubById(save, save.userClubId)!;
}

export function teamsIn(save: Save, tier: number) {
  return save.clubs.filter((c) => c.tier === tier);
}

export function standings(save: Save, tier: number) {
  return teamsIn(save, tier)
    .map((c) => ({ ...c, gd: c.gf - c.ga }))
    .sort((a, b) => b.wins - a.wins || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
}

export function freeAgents(save: Save) {
  const taken = new Set(save.contracts.map((c) => c.playerId));
  return save.players.filter((p) => !p.retired && !taken.has(p.id)).sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
}

export function rosterProblem(save: Save, clubId: string) {
  const club = clubById(save, clubId);
  if (!club) return "Missing club";
  const cards = club.roster.map((id) => (id ? playerById(save, id) : null));
  for (let i = 0; i < ACTIVE_SLOTS; i++) if (!cards[i]) return "Fill every slot";
  if (cards[3]?.kind !== "goalie") return "The goalie slot needs a goalie";
  if (cards.some((c, i) => i < ACTIVE_SLOTS && i !== 3 && c?.kind === "goalie")) return "Only the goalie slot takes a goalie";
  if (payroll(save, clubId) > club.budget) return "Payroll is over the budget";
  return null;
}

export function maxYears(player: LeaguePlayer) {
  return clamp(10 - player.seasonsPlayed, 1, 5);
}

export function quote(save: Save, playerId: string, years = 3, slot = -1) {
  const player = playerById(save, playerId);
  if (!player || player.retired || contractFor(save, playerId)) return null;
  const demand = playerWage(player.overall);
  const club = userClub(save);
  const term = clamp(Math.round(years) || 3, 1, 5);
  let raw = 0;
  const bits: string[] = [];
  const care = clamp((player.overall - 50) / 42, 0, 1);
  const prestigeGap = (preferredPrestige(player.overall) - clubPrestige(save, club.id)) / 80;
  const prestigeAdj = prestigeGap * 0.22 * care;
  raw += prestigeAdj;
  if (prestigeAdj > 0.03 && care > 0.15) bits.push("Wants more prestige");
  else if (prestigeAdj < -0.03 && care > 0.15) bits.push("Likes the prestige");
  if (player.planet && club.planet && player.planet === club.planet) {
    raw -= 0.04;
    bits.push("Home planet");
  } else if (player.planet && club.planet) {
    raw += 0.035;
    bits.push("Away from home");
  }
  const mean = TIER_MEAN[clamp(club.tier, 0, 7)];
  if (player.overall > mean + 8) {
    const fit = clamp((player.overall - mean - 8) / 80, 0, 0.1);
    raw += fit;
    if (fit > 0.02) bits.push("League beneath them");
  } else if (player.overall + 14 < mean) {
    raw -= 0.03;
    bits.push("Wants the minutes");
  }
  const adjust = clamp(raw, -0.18, 0.18);
  let factor = TERM_FACTOR[term] ?? 1;
  if (term >= 4 && potentialOverall(player) - player.overall >= 4) factor = Math.max(factor, 0.98);
  let loyalty = 0;
  if (slot >= 7) {
    loyalty -= 0.45;
    bits.push("Reserve deal");
  }
  if (club.rights.includes(player.id)) {
    loyalty -= 0.28;
    bits.push("Reserve rights");
  } else if (club.unretained.includes(player.id)) {
    loyalty -= 0.1;
    bits.push("Back with you");
  }
  const base = Math.max(4, Math.round(demand * (1 + adjust)));
  const wage = Math.max(4, Math.round(base * factor * (1 + loyalty)));
  const cap = slot >= 7 ? Math.min(3, maxYears(player)) : maxYears(player);
  return {
    demand,
    wage,
    bidder: "",
    years: cap,
    adjust,
    factor,
    loyalty,
    reason: bits.length ? bits.join(" · ") : "Standard ask",
  };
}

export function canSign(save: Save, playerId: string, slot: number, years: number) {
  if (save.phase !== "sign" && save.phase !== "market") return "The market is closed";
  const player = playerById(save, playerId);
  if (!player) return "No such player";
  if (player.retired) return "Retired";
  if (contractFor(save, playerId)) return "Already signed";
  if (slot < 0 || slot >= SLOT_NAMES.length) return "No such slot";
  if (slot >= 7 && player.seasonsPlayed >= 4) return "Reserves are for players with under 4 years";
  if (slot >= 7 && years > 3) return "Reserve rights run 3 seasons at most";
  if (!slotAccepts(player, slot)) return slot === 3 ? "That slot is for a goalie" : "That slot is for a skater";
  const club = userClub(save);
  if (club.roster[slot]) return "That slot is full";
  const offer = quote(save, playerId, years, slot);
  if (!offer) return "No offer";
  if (years < 1 || years > offer.years) return "That term is too long";
  if (offer.wage > room(save, club.id)) return "You cannot afford that wage";
  return null;
}

export function signPlayer(save: Save, playerId: string, slot: number, years: number) {
  if (canSign(save, playerId, slot, years)) return save;
  const next = clone(save);
  const offer = quote(next, playerId, years, slot)!;
  const club = userClub(next);
  club.roster[slot] = playerId;
  next.contracts.push({ playerId, clubId: club.id, wage: offer.wage, seasonsLeft: years, signedInWindow: true });
  stripClaims(next, playerId);
  const player = playerById(next, playerId)!;
  const where = slot >= 7 ? " into the reserves" : "";
  log(next, `Signed ${player.name}${where} for ${offer.wage} cr, ${years} season${years === 1 ? "" : "s"}.`);
  return next;
}

export function autoDraft(save: Save, years = 3): Save {
  if (save.phase !== "sign" && save.phase !== "market") return save;
  let next = clone(save);
  const slots = [3, 0, 1, 2, 4, 5, 6];
  for (const slot of slots) {
    if (userClub(next).roster[slot]) continue;
    const kind = slot === 3 ? "goalie" : "skater";
    const pending = slots.filter((index) => index !== slot && !userClub(next).roster[index]);
    const reserve = cheapestCover(next, pending, years);
    const space = room(next, userClub(next).id);
    const pool = freeAgents(next)
      .filter((player) => player.kind === kind)
      .map((player) => {
        const term = clamp(years, 1, maxYears(player));
        return { player, term, wage: quote(next, player.id, term, slot)?.wage ?? 9999 };
      })
      .filter((row) => row.wage <= space);
    if (!pool.length) continue;
    const capped = pool.filter((row) => row.wage <= space - reserve);
    const choice = capped.length
      ? capped.sort((a, b) => b.player.overall - a.player.overall || b.wage - a.wage)[0]
      : pool.sort((a, b) => a.wage - b.wage)[0];
    const signed = signPlayer(next, choice.player.id, slot, choice.term);
    if (signed !== next) next = signed;
  }
  for (let pass = 0; pass < 6; pass++) {
    const space = room(next, userClub(next).id);
    if (space <= 0) break;
    let best: { held: string; id: string; slot: number; gain: number; spend: number; term: number } | null = null;
    const roster = userClub(next).roster;
    for (let slot = 0; slot < ACTIVE_SLOTS; slot++) {
      const held = roster[slot];
      if (!held) continue;
      const current = playerById(next, held);
      if (!current) continue;
      const wage = wageOf(next, held);
      for (const agent of freeAgents(next)) {
        if (agent.kind !== current.kind || agent.overall <= current.overall) continue;
        const term = clamp(years, 1, maxYears(agent));
        const offer = quote(next, agent.id, term, slot);
        if (!offer) continue;
        const delta = offer.wage - wage;
        if (delta > space) continue;
        const gain = agent.overall - current.overall;
        if (!best || gain > best.gain || (gain === best.gain && delta > best.spend)) best = { held, id: agent.id, slot, gain, spend: delta, term };
      }
    }
    if (!best) break;
    const released = releasePlayer(next, best.held);
    if (released === next) break;
    const agent = playerById(released, best.id);
    if (!agent) break;
    const signed = signPlayer(released, best.id, best.slot, best.term);
    if (signed === released) break;
    next = signed;
  }
  return next;
}

function cheapestCover(save: Save, slots: number[], years: number) {
  const used = new Set<string>();
  let sum = 0;
  for (const slot of slots) {
    const kind = slot === 3 ? "goalie" : "skater";
    const options = freeAgents(save).filter((player) => player.kind === kind && !used.has(player.id));
    if (!options.length) continue;
    options.sort((a, b) => playerWage(a.overall) - playerWage(b.overall));
    used.add(options[0].id);
    const term = clamp(years, 1, maxYears(options[0]));
    sum += quote(save, options[0].id, term, slot)?.wage ?? playerWage(options[0].overall);
  }
  return sum;
}

export function releaseFee(save: Save, playerId: string) {
  if (save.phase !== "market") return 0;
  const deal = contractFor(save, playerId);
  if (!deal || deal.clubId !== save.userClubId || deal.signedInWindow) return 0;
  return Math.round(deal.wage * 0.5);
}

export function releasePlayer(save: Save, playerId: string) {
  if (save.phase !== "sign" && save.phase !== "market") return save;
  const next = clone(save);
  const club = userClub(next);
  const at = club.roster.indexOf(playerId);
  if (at < 0) return save;
  const fee = releaseFee(next, playerId);
  if (fee > club.budget) return save;
  club.budget -= fee;
  club.roster[at] = "";
  next.contracts = next.contracts.filter((c) => c.playerId !== playerId);
  const player = playerById(next, playerId);
  if (player) log(next, fee ? `Released ${player.name}. Buyout ${fee} cr.` : `Released ${player.name}.`);
  return next;
}

export function swapSlots(save: Save, a: number, b: number) {
  if (a === b || a < 0 || b < 0 || a >= SLOT_NAMES.length || b >= SLOT_NAMES.length) return save;
  if (a >= 7 !== b >= 7) return save;
  const next = clone(save);
  const club = userClub(next);
  const pa = club.roster[a] ? playerById(next, club.roster[a]) : null;
  const pb = club.roster[b] ? playerById(next, club.roster[b]) : null;
  if (!slotAccepts(pa, b, true) || !slotAccepts(pb, a, true)) return save;
  const hold = club.roster[a];
  club.roster[a] = club.roster[b];
  club.roster[b] = hold;
  return next;
}

export function beginSeason(save: Save) {
  if (save.phase !== "sign" || rosterProblem(save, save.userClubId)) return save;
  const next = clone(save);
  aiShopping(next);
  setupSeason(next);
  return next;
}

export function startNextSeason(save: Save) {
  if (save.phase !== "market" || rosterProblem(save, save.userClubId)) return save;
  const next = clone(save);
  aiShopping(next);
  emergencyFill(next);
  next.season += 1;
  setupSeason(next);
  return next;
}

export function currentMatch(save: Save): UserMatch | null {
  const me = save.userClubId;
  if (save.phase === "season") {
    const tier = userClub(save).tier;
    const pending = save.fixtures.filter((f) => f.tier === tier && f.hg === null && (f.homeId === me || f.awayId === me));
    if (!pending.length) return null;
    const round = Math.min(...pending.map((f) => f.round));
    const fixture = pending.find((f) => f.round === round)!;
    return describe(save, "fixture", fixture.id, fixture.homeId, fixture.awayId, `Round ${fixture.round + 1} of 9`);
  }
  const competition = save.phase === "playoffs" ? "playoff" : save.phase === "relegation" ? "relegation" : save.phase === "universe" ? "universe" : null;
  if (!competition) return null;
  const ready = save.knockout.filter(
    (m) => m.competition === competition && m.hg === null && m.homeId && m.awayId && (m.homeId === me || m.awayId === me),
  );
  if (!ready.length) return null;
  ready.sort((a, b) => a.round - b.round);
  const match = ready[0];
  return describe(save, "knockout", match.id, match.homeId, match.awayId, roundLabel(match));
}

export function playCurrent(save: Save, userGoals: number, oppGoals: number, sheet?: MatchSheet) {
  const match = currentMatch(save);
  if (!match) return save;
  const next = clone(save);
  writeUserScore(next, match, userGoals, oppGoals, sheet);
  sweepSiblings(next, match);
  const opp = clubById(next, match.opponentId);
  log(next, `${userGoals > oppGoals ? "Beat" : "Lost to"} ${opp?.name ?? "them"} ${Math.max(userGoals, oppGoals)}–${Math.min(userGoals, oppGoals)}.`);
  return next;
}

export function simCurrent(save: Save) {
  const match = currentMatch(save);
  if (!match) return save;
  const next = clone(save);
  const me = userClub(next);
  const opp = match.opponentId;
  const scored = simSides(next, me.id, opp, match.userHome);
  writeUserScore(next, match, scored.goalsA, scored.goalsB, undefined, scored.blastoff);
  sweepSiblings(next, match);
  const oppClub = clubById(next, opp);
  log(next, `${scored.goalsA > scored.goalsB ? "Beat" : "Lost to"} ${oppClub?.name ?? "them"} ${Math.max(scored.goalsA, scored.goalsB)}–${Math.min(scored.goalsA, scored.goalsB)}.`);
  return next;
}

export function continuePhase(save: Save) {
  if (currentMatch(save)) return save;
  const next = clone(save);
  if (next.phase === "season") {
    simLeftoverFixtures(next, userClub(next).tier);
    if (next.fixtures.some((f) => f.tier === userClub(next).tier && f.hg === null)) return next;
    enterPlayoffs(next);
    return next;
  }
  if (next.phase === "playoffs") {
    simBracket(next, "playoff", userClub(next).tier);
    enterRelegation(next);
    return next;
  }
  if (next.phase === "relegation") {
    enterUniverse(next);
    return next;
  }
  if (next.phase === "universe") {
    simBracket(next, "universe", 0);
    openMarket(next);
    return next;
  }
  return save;
}

export function fixturesFor(save: Save, tier: number) {
  return save.fixtures.filter((f) => f.tier === tier).sort((a, b) => a.round - b.round || a.id.localeCompare(b.id));
}

export function knockoutFor(save: Save, competition: Knockout["competition"], tier?: number) {
  return save.knockout.filter((m) => m.competition === competition && (tier === undefined || m.tier === tier));
}

export function matchupFor(save: Save, opponentId: string): Matchup | null {
  const me = userClub(save);
  const opp = clubById(save, opponentId);
  if (!opp) return null;
  const side = (club: Club) => {
    const cards = club.roster.slice(0, ACTIVE_SLOTS).map((id) => (id ? playerById(save, id) : null)).filter((p): p is LeaguePlayer => !!p);
    return { ice: cards.slice(0, 4), bench: cards.slice(4, 7) };
  };
  if (me.roster.slice(0, ACTIVE_SLOTS).some((id) => !id) || opp.roster.slice(0, ACTIVE_SLOTS).some((id) => !id)) return null;
  const userHome = currentMatch(save)?.opponentId === opponentId ? currentMatch(save)!.userHome : true;
  const building = userHome ? me.kit : opp.kit;
  const worn = wornHues(userHome ? me.kit : opp.kit, userHome ? opp.kit : me.kit);
  return {
    home: side(me),
    away: side(opp),
    homeHabits: me.habits,
    awayHabits: opp.habits,
    homeHue: userHome ? worn.homeHue : worn.awayHue,
    awayHue: userHome ? worn.awayHue : worn.homeHue,
    homeInk: userHome ? worn.homeInk : worn.awayInk,
    awayInk: userHome ? worn.awayInk : worn.homeInk,
    homeTag: me.tag,
    awayTag: opp.tag,
    homeName: me.name,
    awayName: opp.name,
    homeKit: me.kit,
    awayKit: opp.kit,
    rinkKit: building,
  };
}

export function firstOpenSlot(save: Save, playerId: string, allowReserve = false) {
  const player = playerById(save, playerId);
  if (!player) return -1;
  return userClub(save).roster.findIndex((id, index) => !id && (index < 7 || allowReserve) && slotAccepts(player, index));
}

export function slotName(index: number) {
  return SLOT_NAMES[index] ?? "Slot";
}

export function potentialOverall(player: LeaguePlayer) {
  if (!player.potential) return player.overall;
  return player.kind === "skater" ? overallSkater(player.potential as SkaterRatings) : overallGoalie(player.potential as GoalieRatings);
}

export function seasonProgress(player: LeaguePlayer) {
  if (!player.prior) return null;
  const before = player.kind === "skater" ? overallSkater(player.prior as SkaterRatings) : overallGoalie(player.prior as GoalieRatings);
  const now = player.ratings as Record<string, number>;
  const old = player.prior as unknown as Record<string, number>;
  const up: string[] = [];
  const down: string[] = [];
  for (const key of Object.keys(now)) {
    const delta = now[key] - (old[key] ?? now[key]);
    if (delta > 0) up.push(key);
    if (delta < 0) down.push(key);
  }
  return { delta: player.overall - before, up, down };
}

export function clubPrestige(save: Save, clubId: string) {
  const club = clubById(save, clubId);
  if (!club) return 0;
  const tier = clamp(club.tier, 0, 7);
  let score = 6 + tier * 9;
  if (club.user && club.history.length === 0) return clamp(Math.min(score, 4 + tier * 2), 1, 99);
  for (const line of club.history.slice(-5)) {
    score += Math.max(0, 6 - Math.floor(line.finish / 2));
    if (line.playoff === "Champion") score += 4;
    else if (line.playoff === "Finalist") score += 2;
    if (line.universe === "Champion") score += 5;
  }
  return clamp(Math.round(score), 1, 99);
}

export function knockSeed(save: Save, match: Knockout, side: "home" | "away") {
  const clubId = side === "home" ? match.homeId : match.awayId;
  if (!clubId) return 0;
  if (match.competition === "universe") {
    const at = save.qualifiers.findIndex((q) => q.clubId === clubId);
    return at >= 0 ? at + 1 : 0;
  }
  const table = standings(save, match.tier);
  const at = table.findIndex((c) => c.id === clubId);
  return at >= 0 ? at + 1 : 0;
}

function enterPlayoffs(save: Save) {
  const tier = userClub(save).tier;
  const table = standings(save, tier);
  if (table[0]) {
    const champ = clubById(save, table[0].id);
    if (champ) {
      champ.rsTitle = true;
      const prize = tier < 7 ? ` ${champ.user ? "You are" : "They are"} promoted to the ${leagueName(tier + 1)}.` : "";
      log(save, `${champ.name} wins the ${leagueName(tier)} regular season.${prize}`);
    }
  }
  buildPlayoff(save, tier, table.map((c) => c.id));
  if (!userIn(save, "playoff", tier)) simBracket(save, "playoff", tier);
  save.phase = "playoffs";
  const winner = playoffChampion(save, tier);
  if (winner && !userIn(save, "playoff", tier)) log(save, `${clubById(save, winner)?.name} takes the ${leagueName(tier)} tournament.`);
}

function enterRelegation(save: Save) {
  const tier = userClub(save).tier;
  const table = standings(save, tier);
  save.phase = "relegation";
  if (tier < 7) {
    const names = promotionIds(save, tier)
      .map((id) => clubById(save, id)?.name)
      .filter((name): name is string => !!name);
    if (names.length) log(save, `${names.join(" and ")} are promoted to the ${leagueName(tier + 1)}.`);
  }
  if (tier === 0) {
    log(save, "The Dust League has nowhere lower. The bottom two stay.");
    return;
  }
  const ninth = clubById(save, table[8]?.id ?? "");
  const tenth = clubById(save, table[9]?.id ?? "");
  if (ninth && tenth) log(save, `${ninth.name} and ${tenth.name} finish in the bottom two and drop to the ${leagueName(tier - 1)}.`);
}

function enterUniverse(save: Save) {
  sealClubs(save);
  const quals = collectQualifiers(save);
  const before = userClub(save).tier;
  applyPromotion(save);
  const after = userClub(save).tier;
  if (after > before) log(save, `Promoted to the ${leagueName(after)}.`);
  if (after < before) log(save, `Relegated to the ${leagueName(after)}.`);
  save.qualifiers = quals;
  buildUniverse(save, quals);
  if (!userIn(save, "universe", 0)) {
    simBracket(save, "universe", 0);
    const champ = universeChampion(save);
    if (champ) log(save, `${clubById(save, champ)?.name} are champions of the universe.`);
  }
  save.phase = "universe";
}

function openMarket(save: Save) {
  awardSeason(save);
  for (const club of save.clubs) {
    if (!club.ledger) continue;
    club.history.push({ ...club.ledger, universe: universeLabel(save, club.id) });
  }
  ageAndDevelop(save);
  for (const club of save.clubs) {
    club.budget = budgetFor(club);
    club.budgetNote = budgetNote(club);
  }
  resetStats(save);
  aiEmergencyRelease(save);
  save.phase = "market";
  log(save, "Free agency is open. Active deals run up to five seasons. Reserves run three, and only for players with under four years in.");
}

function setupSeason(save: Save) {
  resetStats(save);
  save.fixtures = buildFixtures(save);
  save.knockout = [];
  save.qualifiers = [];
  resolveOtherLeagues(save);
  save.phase = "season";
  log(save, `Season ${save.season} begins in the ${leagueName(userClub(save).tier)}.`);
}

function resolveOtherLeagues(save: Save) {
  const mine = userClub(save).tier;
  for (let tier = 0; tier < 8; tier++) {
    if (tier === mine) continue;
    for (const fixture of save.fixtures.filter((f) => f.tier === tier && f.hg === null)) {
      const scored = simSides(save, fixture.homeId, fixture.awayId, true);
      scoreFixture(save, fixture, scored.goalsA, scored.goalsB, undefined, scored.blastoff);
    }
    const table = standings(save, tier);
    if (table[0]) {
      const champ = clubById(save, table[0].id);
      if (champ) champ.rsTitle = true;
    }
    buildPlayoff(save, tier, table.map((c) => c.id));
    simBracket(save, "playoff", tier);
  }
}

function buildFixtures(save: Save) {
  const fixtures: Fixture[] = [];
  for (let tier = 0; tier < 8; tier++) {
    const ids = teamsIn(save, tier).map((c) => c.id);
    const rounds = roundRobin(ids);
    rounds.forEach((pairs, round) => {
      pairs.forEach(([home, away], i) => {
        const swap = round % 2 === 1;
        fixtures.push({
          id: `fx-${tier}-${round}-${i}`,
          tier,
          round,
          homeId: swap ? away : home,
          awayId: swap ? home : away,
          hg: null,
          ag: null,
          box: null,
        });
      });
    });
  }
  return fixtures;
}

function buildPlayoff(save: Save, tier: number, order: string[]) {
  const seeds = order.slice(0, 8);
  if (seeds.length < 8) return;
  const pairs = [
    [0, 7],
    [3, 4],
    [1, 6],
    [2, 5],
  ];
  const qf = pairs.map(([a, b], i) => {
    const match = blankKnock("playoff", tier, 0, `po-${tier}-0-${i}`, seeds[a], seeds[b]);
    save.knockout.push(match);
    return match.id;
  });
  const sf0 = blankKnock("playoff", tier, 1, `po-${tier}-1-0`, "", "");
  sf0.homeFrom = qf[0];
  sf0.awayFrom = qf[1];
  const sf1 = blankKnock("playoff", tier, 1, `po-${tier}-1-1`, "", "");
  sf1.homeFrom = qf[2];
  sf1.awayFrom = qf[3];
  const final = blankKnock("playoff", tier, 2, `po-${tier}-2-0`, "", "");
  final.homeFrom = sf0.id;
  final.awayFrom = sf1.id;
  save.knockout.push(sf0, sf1, final);
}

function buildUniverse(save: Save, quals: Qualifier[]) {
  const seeds = quals.map((q) => q.clubId);
  if (seeds.length < 16) return;
  const pairs = [
    [0, 15],
    [7, 8],
    [3, 12],
    [4, 11],
    [1, 14],
    [6, 9],
    [2, 13],
    [5, 10],
  ];
  const r16 = pairs.map(([a, b], i) => {
    const match = blankKnock("universe", 0, 0, `uni-0-${i}`, seeds[a], seeds[b]);
    save.knockout.push(match);
    return match.id;
  });
  const qf: string[] = [];
  for (let i = 0; i < 4; i++) {
    const match = blankKnock("universe", 0, 1, `uni-1-${i}`, "", "");
    match.homeFrom = r16[i * 2];
    match.awayFrom = r16[i * 2 + 1];
    save.knockout.push(match);
    qf.push(match.id);
  }
  const sf0 = blankKnock("universe", 0, 2, "uni-2-0", "", "");
  sf0.homeFrom = qf[0];
  sf0.awayFrom = qf[1];
  const sf1 = blankKnock("universe", 0, 2, "uni-2-1", "", "");
  sf1.homeFrom = qf[2];
  sf1.awayFrom = qf[3];
  const final = blankKnock("universe", 0, 3, "uni-3-0", "", "");
  final.homeFrom = sf0.id;
  final.awayFrom = sf1.id;
  save.knockout.push(sf0, sf1, final);
}

function collectQualifiers(save: Save): Qualifier[] {
  const list: Qualifier[] = [];
  for (let tier = 0; tier < 8; tier++) {
    const table = standings(save, tier);
    const rs = table[0]?.id;
    const cup = playoffChampion(save, tier);
    const runner = playoffRunner(save, tier);
    const picks = [rs, cup && cup !== rs ? cup : runner].filter((id): id is string => !!id && id !== list.find((q) => q.clubId === id)?.clubId);
    const unique: string[] = [];
    for (const id of picks) if (id && !unique.includes(id)) unique.push(id);
    for (const row of table) if (unique.length < 2 && !unique.includes(row.id)) unique.push(row.id);
    unique.slice(0, 2).forEach((id) => {
      const rank = Math.max(0, table.findIndex((row) => row.id === id));
      list.push({ clubId: id, tier, rank, champ: id === rs });
    });
  }
  return list.sort((a, b) => b.tier - a.tier || Number(b.champ) - Number(a.champ) || a.rank - b.rank);
}

function promotionIds(save: Save, tier: number) {
  const table = standings(save, tier);
  const rs = table[0]?.id;
  const cup = playoffChampion(save, tier);
  const runner = playoffRunner(save, tier);
  const second = cup && cup !== rs ? cup : runner && runner !== rs ? runner : table[1]?.id;
  const ids: string[] = [];
  for (const id of [rs, second]) if (id && !ids.includes(id)) ids.push(id);
  return ids;
}

function applyPromotion(save: Save) {
  const ups: { id: string; tier: number }[] = [];
  const downs: { id: string; tier: number }[] = [];
  for (let tier = 0; tier < 7; tier++) {
    const above = standings(save, tier + 1);
    for (const id of promotionIds(save, tier)) ups.push({ id, tier: tier + 1 });
    for (const id of [above[above.length - 2]?.id, above[above.length - 1]?.id]) if (id) downs.push({ id, tier });
  }
  for (const move of ups) {
    const club = clubById(save, move.id);
    if (club) club.tier = move.tier;
  }
  for (const move of downs) {
    const club = clubById(save, move.id);
    if (club) club.tier = move.tier;
  }
}

export function correctPromotion(save: Save): Save {
  const next = clone(save);
  if (!repairPromotion(next)) return save;
  return next;
}

function repairPromotion(save: Save) {
  const year = save.phase === "season" ? save.season - 1 : save.season;
  if (save.phase === "sign" || save.phase === "playoffs" || save.phase === "relegation" || year < 1) return false;
  const userTier = userClub(save).tier;
  if (save.phase === "season" && save.fixtures.some((fixture) => fixture.tier === userTier && fixture.hg !== null)) return false;
  const swaps: { up: Club; down: Club }[] = [];
  for (let tier = 0; tier < 7; tier++) {
    const rising = risingFrom(save, year, tier).filter((club) => club.tier === tier);
    const falling = fallingFrom(save, year, tier + 1).filter((club) => club.tier === tier + 1);
    const count = Math.min(rising.length, falling.length);
    for (let i = 0; i < count; i++) swaps.push({ up: rising[i], down: falling[i] });
  }
  if (!swaps.length) return false;
  for (const swap of swaps) {
    const higher = swap.down.tier;
    const lower = swap.up.tier;
    swap.up.tier = higher;
    swap.down.tier = lower;
  }
  if (save.phase === "season") {
    save.fixtures = buildFixtures(save);
    save.knockout = [];
    save.qualifiers = [];
    resolveOtherLeagues(save);
  }
  const me = userClub(save);
  if (swaps.some((swap) => swap.up.id === me.id)) log(save, `Promoted to the ${leagueName(me.tier)}.`);
  return true;
}

function seasonLine(club: Club, year: number, tier: number) {
  if (club.ledger && club.ledger.year === year && club.ledger.tier === tier) return club.ledger;
  return club.history.find((line) => line.year === year && line.tier === tier) ?? null;
}

function risingFrom(save: Save, year: number, tier: number) {
  const played = save.clubs.filter((club) => seasonLine(club, year, tier));
  const champ = played.find((club) => seasonLine(club, year, tier)?.playoff === "Champion");
  const doubled = !!champ && seasonLine(champ, year, tier)?.finish === 1;
  return played.filter((club) => {
    const line = seasonLine(club, year, tier);
    if (!line) return false;
    if (line.finish === 1 || line.playoff === "Champion") return true;
    return doubled && line.playoff === "Finalist";
  });
}

function fallingFrom(save: Save, year: number, tier: number) {
  return save.clubs.filter((club) => {
    const line = seasonLine(club, year, tier);
    return !!line && line.finish >= 9;
  });
}

function writeUserScore(save: Save, match: UserMatch, userGoals: number, oppGoals: number, sheet?: MatchSheet, blastoff?: boolean) {
  const hg = match.userHome ? userGoals : oppGoals;
  const ag = match.userHome ? oppGoals : userGoals;
  const sides = sheet ? splitSheet(save, match, sheet) : undefined;
  if (match.kind === "fixture") {
    const fixture = save.fixtures.find((f) => f.id === match.id);
    if (fixture && fixture.hg === null) scoreFixture(save, fixture, hg, ag, sides, blastoff);
    return;
  }
  const knock = save.knockout.find((m) => m.id === match.id);
  if (knock && knock.hg === null) scoreKnock(save, knock, hg, ag, sides, blastoff);
}

function sweepSiblings(save: Save, match: UserMatch) {
  if (match.kind === "fixture") {
    const fixture = save.fixtures.find((f) => f.id === match.id);
    if (!fixture) return;
    for (const other of save.fixtures) {
      if (other.tier !== fixture.tier || other.round !== fixture.round || other.hg !== null) continue;
      const scored = simSides(save, other.homeId, other.awayId, true);
      scoreFixture(save, other, scored.goalsA, scored.goalsB, undefined, scored.blastoff);
    }
    return;
  }
  let guard = 0;
  while (guard++ < 8) {
    const ready = save.knockout.filter(
      (m) =>
        m.hg === null &&
        m.homeId &&
        m.awayId &&
        m.homeId !== save.userClubId &&
        m.awayId !== save.userClubId &&
        sameComp(save, m, match.id),
    );
    if (!ready.length) break;
    const round = Math.min(...ready.map((m) => m.round));
    let moved = false;
    for (const other of ready.filter((m) => m.round === round)) {
      const scored = simSides(save, other.homeId, other.awayId, true);
      scoreKnock(save, other, scored.goalsA, scored.goalsB, undefined, scored.blastoff);
      moved = true;
    }
    if (!moved) break;
  }
}

function sameComp(save: Save, match: Knockout, id: string) {
  const mine = save.knockout.find((m) => m.id === id);
  return !!mine && mine.competition === match.competition && (match.competition === "universe" || mine.tier === match.tier);
}

function scoreFixture(save: Save, fixture: Fixture, hg: number, ag: number, sides?: SideSheet, blastoff?: boolean) {
  fixture.hg = hg;
  fixture.ag = ag;
  const home = clubById(save, fixture.homeId);
  const away = clubById(save, fixture.awayId);
  if (home) {
    home.gf += hg;
    home.ga += ag;
    if (hg > ag) home.wins += 1;
    else home.losses += 1;
  }
  if (away) {
    away.gf += ag;
    away.ga += hg;
    if (ag > hg) away.wins += 1;
    else away.losses += 1;
  }
  const homeLines = creditClub(save, fixture.homeId, hg, ag, sides?.home);
  const awayLines = creditClub(save, fixture.awayId, ag, hg, sides?.away);
  const boom = noteBlastoff(save, fixture.homeId, fixture.awayId, hg, ag, sides ? sides.blastoff : blastoff);
  fixture.box = { blastoff: boom, home: packLines(save, homeLines), away: packLines(save, awayLines) };
  publishReport(save, `Round ${fixture.round + 1} of 9`, fixture.homeId, fixture.awayId, hg, ag, fixture.box);
}

function scoreKnock(save: Save, match: Knockout, hg: number, ag: number, sides?: SideSheet, blastoff?: boolean) {
  match.hg = hg;
  match.ag = ag;
  const winnerId = hg > ag ? match.homeId : match.awayId;
  const winner = clubById(save, winnerId);
  if (winner) {
    if (match.competition === "playoff") winner.playoffWins += 1;
    if (match.competition === "universe") winner.universeWins += 1;
    if (match.competition === "playoff" && match.round === 2) winner.cupTitle = true;
    if (match.competition === "universe" && match.round === 3) winner.universeChamp = true;
  }
  const homeLines = creditClub(save, match.homeId, hg, ag, sides?.home);
  const awayLines = creditClub(save, match.awayId, ag, hg, sides?.away);
  const boom = noteBlastoff(save, match.homeId, match.awayId, hg, ag, sides ? sides.blastoff : blastoff);
  match.box = { blastoff: boom, home: packLines(save, homeLines), away: packLines(save, awayLines) };
  publishReport(save, roundLabel(match), match.homeId, match.awayId, hg, ag, match.box);
  feedWinner(save, match, winnerId);
}

function publishReport(save: Save, label: string, homeId: string, awayId: string, hg: number, ag: number, box: BoxScore) {
  if (homeId !== save.userClubId && awayId !== save.userClubId) return;
  save.report = { label, homeId, awayId, hg, ag, box };
}

function packLines(save: Save, lines: MatchLine[]): BoxLine[] {
  return lines
    .map((line) => {
      const player = playerById(save, line.id);
      return {
        id: line.id,
        name: player?.name ?? "Robot",
        kind: player?.kind ?? "skater",
        goals: line.goals,
        assists: line.assists,
        shots: line.shots,
        rushes: line.rushes,
        blasts: line.blasts,
        saves: line.saves,
        ga: line.ga,
        pokes: line.pokes,
      };
    })
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.saves - a.saves || a.name.localeCompare(b.name));
}

function feedWinner(save: Save, match: Knockout, winnerId: string) {
  for (const next of save.knockout) {
    if (next.homeFrom === match.id && !next.homeId) next.homeId = winnerId;
    if (next.awayFrom === match.id && !next.awayId) next.awayId = winnerId;
    if (next.homeId && next.awayId && !next.seated && (next.homeFrom === match.id || next.awayFrom === match.id)) {
      const homeSeed = seedOf(save, next, next.homeId);
      const awaySeed = seedOf(save, next, next.awayId);
      if (awaySeed < homeSeed) {
        const id = next.homeId;
        next.homeId = next.awayId;
        next.awayId = id;
        const from = next.homeFrom;
        next.homeFrom = next.awayFrom;
        next.awayFrom = from;
      }
      next.seated = true;
    }
  }
}

function seedOf(save: Save, match: Knockout, clubId: string) {
  if (match.competition === "universe") {
    const at = save.qualifiers.findIndex((q) => q.clubId === clubId);
    return at >= 0 ? at : 99;
  }
  const table = standings(save, match.tier);
  const at = table.findIndex((c) => c.id === clubId);
  return at >= 0 ? at : 99;
}

function simBracket(save: Save, competition: Knockout["competition"], tier: number) {
  for (let guard = 0; guard < 24; guard++) {
    const ready = save.knockout.filter(
      (m) => m.competition === competition && (competition === "universe" || m.tier === tier) && m.hg === null && m.homeId && m.awayId,
    );
    if (!ready.length) return;
    const round = Math.min(...ready.map((m) => m.round));
    for (const match of ready.filter((m) => m.round === round)) {
      const scored = simSides(save, match.homeId, match.awayId, true);
      scoreKnock(save, match, scored.goalsA, scored.goalsB, undefined, scored.blastoff);
    }
  }
}

function simLeftoverFixtures(save: Save, tier: number) {
  for (const fixture of save.fixtures.filter((f) => f.tier === tier && f.hg === null)) {
    const scored = simSides(save, fixture.homeId, fixture.awayId, true);
    scoreFixture(save, fixture, scored.goalsA, scored.goalsB, undefined, scored.blastoff);
  }
}

function userIn(save: Save, competition: Knockout["competition"], tier: number) {
  const me = save.userClubId;
  return save.knockout.some(
    (m) =>
      m.competition === competition &&
      (competition === "universe" || m.tier === tier) &&
      m.hg === null &&
      (m.homeId === me || m.awayId === me || feedsUser(save, m, me)),
  );
}

function feedsUser(save: Save, match: Knockout, me: string): boolean {
  const look = (id: string): boolean => {
    if (!id) return false;
    const prev = save.knockout.find((m) => m.id === id);
    if (!prev) return false;
    if (prev.homeId === me || prev.awayId === me) {
      if (prev.hg === null || prev.ag === null) return true;
      return (prev.hg > prev.ag ? prev.homeId : prev.awayId) === me;
    }
    return feedsUser(save, prev, me);
  };
  return look(match.homeFrom) || look(match.awayFrom);
}

function playoffChampion(save: Save, tier: number) {
  const final = save.knockout.find((m) => m.competition === "playoff" && m.tier === tier && m.round === 2 && m.hg !== null);
  if (!final) return null;
  return final.hg! > final.ag! ? final.homeId : final.awayId;
}

function playoffRunner(save: Save, tier: number) {
  const final = save.knockout.find((m) => m.competition === "playoff" && m.tier === tier && m.round === 2 && m.hg !== null);
  if (!final) return null;
  return final.hg! > final.ag! ? final.awayId : final.homeId;
}

function relegationLoser(save: Save, tier: number) {
  const match = save.knockout.find((m) => m.competition === "relegation" && m.tier === tier && m.hg !== null);
  if (!match) return null;
  return match.hg! < match.ag! ? match.homeId : match.awayId;
}

function universeChampion(save: Save) {
  const final = save.knockout.find((m) => m.competition === "universe" && m.round === 3 && m.hg !== null);
  if (!final) return null;
  return final.hg! > final.ag! ? final.homeId : final.awayId;
}

function simSides(save: Save, homeId: string, awayId: string, homeEdge: boolean) {
  const edge = (strength(save, homeId) - strength(save, awayId)) / 28 + (homeEdge ? 0.12 : 0);
  const homeWins = take(save) < clamp(0.5 + edge * 0.22, 0.12, 0.88);
  const kind = take(save);
  let winner = 5;
  let loser = 2;
  let blastoff = false;
  if (kind < 0.05) {
    blastoff = true;
    const roll = take(save);
    winner = roll < 0.22 ? 1 : roll < 0.52 ? 2 : roll < 0.8 ? 3 : 4;
    loser = Math.floor(take(save) * winner);
  } else if (kind < 0.09) {
    const roll = take(save);
    winner = roll < 0.22 ? 2 : roll < 0.58 ? 3 : 4;
    loser = Math.floor(take(save) * winner);
  } else if (kind < 0.1) {
    winner = 6;
    loser = 5;
    if (take(save) < 0.12) blastoff = true;
  } else {
    const lean = Math.abs(edge);
    const shut = 0.18 + lean * 0.35;
    const one = shut + 0.28;
    const two = one + 0.24;
    const three = two + 0.18;
    const roll = take(save);
    loser = roll < shut ? 0 : roll < one ? 1 : roll < two ? 2 : roll < three ? 3 : 4;
  }
  return { goalsA: homeWins ? winner : loser, goalsB: homeWins ? loser : winner, blastoff };
}

function strength(save: Save, clubId: string) {
  const club = clubById(save, clubId);
  if (!club) return 40;
  const cards = club.roster.map((id) => (id ? playerById(save, id) : null));
  const grades = teamGrades(cards);
  const goalie = cards[3]?.overall ?? 50;
  return grades.offense * 0.42 + grades.defense * 0.28 + grades.iq * 0.22 + goalie * 0.08;
}

const SCORING_PURSE = [24, 36, 52, 72, 100, 136, 184, 246];
const GOALIE_PURSE = [20, 30, 44, 60, 84, 114, 154, 206];

function budgetFor(club: Club) {
  const tier = clamp(club.tier, 0, 7);
  const previous = club.ledger ? clamp(club.ledger.tier, 0, 7) : tier;
  const promoted = !!club.ledger && club.tier > club.ledger.tier;
  const rate = promoted ? previous : tier;
  const base = promoted ? Math.round(BASE[previous] * 0.62 + BASE[tier] * 0.38) : BASE[tier];
  return (
    base +
    club.wins * PER_WIN[rate] +
    (club.rsTitle ? RS_BONUS[rate] : 0) +
    club.playoffWins * PO_WIN[rate] +
    (club.cupTitle ? CUP_BONUS[rate] : 0) +
    club.universeWins * UNI_WIN[rate] +
    (club.universeChamp ? UNI_BONUS[rate] : 0) +
    club.awardCash
  );
}

function budgetNote(club: Club) {
  const tier = clamp(club.tier, 0, 7);
  const previous = club.ledger ? clamp(club.ledger.tier, 0, 7) : tier;
  const promoted = !!club.ledger && club.tier > club.ledger.tier;
  const rate = promoted ? previous : tier;
  const base = promoted ? Math.round(BASE[previous] * 0.62 + BASE[tier] * 0.38) : BASE[tier];
  const bits = [promoted ? `Promotion purse ${base}` : `Base ${base}`, `${club.wins} wins ${club.wins * PER_WIN[rate]}`];
  if (club.rsTitle) bits.push(`season ${RS_BONUS[rate]}`);
  if (club.playoffWins) bits.push(`playoff ${club.playoffWins * PO_WIN[rate]}`);
  if (club.cupTitle) bits.push(`cup ${CUP_BONUS[rate]}`);
  if (club.universeWins) bits.push(`universe ${club.universeWins * UNI_WIN[rate]}`);
  if (club.universeChamp) bits.push(`champion ${UNI_BONUS[rate]}`);
  if (club.awardCash) bits.push(`awards ${club.awardCash}`);
  return bits.join(" · ");
}

function ageAndDevelop(save: Save) {
  const retire: string[] = [];
  for (const contract of [...save.contracts]) {
    const player = playerById(save, contract.playerId);
    const club = clubById(save, contract.clubId);
    if (!player || !club) continue;
    const games = club.wins + club.losses;
    const winRate = games ? club.wins / games : 0.5;
    const slot = club.roster.indexOf(player.id);
    archiveSeason(save, player, club);
    develop(save, player, winRate, slot >= 7);
    player.seasonsPlayed += 1;
    if (player.seasonsPlayed >= 10) {
      player.retired = true;
      retire.push(player.id);
      if (club.user) log(save, `${player.name} retired.`);
      continue;
    }
    contract.seasonsLeft -= 1;
    if (contract.seasonsLeft <= 0) {
      const at = club.roster.indexOf(player.id);
      clearSlot(club, player.id);
      save.contracts = save.contracts.filter((c) => c.playerId !== player.id);
      if (at >= 7) club.rights.push(player.id);
      else if (at >= 0) club.unretained.push(player.id);
      if (club.user) log(save, at >= 7 ? `${player.name}'s reserve deal ended. First dibs are yours.` : `${player.name}'s contract expired.`);
    }
  }
  for (const id of retire) {
    for (const club of save.clubs) clearSlot(club, id);
    save.contracts = save.contracts.filter((c) => c.playerId !== id);
  }
  for (const club of save.clubs) orderLineup(save, club);
  const rng = makeRng(save.seed || 1);
  const rollBand = () => {
    const roll = rng.next();
    if (roll < 0.32) return 46 + Math.floor(rng.next() * 12);
    if (roll < 0.58) return 58 + Math.floor(rng.next() * 12);
    if (roll < 0.82) return 70 + Math.floor(rng.next() * 12);
    return 82 + Math.floor(rng.next() * 12);
  };
  for (let i = 0; i < 8; i++) addFree(save, makeGoalie(save, rng, rollBand()));
  for (let i = 0; i < 36; i++) addFree(save, makeSkater(save, rng, rollBand()));
  save.seed = rng.seed();
}

function develop(save: Save, player: LeaguePlayer, winRate: number, reserve: boolean) {
  player.prior = { ...player.ratings };
  if (player.season.games < 4) {
    if (reserve) nudgeToward(save, player, true);
    return;
  }
  const age = player.seasonsPlayed;
  const roll = take(save);
  let dir = 0;
  if (age >= 7 && roll < 0.62) dir = -1;
  else if (age <= 3 && winRate >= 0.4 && roll < 0.42) dir = 1;
  else if (winRate >= 0.65 && roll < 0.5) dir = 1;
  else if (winRate <= 0.3 && roll < 0.45) dir = -1;
  else if (roll < 0.18) dir = take(save) < 0.5 ? -1 : 1;
  if (dir > 0) nudgeToward(save, player, false);
  else if (dir < 0) nudgeDown(save, player);
}

function nudgeToward(save: Save, player: LeaguePlayer, farm: boolean) {
  const now = player.ratings as Record<string, number>;
  const cap = (player.potential ?? player.ratings) as unknown as Record<string, number>;
  const keys = Object.keys(now).filter((key) => now[key] < (cap[key] ?? now[key]) && now[key] < 11);
  if (!keys.length) return;
  if (farm) {
    const gap = (potentialOverall(player) - player.overall) / 12;
    if (gap < 0.35 || take(save) >= 0.6) return;
  }
  const key = keys[Math.floor(take(save) * keys.length)];
  now[key] += 1;
  retuneOverall(player);
}

function nudgeDown(save: Save, player: LeaguePlayer) {
  const now = player.ratings as Record<string, number>;
  const keys = Object.keys(now).filter((key) => now[key] > 1);
  if (!keys.length) return;
  const key = keys[Math.floor(take(save) * keys.length)];
  now[key] -= 1;
  retuneOverall(player);
}

function retuneOverall(player: LeaguePlayer) {
  player.overall = player.kind === "skater" ? overallSkater(player.ratings) : overallGoalie(player.ratings as GoalieRatings);
}

function aiEmergencyRelease(save: Save) {
  for (const club of save.clubs) {
    if (club.user) continue;
    while (payroll(save, club.id) > club.budget) {
      const held = club.roster
        .map((id, index) => ({ id, index, player: id ? playerById(save, id) : null }))
        .filter((row): row is { id: string; index: number; player: LeaguePlayer } => !!row.player);
      if (!held.length) break;
      held.sort((a, b) => slotWeight(a.index) - slotWeight(b.index) || a.player.overall - b.player.overall);
      clearSlot(club, held[0].id);
      save.contracts = save.contracts.filter((c) => c.playerId !== held[0].id);
    }
  }
}

function emergencyFill(save: Save) {
  const rng = makeRng(save.seed || 1);
  const clubs = [...save.clubs].sort((a, b) => b.tier - a.tier);
  for (const club of clubs) {
    if (club.user) continue;
    for (let slot = 0; slot < 7; slot++) {
      if (club.roster[slot]) continue;
      const kind = slot === 3 ? "goalie" : "skater";
      const target = TIER_MEAN[clamp(club.tier, 0, 7)];
      let space = room(save, club.id);
      const floorWage = playerWage(Math.max(46, target - 8));
      if (space < floorWage) {
        club.budget += floorWage - Math.max(0, space);
        space = room(save, club.id);
      }
      const agents = freeAgents(save)
        .filter((player) => player.kind === kind && playerWage(player.overall) <= space)
        .sort((a, b) => b.overall - a.overall);
      let pick = agents.find((player) => player.overall >= target - 8) ?? null;
      if (!pick) {
        const minted = Math.min(target, overallForWage(space));
        pick = kind === "goalie" ? makeGoalie(save, rng, minted) : makeSkater(save, rng, minted);
        addFree(save, pick);
      }
      const wage = playerWage(pick.overall);
      club.roster[slot] = pick.id;
      const left = Math.max(1, 10 - pick.seasonsPlayed);
      save.contracts.push({
        playerId: pick.id,
        clubId: club.id,
        wage,
        seasonsLeft: clamp(1 + Math.floor(rng.next() * 2), 1, Math.min(3, left)),
        signedInWindow: false,
      });
      if (payroll(save, club.id) > club.budget) club.budget = payroll(save, club.id);
    }
    orderLineup(save, club);
  }
  save.seed = rng.seed();
}

function overallForWage(money: number) {
  let best = 44;
  for (let overall = 44; overall <= 96; overall++) if (playerWage(overall) <= money) best = overall;
  return best;
}

function aiShopping(save: Save) {
  for (const club of save.clubs) {
    if (club.user) continue;
    for (const id of [...club.rights]) claimRight(save, club, id);
  }
  for (const club of save.clubs) {
    if (club.user) continue;
    club.rights = [];
    club.unretained = [];
  }
  const agents = freeAgents(save);
  for (const player of agents) {
    let best: { club: Club; wage: number; drop: LeaguePlayer | null } | null = null;
    for (const club of save.clubs) {
      if (club.user) continue;
      const drop = worstUpgrade(save, club, player);
      if (!drop) continue;
      const pay = payroll(save, club.id) - (drop.id ? wageOf(save, drop.id) : 0);
      const space = club.budget - pay;
      const demand = playerWage(player.overall);
      if (space < demand) continue;
      const offer = Math.min(space, Math.round(demand * (1 + Math.min(0.3, (player.overall - drop.overall) / 50))));
      if (!best || offer > best.wage || (offer === best.wage && club.tier > best.club.tier)) best = { club, wage: offer, drop: drop.id ? drop : null };
    }
    if (!best) continue;
    if (best.drop) {
      clearSlot(best.club, best.drop.id);
      save.contracts = save.contracts.filter((c) => c.playerId !== best!.drop!.id);
    }
    const slot = openSlot(save, best.club, player);
    if (slot < 0) continue;
    best.club.roster[slot] = player.id;
    const years = clamp(Math.min(maxYears(player), 1 + Math.floor(take(save) * 5)), 1, 5);
    save.contracts.push({ playerId: player.id, clubId: best.club.id, wage: best.wage, seasonsLeft: years, signedInWindow: false });
    stripClaims(save, player.id);
  }
  for (const club of save.clubs) orderLineup(save, club);
  stockAiReserves(save);
}

function claimRight(save: Save, club: Club, playerId: string) {
  const player = playerById(save, playerId);
  if (!player || player.retired || contractFor(save, playerId)) return;
  const drop = worstUpgrade(save, club, player);
  if (!drop) return;
  const wage = Math.max(4, Math.round(playerWage(player.overall) * 0.72));
  const pay = payroll(save, club.id) - (drop.id ? wageOf(save, drop.id) : 0);
  if (club.budget - pay < wage) return;
  if (drop.id) {
    clearSlot(club, drop.id);
    save.contracts = save.contracts.filter((c) => c.playerId !== drop.id);
  }
  const slot = openSlot(save, club, player);
  if (slot < 0) return;
  club.roster[slot] = player.id;
  const years = clamp(Math.min(maxYears(player), 2), 1, 5);
  save.contracts.push({ playerId, clubId: club.id, wage, seasonsLeft: years, signedInWindow: false });
  stripClaims(save, playerId);
}

function bestAiBid(save: Save, player: LeaguePlayer) {
  let best: { name: string; wage: number; tier: number } | null = null;
  for (const club of save.clubs) {
    if (club.user) continue;
    const drop = worstUpgrade(save, club, player);
    if (!drop) continue;
    const pay = payroll(save, club.id) - (drop.id ? wageOf(save, drop.id) : 0);
    const space = club.budget - pay;
    const demand = playerWage(player.overall);
    if (space < demand) continue;
    const offer = Math.min(space, Math.round(demand * (1 + Math.min(0.3, (player.overall - drop.overall) / 50))));
    if (!best || offer > best.wage || (offer === best.wage && club.tier > best.tier)) best = { name: club.name, wage: offer, tier: club.tier };
  }
  return best;
}

function worstUpgrade(save: Save, club: Club, player: LeaguePlayer): (LeaguePlayer & { id: string }) | null {
  const kindSlots = club.roster
    .map((id, index) => ({ id, index, player: id ? playerById(save, id) : null }))
    .filter((slot) => slot.index < ACTIVE_SLOTS && (player.kind === "goalie" ? slot.index === 3 : slot.index !== 3));
  const empty = kindSlots.find((slot) => !slot.player);
  if (empty) return { ...(player.kind === "goalie" ? makeDummyGoalie() : makeDummySkater()), id: "" };
  const held = kindSlots.map((slot) => slot.player).filter((p): p is LeaguePlayer => !!p);
  if (!held.length) return null;
  held.sort((a, b) => a.overall - b.overall);
  if (player.overall < held[0].overall + 2) return null;
  return held[0];
}

function openSlot(save: Save, club: Club, player: LeaguePlayer) {
  return club.roster.findIndex((id, index) => index < ACTIVE_SLOTS && !id && slotOk(player, index));
}

function clearSlot(club: Club, playerId: string) {
  const at = club.roster.indexOf(playerId);
  if (at >= 0) club.roster[at] = "";
}

function wageOf(save: Save, playerId: string) {
  return contractFor(save, playerId)?.wage ?? 0;
}

function fillAiRoster(save: Save, rng: Rng, club: Club, mean: number) {
  const goalie = makeGoalie(save, rng, around(rng, mean, 3));
  const targets = [around(rng, mean + 6, 2), around(rng, mean + 5, 2), around(rng, mean + 4, 2), around(rng, mean - 8, 3), around(rng, mean - 14, 3), around(rng, mean - 20, 3)];
  const skaters = targets.map((target) => makeSkater(save, rng, target)).sort((a, b) => b.overall - a.overall);
  const slots = [0, 1, 2, 4, 5, 6];
  const place = (player: LeaguePlayer, slot: number, wage = playerWage(player.overall), yearsCap = 5) => {
    player.seasonsPlayed = slot >= 7 ? Math.floor(rng.next() * 3) : livedSeasons(rng, save.season, 0.9);
    assignPotential(() => rng.next(), player, slot >= 7 ? 4 : 0);
    inventHistory(rng, player, club.name, club.tier, save.season);
    save.players.push(player);
    club.roster[slot] = player.id;
    const left = Math.max(1, 10 - player.seasonsPlayed);
    const years = clamp(Math.min(left, yearsCap, 1 + Math.floor(rng.next() * yearsCap)), 1, Math.min(yearsCap, left));
    save.contracts.push({ playerId: player.id, clubId: club.id, wage, seasonsLeft: years, signedInWindow: false });
  };
  place(goalie, 3);
  skaters.forEach((player, index) => place(player, slots[index]));
  if (rng.next() < 0.4) {
    const prospect = makeSkater(save, rng, around(rng, mean - 16, 4));
    place(prospect, 7, Math.max(4, Math.round(playerWage(prospect.overall) * 0.55)), 3);
  }
}

function stockFree(save: Save, rng: Rng, player: LeaguePlayer) {
  const veteran = rng.next() < 0.78;
  const seasons = veteran ? livedSeasons(rng, save.season, 1) : 0;
  player.seasonsPlayed = seasons;
  assignPotential(() => rng.next(), player, seasons <= 1 ? 2 : 0);
  const tier = Math.floor(rng.next() * 3);
  inventHistory(rng, player, clubName(rng, new Set()), tier, save.season);
  save.players.push(player);
}

function addFree(save: Save, player: LeaguePlayer) {
  player.seasonsPlayed = 0;
  player.history = [];
  player.season = emptyForm();
  player.prior = null;
  if (!player.planet) player.planet = PLANETS[Math.floor(take(save) * PLANETS.length)];
  assignPotential(() => take(save), player, 2);
  save.players.push(player);
}

function makeSkater(save: Save, rng: Rng, target: number): LeaguePlayer {
  const ratings = ratingsNear(rng, target, ["speed", "agility", "shot", "attack", "defense", "handling", "toughness"]);
  let card: LeaguePlayer = {
    id: serial(save, "p"),
    name: personName(rng, save),
    kind: "skater",
    ratings: ratings as SkaterRatings,
    overall: 0,
    styles: rollStyles(rng),
    perks: rollPerks(rng),
    hue: Math.floor(rng.next() * 360),
    visor: Math.floor(rng.next() * 3),
    antenna: Math.floor(rng.next() * 4),
    seasonsPlayed: 0,
    history: [],
    season: emptyForm(),
    awards: [],
    retired: false,
    planet: PLANETS[Math.floor(rng.next() * PLANETS.length)],
    potential: { ...(ratings as SkaterRatings) },
    prior: null,
  };
  card.overall = overallSkater(card.ratings);
  tune(card, target, rng);
  return card;
}

function makeGoalie(save: Save, rng: Rng, target: number): LeaguePlayer {
  const ratings = ratingsNear(rng, target, ["speed", "agility", "iq", "rebound", "composure", "poke"]);
  const card: LeaguePlayer = {
    id: serial(save, "p"),
    name: personName(rng, save),
    kind: "goalie",
    ratings: ratings as GoalieRatings,
    overall: 0,
    styles: rollStyles(rng),
    perks: rollPerks(rng).slice(0, 2),
    hue: Math.floor(rng.next() * 360),
    visor: Math.floor(rng.next() * 3),
    antenna: 0,
    seasonsPlayed: 0,
    history: [],
    season: emptyForm(),
    awards: [],
    retired: false,
    planet: PLANETS[Math.floor(rng.next() * PLANETS.length)],
    potential: { ...(ratings as GoalieRatings) },
    prior: null,
  };
  card.overall = overallGoalie(card.ratings as GoalieRatings);
  tune(card, target, rng);
  return card;
}

function tune(player: LeaguePlayer, target: number, rng: Rng) {
  const keys =
    player.kind === "skater"
      ? (["speed", "agility", "shot", "attack", "defense", "handling", "toughness"] as const)
      : (["speed", "agility", "iq", "rebound", "composure", "poke"] as const);
  for (let i = 0; i < 8 && Math.abs(player.overall - target) > 2; i++) {
    const key = keys[Math.floor(rng.next() * keys.length)];
    const dir = player.overall < target ? 1 : -1;
    if (player.kind === "skater") {
      const ratings = player.ratings as SkaterRatings;
      const stat = key as keyof SkaterRatings;
      ratings[stat] = clamp(ratings[stat] + dir, 1, 11);
      player.overall = overallSkater(ratings);
    } else {
      const ratings = player.ratings as GoalieRatings;
      const stat = key as keyof GoalieRatings;
      ratings[stat] = clamp(ratings[stat] + dir, 1, 11);
      player.overall = overallGoalie(ratings);
    }
  }
}

function ratingsNear(rng: Rng, target: number, keys: string[]) {
  const mean = clamp((target * 11) / 100, 2, 10);
  const ratings: Record<string, number> = {};
  for (const key of keys) ratings[key] = clamp(Math.round(mean + (rng.next() + rng.next() - 1) * 2.4), 1, 11);
  return ratings;
}

function blankClub(id: string, name: string, tag: string, kit: Kit, tier: number, user: boolean): Club {
  return {
    id,
    name,
    tag,
    kit,
    tier,
    user,
    budget: 0,
    budgetNote: "",
    roster: ["", "", "", "", "", "", "", "", "", ""],
    habits: { bounce: 40, earlyShot: 40, crash: 40, patient: 40, risk: 40 },
    wins: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    blastoffs: 0,
    awardCash: 0,
    playoffWins: 0,
    rsTitle: false,
    cupTitle: false,
    universeWins: 0,
    universeChamp: false,
    history: [],
    ledger: null,
    planet: "",
    rights: [],
    unretained: [],
  };
}

function blankKnock(competition: Knockout["competition"], tier: number, round: number, id: string, homeId: string, awayId: string): Knockout {
  return { id, competition, tier, round, homeId, awayId, hg: null, ag: null, box: null, homeFrom: "", awayFrom: "", seated: !!homeId && !!awayId };
}

function resetStats(save: Save) {
  for (const club of save.clubs) {
    club.wins = 0;
    club.losses = 0;
    club.gf = 0;
    club.ga = 0;
    club.playoffWins = 0;
    club.rsTitle = false;
    club.cupTitle = false;
    club.universeWins = 0;
    club.universeChamp = false;
    club.blastoffs = 0;
    club.awardCash = 0;
    club.ledger = null;
  }
}

function describe(save: Save, kind: UserMatch["kind"], id: string, homeId: string, awayId: string, label: string): UserMatch {
  const userHome = homeId === save.userClubId;
  const opponentId = userHome ? awayId : homeId;
  return { kind, id, opponentId, opponentName: clubById(save, opponentId)?.name ?? "Opponent", userHome, label };
}

function roundLabel(match: Knockout) {
  if (match.competition === "relegation") return "Relegation game";
  if (match.competition === "universe") return ["Universe round of 16", "Universe quarterfinal", "Universe semifinal", "Universe final"][match.round] ?? "Universe";
  return ["Quarterfinal", "Semifinal", "Final"][match.round] ?? "Playoff";
}

function roundRobin(ids: string[]) {
  const list = [...ids];
  const rounds: [string, string][][] = [];
  for (let r = 0; r < list.length - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < list.length / 2; i++) pairs.push([list[i], list[list.length - 1 - i]]);
    rounds.push(pairs);
    const last = list.pop()!;
    list.splice(1, 0, last);
  }
  return rounds;
}

function log(save: Save, text: string) {
  save.news.unshift(text);
  save.news = save.news.slice(0, 16);
}

function serial(save: Save, prefix: string) {
  const id = `${prefix}${save.nextSerial}`;
  save.nextSerial += 1;
  return id;
}

function preferredPrestige(overall: number) {
  return clamp(8 + ((overall - 42) / 57) * 84, 4, 96);
}

function assignPotential(next: () => number, player: LeaguePlayer, extra = 0) {
  const src = player.ratings as Record<string, number>;
  const pot: Record<string, number> = {};
  for (const key of Object.keys(src)) pot[key] = src[key];
  const young = player.seasonsPlayed <= 2 ? 2 : player.seasonsPlayed <= 4 ? 1 : 0;
  let points = young + extra;
  if (player.seasonsPlayed >= 7) points = next() < 0.25 ? 1 : 0;
  else if (next() < 0.35) points += 1;
  const keys = Object.keys(pot);
  for (let i = 0; i < points; i++) {
    const key = keys[Math.floor(next() * keys.length)];
    if (pot[key] < 11) pot[key] += 1;
  }
  player.potential = pot as LeaguePlayer["potential"];
}

function stripClaims(save: Save, playerId: string) {
  for (const club of save.clubs) {
    club.rights = club.rights.filter((id) => id !== playerId);
    club.unretained = club.unretained.filter((id) => id !== playerId);
  }
}

function orderLineup(save: Save, club: Club) {
  if (club.user) return;
  const slots = [0, 1, 2, 4, 5, 6];
  const ids = slots.map((index) => club.roster[index]);
  const players = ids.map((id) => (id ? playerById(save, id) : null)).filter((p): p is LeaguePlayer => !!p && p.kind === "skater");
  if (players.length !== ids.filter(Boolean).length) return;
  players.sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
  slots.forEach((index, i) => {
    club.roster[index] = players[i]?.id ?? "";
  });
}

function stockAiReserves(save: Save) {
  for (const club of save.clubs) {
    if (club.user || club.roster[7]) continue;
    if (take(save) > 0.45) continue;
    const mean = TIER_MEAN[clamp(club.tier, 0, 7)];
    const space = room(save, club.id);
    const prospects = freeAgents(save)
      .filter((player) => player.seasonsPlayed < 4 && player.overall <= mean - 8 && potentialOverall(player) >= player.overall + 4)
      .sort((a, b) => potentialOverall(b) - potentialOverall(a) || a.overall - b.overall);
    const pick = prospects.find((player) => Math.round(playerWage(player.overall) * 0.55) <= space);
    if (!pick) continue;
    const wage = Math.max(4, Math.round(playerWage(pick.overall) * 0.55));
    const years = clamp(Math.min(3, maxYears(pick), 1 + Math.floor(take(save) * 3)), 1, 3);
    club.roster[7] = pick.id;
    save.contracts.push({ playerId: pick.id, clubId: club.id, wage, seasonsLeft: years, signedInWindow: false });
    stripClaims(save, pick.id);
  }
}

function inventClubHistory(rng: Rng, club: Club, opening: number) {
  const years = 3 + Math.floor(rng.next() * 3);
  const profile = Math.floor(rng.next() * 10);
  const lines: ClubYear[] = [];
  for (let ago = years; ago >= 1; ago--) {
    const finish = clamp(10 - profile + Math.floor(rng.next() * 3) - 1, 1, 10);
    const wins = clamp(Math.round((10 - finish) * 0.85 + rng.next() * 2), 0, 9);
    const losses = Math.max(0, 9 - wins);
    const playoff = finish > 8 ? "Missed" : rng.next() < 0.1 ? "Champion" : finish <= 2 && rng.next() < 0.45 ? "Finalist" : "Quarterfinal";
    const universe = rng.next() < 0.03 ? "Champion" : "—";
    lines.push({
      year: opening - ago,
      tier: club.tier,
      wins,
      losses,
      gf: wins * 4 + finish,
      ga: losses * 4 + (10 - finish),
      finish,
      playoff,
      universe,
      blastoffs: rng.next() < 0.2 ? 1 : 0,
      offense: TIER_MEAN[club.tier],
      defense: TIER_MEAN[club.tier],
      iq: TIER_MEAN[club.tier],
    });
  }
  club.history = lines;
}

function slotOk(player: { kind: string } | null, slot: number) {
  if (!player) return true;
  if (slot >= 7) return true;
  return slot === 3 ? player.kind === "goalie" : player.kind === "skater";
}

export function slotAccepts(player: { kind: string; seasonsPlayed: number } | null, slot: number, moving = false) {
  if (!player) return true;
  if (slot >= 7 && slot < SLOT_NAMES.length) return moving || player.seasonsPlayed < 4;
  if (slot === 3) return player.kind === "goalie";
  if (slot >= 0 && slot < ACTIVE_SLOTS) return player.kind === "skater";
  return false;
}

function personName(rng: Rng, save: Save) {
  const a = ["Ash", "Blip", "Cairn", "Dox", "Ember", "Fenn", "Goss", "Hale", "Ivo", "Joss", "Kerr", "Lumen", "Moth", "Nix", "Orla", "Pell", "Quill", "Rune", "Silo", "Tarn", "Voss", "Wick", "Yarrow", "Zed", "Bram", "Cove", "Flint", "Glint", "Hush", "Jett", "Knox", "Lark", "Nova", "Puck", "Rook", "Sable", "Tilt", "Umbra", "Vex", "Wisp", "Axle", "Cinder", "Halo", "Nimbus", "Torque", "Echo", "Frost", "Drift", "Ion", "Hex", "Arlo", "Bex", "Cleo", "Dax", "Esme", "Faye", "Gio", "Hana", "Idris", "June", "Kade", "Lena", "Moss", "Nico", "Orin", "Pia", "Remy", "Sol", "Tove", "Uma", "Veda", "Wes", "Yael", "Zuri", "Anya", "Cruz", "Dove", "Enzo", "Fern", "Indi", "Maren", "Noel", "Otto", "Penn", "Rhett", "Shay", "True", "Wolf", "Zia", "Brin", "Cass", "Deke", "Elia", "Faro", "Gita", "Inez", "Jori", "Kael", "Lior", "Mira", "Nils", "Opal", "Pria", "Rafi", "Quinn"];
  const b = ["Keel", "Vale", "Pike", "Bloom", "Coil", "Dusk", "Gale", "Hart", "Onyx", "Quay", "Soren", "Tess", "Wynn", "Beck", "Dune", "Holt", "Isle", "Kite", "Loom", "Marsh", "North", "Orb", "Prism", "Quartz", "Ridge", "Stone", "Thorn", "Veld", "West", "Amber", "Bolt", "Creek", "Forge", "Glyph", "Harbor", "Index", "Jewel", "Knot", "Latch", "Meter", "Ashby", "Brant", "Calder", "Darrow", "Ellis", "Frost", "Galvan", "Hale", "Ibarra", "Keene", "Locke", "Marlow", "Nyx", "Ortega", "Park", "Quill", "Rowan", "Sato", "Ulric", "Voss", "Ward", "Yue", "Zahn", "Bale", "Crowe", "Drake", "Estes", "Finch", "Gore", "Harth", "Ives", "Kline", "Lowe", "Nguyen", "Okada", "Pell", "Ruiz", "Shaw", "Trent", "Vega", "Walsh", "Zhou", "Cho", "Diaz", "Fox", "Grant", "Holm", "Iyer", "Jung", "Kraft", "Lang", "Moss", "Quinn", "Reid", "Solis", "Tran", "Umber"];
  let name = `${a[Math.floor(rng.next() * a.length)]} ${b[Math.floor(rng.next() * b.length)]}`;
  for (let i = 0; i < 6; i++) {
    if (!save.players.some((player) => player.name === name)) return name;
    name = `${a[Math.floor(rng.next() * a.length)]} ${b[Math.floor(rng.next() * b.length)]}`;
  }
  return name;
}

function clubName(rng: Rng, used: Set<string>) {
  const adj = ["Silent", "Rusty", "Polar", "Violet", "Hollow", "Rapid", "Glass", "Amber", "Outer", "Little", "Iron", "Pale", "Wild", "Neon", "Dusty", "Copper", "Lunar", "Feral", "Quiet", "Bold", "Remote", "Silver", "Broken", "Bright", "Cold", "Heavy", "Keen", "Noble", "Prime", "Low", "Crimson", "Azure", "Gilded", "Midnight", "Northern", "Scarlet", "Golden", "Ivory", "Velvet", "Crooked", "Wandering", "Bitter", "Lucky", "Black", "White", "Gray", "Red", "Green", "Blue", "Last", "First", "Hidden", "Roaring", "Still", "Burning", "Frozen", "Electric", "Marble", "Tin", "Oak", "Salt"];
  const noun = ["Comets", "Rooks", "Kites", "Drifters", "Beacons", "Cinders", "Rangers", "Signals", "Voyagers", "Sparks", "Lanterns", "Pilots", "Gliders", "Echoes", "Hulls", "Wakes", "Orbits", "Relays", "Flares", "Needles", "Anchors", "Crowns", "Embers", "Lances", "Pulses", "Mirrors", "Rafters", "Sails", "Thorns", "Vaults", "Foxes", "Wolves", "Hawks", "Otters", "Ravens", "Pikes", "Badgers", "Herons", "Jackals", "Moths", "Vipers", "Titans", "Saints", "Ghosts", "Kings", "Jesters", "Miners", "Smiths", "Barons", "Knights", "Sirens", "Cyclones", "Harbors", "Bridges", "Foundries", "Cannons", "Arrows", "Banners", "Engines", "Circuits", "Owls", "Stags", "Boats", "Hammers"];
  for (let i = 0; i < 80; i++) {
    const name = `${adj[Math.floor(rng.next() * adj.length)]} ${noun[Math.floor(rng.next() * noun.length)]}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const name = `Club ${used.size + 1}`;
  used.add(name);
  return name;
}

function uniqueTag(save: Save, name: string) {
  const letters = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const base = (letters.slice(0, 3) || "CLB").padEnd(3, "X");
  let tag = base;
  let n = 2;
  const taken = new Set(save.clubs.map((c) => c.tag));
  while (taken.has(tag)) {
    tag = `${base.slice(0, 2)}${n}`;
    n += 1;
  }
  return tag;
}

function habitsFrom(rng: Rng): TeamHabits {
  const one = () => Math.floor(rng.next() * 101);
  return { bounce: one(), earlyShot: one(), crash: one(), patient: one(), risk: one() };
}

function rollStyles(rng: Rng): Styles {
  const one = () => 12 + Math.floor(rng.next() * 76);
  return { aggressive: one(), shooter: one(), wide: one(), physical: one() };
}

function rollPerks(rng: Rng): Perk[] {
  const roll = rng.next();
  const count = roll < 0.38 ? 0 : roll < 0.72 ? 1 : roll < 0.92 ? 2 : 3;
  const bag = [...PERKS];
  const out: Perk[] = [];
  for (let i = 0; i < count; i++) out.push(bag.splice(Math.floor(rng.next() * bag.length), 1)[0]);
  return out;
}

function randomKit(rng: Rng): Kit {
  const primary = Math.floor(rng.next() * 360);
  let secondary = (primary + 36 + Math.floor(rng.next() * 150)) % 360;
  if (hueGap(primary, secondary) < 20) secondary = (primary + 80) % 360;
  const twoTone = rng.next() < 0.28;
  let accent = twoTone ? secondary : (secondary + 40 + Math.floor(rng.next() * 120)) % 360;
  if (!twoTone && hueGap(accent, primary) < 24 && hueGap(accent, secondary) < 24) accent = (accent + 100) % 360;
  const lights = [6, 22, 42, 58, 74, 96];
  const neutral: NonNullable<Kit["neutral"]> = {};
  if (rng.next() < 0.2) neutral.primary = lights[Math.floor(rng.next() * lights.length)];
  if (rng.next() < 0.24) neutral.secondary = lights[Math.floor(rng.next() * lights.length)];
  if (!twoTone && rng.next() < 0.16) neutral.accent = lights[Math.floor(rng.next() * lights.length)];
  if (typeof neutral.primary === "number" && typeof neutral.secondary === "number" && Math.abs(neutral.primary - neutral.secondary) < 18) delete neutral.secondary;
  return { primary, secondary, accent, mark: Math.floor(rng.next() * 6), neutral: Object.keys(neutral).length ? neutral : undefined };
}

function kitAround(primary: number): Kit {
  return { primary, secondary: (primary + 48) % 360, accent: (primary + 180) % 360 };
}

function livedSeasons(rng: Rng, opening: number, chance: number) {
  const cap = Math.min(8, Math.max(0, opening - 1));
  if (cap <= 0 || rng.next() > chance) return 0;
  return 1 + Math.floor(rng.next() * cap);
}

function inventHistory(rng: Rng, player: LeaguePlayer, homeClub: string, tier: number, opening: number) {
  player.history = [];
  player.season = emptyForm();
  let club = rng.next() < 0.62 ? homeClub : clubName(rng, new Set());
  let rung = tier;
  for (let ago = player.seasonsPlayed; ago >= 1; ago--) {
    if (rng.next() < 0.24) {
      club = rng.next() < 0.45 ? homeClub : clubName(rng, new Set());
      rung = clamp(rung + (rng.next() < 0.5 ? -1 : 1), 0, 7);
    }
    const games = 7 + Math.floor(rng.next() * 3);
    const note = pastNote(rng, rung);
    if (player.kind === "goalie") {
      const ratings = player.ratings as GoalieRatings;
      const winRate = 0.22 + (player.overall / 100) * 0.5;
      const wins = clamp(Math.round(games * winRate + (rng.next() - 0.5) * 2), 0, games);
      const ga = Math.max(0, Math.round(games * (3.6 - player.overall / 42) + rng.next() * 3));
      const shutouts = rng.next() < 0.22 ? 1 : rng.next() < 0.05 ? 2 : 0;
      const saves = ga + 4 + Math.floor(rng.next() * (5 + player.overall / 18));
      const pokes = Math.floor(rng.next() * (3 + ratings.poke));
      let lineNote = note;
      if (!lineNote && ga / games < 2.1 && rng.next() < 0.08) {
        lineNote = "Best goalie";
        player.awards.push({ year: opening - ago, tier: rung, title: "Best goalie" });
      }
      player.history.push({ year: opening - ago, club, tier: rung, games, goals: 0, assists: 0, shots: 0, rushes: 0, blasts: 0, wins, ga, saves, pokes, shutouts, note: lineNote });
    } else {
      const ratings = player.ratings as SkaterRatings;
      const goals = clamp(Math.round((ratings.shot / 11) * games * 0.62 * (0.35 + rng.next())), 0, 16);
      const assists = clamp(Math.round((ratings.attack / 11) * games * 0.55 * (0.35 + rng.next())), 0, 16);
      const rushes = clamp(Math.round(goals * (0.12 + ratings.attack / 40) * rng.next()), 0, goals);
      const shots = goals - rushes + 2 + Math.floor(rng.next() * (2 + ratings.shot / 2));
      const blasts = Math.floor(rng.next() * rng.next() * (1 + ratings.shot / 3));
      let lineNote = note;
      if (!lineNote && goals >= 5 && rng.next() < 0.07) {
        lineNote = "Scoring title";
        player.awards.push({ year: opening - ago, tier: rung, title: "Scoring title" });
      }
      player.history.push({
        year: opening - ago,
        club,
        tier: rung,
        games,
        goals,
        assists,
        shots,
        rushes,
        blasts,
        wins: 0,
        ga: 0,
        saves: 0,
        pokes: 0,
        shutouts: 0,
        note: lineNote,
      });
    }
  }
}

function pastNote(rng: Rng, tier: number) {
  const roll = rng.next();
  if (tier >= 5 && roll < 0.05) return "Universe champion";
  if (roll < 0.09) return "League cup";
  if (roll < 0.15) return "Season title";
  if (roll < 0.21) return "Promoted";
  if (roll < 0.27) return "Relegated";
  return "";
}

function archiveSeason(save: Save, player: LeaguePlayer, club: Club) {
  const teamNote = club.universeChamp ? "Universe champion" : club.cupTitle ? "League cup" : club.rsTitle ? "Season title" : "";
  const award = player.awards.find((item) => item.year === save.season);
  const note = [teamNote, award?.title ?? ""].filter(Boolean).join(" · ");
  if (player.season.games > 0 || note) {
    player.history.push({ year: save.season, club: club.name, tier: club.ledger?.tier ?? club.tier, ...player.season, note });
  }
  player.season = emptyForm();
}

function creditClub(save: Save, clubId: string, scored: number, allowed: number, lines?: MatchLine[]): MatchLine[] {
  const club = clubById(save, clubId);
  if (!club) return [];
  if (lines) {
    const dressed = new Set<string>();
    for (let i = 0; i < 4; i++) if (club.roster[i]) dressed.add(club.roster[i]);
    for (const line of lines) if (club.roster.indexOf(line.id) >= 0 && club.roster.indexOf(line.id) < 7) dressed.add(line.id);
    for (const id of dressed) {
      const player = playerById(save, id);
      if (!player || player.retired) continue;
      player.season.games += 1;
      if (player.kind === "goalie" && club.roster[3] === id) {
        if (scored > allowed) player.season.wins += 1;
        if (allowed === 0) player.season.shutouts += 1;
      }
    }
    for (const line of lines) {
      const player = playerById(save, line.id);
      if (!player || club.roster.indexOf(line.id) >= 7) continue;
      player.season.shots += line.shots;
      player.season.goals += line.goals;
      player.season.rushes += line.rushes;
      player.season.assists += line.assists;
      player.season.blasts += line.blasts;
      player.season.saves += line.saves;
      player.season.ga += line.ga;
      player.season.pokes += line.pokes;
    }
    return lines.filter((line) => club.roster.indexOf(line.id) >= 0 && club.roster.indexOf(line.id) < 7);
  }
  const shares = new Map<string, number>();
  let blasts = 0;
  for (const index of [0, 1, 2]) {
    const player = skaterAt(save, club, index);
    if (!player) continue;
    const sturdy = player.perks.includes("heavy") || (player.kind === "skater" && player.ratings.toughness >= 9);
    const blasted = take(save) < (sturdy ? 0.05 : 0.16);
    if (blasted) blasts += 1;
    shares.set(player.id, blasted ? 0.4 : 1);
  }
  const subShare = [0.6, 0.45, 0.35];
  for (let s = 0; s < 3; s++) {
    if (blasts < s + 1) continue;
    const player = skaterAt(save, club, 4 + s);
    if (player) shares.set(player.id, subShare[s]);
  }
  const skaters = [...shares.entries()]
    .map(([id, share]) => ({ player: playerById(save, id), share }))
    .filter((row): row is { player: Extract<LeaguePlayer, { kind: "skater" }>; share: number } => !!row.player && row.player.kind === "skater" && row.share > 0);
  for (const row of skaters) row.player.season.games += 1;
  const goalie = club.roster[3] ? playerById(save, club.roster[3]) : null;
  if (goalie && goalie.kind === "goalie") {
    goalie.season.games += 1;
    goalie.season.ga += allowed;
    if (scored > allowed) goalie.season.wins += 1;
    if (allowed === 0) goalie.season.shutouts += 1;
  }
  const made = new Map<string, MatchLine>();
  const touch = (id: string) => {
    let row = made.get(id);
    if (!row) {
      row = { id, shots: 0, goals: 0, rushes: 0, assists: 0, blasts: 0, saves: 0, ga: 0, pokes: 0 };
      made.set(id, row);
    }
    return row;
  };
  for (let goal = 0; goal < scored; goal++) {
    if (!skaters.length) break;
    const scorer = pickWeighted(save, skaters, (row) => row.share * row.player.ratings.shot).player;
    scorer.season.goals += 1;
    const row = touch(scorer.id);
    row.goals += 1;
    if (take(save) < 0.16 + scorer.ratings.attack / 42) {
      scorer.season.rushes += 1;
      row.rushes += 1;
    } else {
      scorer.season.shots += 1;
      row.shots += 1;
    }
    const mates = skaters.filter((item) => item.player !== scorer);
    if (mates.length && take(save) < 0.72) {
      const helper = pickWeighted(save, mates, (item) => item.share * item.player.ratings.attack).player;
      helper.season.assists += 1;
      touch(helper.id).assists += 1;
    }
  }
  for (const item of skaters) {
    const extra = Math.floor(take(save) * (2 + item.player.ratings.shot / 3) * item.share);
    item.player.season.shots += extra;
    if (extra) touch(item.player.id).shots += extra;
    if (take(save) < (0.1 + item.player.ratings.shot / 45) * item.share) {
      item.player.season.blasts += 1;
      touch(item.player.id).blasts += 1;
    }
  }
  if (goalie && goalie.kind === "goalie") {
    const extra = 4 + Math.floor(take(save) * (4 + goalie.ratings.poke / 3));
    goalie.season.saves += extra;
    const row = touch(goalie.id);
    row.saves += extra;
    row.ga += allowed;
    const pokes = Math.floor(take(save) * (1 + goalie.ratings.poke / 2.4));
    goalie.season.pokes += pokes;
    row.pokes += pokes;
  }
  return [...made.values()];
}

function skaterAt(save: Save, club: Club, index: number): Extract<LeaguePlayer, { kind: "skater" }> | null {
  const player = club.roster[index] ? playerById(save, club.roster[index]) : null;
  if (!player || player.retired || player.kind !== "skater") return null;
  return player;
}

function splitSheet(save: Save, match: UserMatch, sheet: MatchSheet): SideSheet {
  const mine = new Set(userClub(save).roster);
  const userLines = sheet.lines.filter((line) => mine.has(line.id));
  const oppLines = sheet.lines.filter((line) => !mine.has(line.id));
  return {
    home: match.userHome ? userLines : oppLines,
    away: match.userHome ? oppLines : userLines,
    blastoff: sheet.blastoff,
  };
}

function noteBlastoff(save: Save, homeId: string, awayId: string, hg: number, ag: number, forced?: boolean) {
  if (forced !== true || hg === ag) return false;
  const club = clubById(save, hg > ag ? homeId : awayId);
  if (club) club.blastoffs += 1;
  return true;
}

function sealClubs(save: Save) {
  for (let tier = 0; tier < 8; tier++) {
    const table = standings(save, tier);
    table.forEach((row, index) => {
      const club = clubById(save, row.id);
      if (!club || club.ledger) return;
      const grades = teamGrades(club.roster.map((id) => (id ? playerById(save, id) : null)));
      club.ledger = {
        year: save.season,
        tier,
        wins: club.wins,
        losses: club.losses,
        gf: club.gf,
        ga: club.ga,
        finish: index + 1,
        playoff: playoffLabel(save, club.id, tier, index + 1),
        blastoffs: club.blastoffs,
        offense: grades.offense,
        defense: grades.defense,
        iq: grades.iq,
      };
    });
  }
}

function playoffLabel(save: Save, clubId: string, tier: number, finish: number) {
  if (playoffChampion(save, tier) === clubId) return "Champion";
  const games = save.knockout.filter(
    (match) => match.competition === "playoff" && match.tier === tier && match.hg !== null && (match.homeId === clubId || match.awayId === clubId),
  );
  if (games.some((match) => match.round === 2)) return "Finalist";
  if (games.some((match) => match.round === 1)) return "Semifinal";
  if (games.length || finish <= 8) return games.length || finish <= 8 ? "Quarterfinal" : "Missed";
  return "Missed";
}

function universeLabel(save: Save, clubId: string) {
  if (universeChampion(save) === clubId) return "Champion";
  const games = save.knockout.filter(
    (match) => match.competition === "universe" && match.hg !== null && (match.homeId === clubId || match.awayId === clubId),
  );
  if (!games.length) return "—";
  const round = Math.max(...games.map((match) => match.round));
  return ["Round of 16", "Quarterfinal", "Semifinal", "Finalist"][round] ?? "—";
}

function awardSeason(save: Save) {
  for (let tier = 0; tier < 8; tier++) {
    const skaters = played(save, tier).filter((player) => player.kind === "skater");
    const goalies = played(save, tier).filter((player) => player.kind === "goalie");
    skaters.sort((a, b) => b.season.goals - a.season.goals || b.season.assists - a.season.assists || a.name.localeCompare(b.name));
    goalies.sort((a, b) => a.season.ga - b.season.ga || b.season.games - a.season.games || b.season.shutouts - a.season.shutouts || a.name.localeCompare(b.name));
    if (skaters[0]) grantAward(save, skaters[0], tier, "Scoring title", SCORING_PURSE[tier]);
    if (goalies[0]) grantAward(save, goalies[0], tier, "Best goalie", GOALIE_PURSE[tier]);
  }
}

function played(save: Save, tier: number) {
  return save.players.filter((player) => {
    if (player.retired || player.season.games <= 0) return false;
    const club = clubForPlayer(save, player.id);
    return !!club && (club.ledger?.tier ?? club.tier) === tier;
  });
}

function grantAward(save: Save, player: LeaguePlayer, tier: number, title: Award["title"], cash: number) {
  player.awards.push({ year: save.season, tier, title });
  const club = clubForPlayer(save, player.id);
  if (club) club.awardCash += cash;
  log(save, `${player.name} takes the ${leagueName(tier)} ${title.toLowerCase()}. ${club?.name ?? "The club"} banks ${cash} cr.`);
}

export type LeaderRow = {
  id: string;
  name: string;
  retired: boolean;
  club: string;
  tier: number;
  kind: "skater" | "goalie";
  form: SeasonForm;
};

export function leaderboard(
  save: Save,
  opts: { kind: "skater" | "goalie"; scope: "season" | "career"; tier: number | null; pool: "active" | "all" },
): LeaderRow[] {
  const rows: LeaderRow[] = [];
  for (const player of save.players) {
    if (player.kind !== opts.kind) continue;
    if (opts.scope === "career" && opts.pool === "active" && player.retired) continue;
    if (opts.scope === "season") {
      const view = seasonView(save, player);
      if (!view || (opts.tier !== null && view.tier !== opts.tier)) continue;
      rows.push({ id: player.id, name: player.name, retired: player.retired, club: view.club, tier: view.tier, kind: player.kind, form: view.form });
      continue;
    }
    const club = clubForPlayer(save, player.id);
    const form = careerSlice(player, opts.tier, club?.tier ?? null);
    if (form.games <= 0) continue;
    const home = opts.tier === null ? club?.name ?? player.history[player.history.length - 1]?.club ?? "Free agent" : player.history.filter((line) => line.tier === opts.tier).at(-1)?.club ?? club?.name ?? "—";
    rows.push({ id: player.id, name: player.name, retired: player.retired, club: home, tier: opts.tier ?? club?.tier ?? 0, kind: player.kind, form });
  }
  return rows;
}

function seasonView(save: Save, player: LeaguePlayer) {
  if (save.phase === "market" || save.phase === "sign") {
    const line = [...player.history].reverse().find((item) => item.year === save.season && item.games > 0);
    if (!line) return null;
    return { form: line, tier: line.tier, club: line.club };
  }
  if (player.season.games <= 0) return null;
  const club = clubForPlayer(save, player.id);
  return { form: player.season, tier: club?.ledger?.tier ?? club?.tier ?? 0, club: club?.name ?? "Free agent" };
}

function careerSlice(player: LeaguePlayer, tier: number | null, currentTier: number | null) {
  const total = emptyForm();
  for (const line of player.history) {
    if (tier !== null && line.tier !== tier) continue;
    addForm(total, line);
  }
  if (player.season.games > 0 && (tier === null || currentTier === tier)) addForm(total, player.season);
  return total;
}

function addForm(total: SeasonForm, line: SeasonForm) {
  total.games += line.games;
  total.goals += line.goals;
  total.assists += line.assists;
  total.shots += line.shots;
  total.rushes += line.rushes;
  total.blasts += line.blasts;
  total.wins += line.wins;
  total.ga += line.ga;
  total.saves += line.saves;
  total.pokes += line.pokes;
  total.shutouts += line.shutouts;
}

function pickWeighted<T>(save: Save, list: T[], weight: (item: T) => number) {
  const total = list.reduce((sum, item) => sum + Math.max(1, weight(item)), 0);
  let roll = take(save) * total;
  for (const item of list) {
    roll -= Math.max(1, weight(item));
    if (roll <= 0) return item;
  }
  return list[list.length - 1];
}

function around(rng: Rng, mean: number, spread: number) {
  return clamp(Math.round(mean + (rng.next() - 0.5) * spread * 2), 42, 96);
}

function makeDummySkater(): LeaguePlayer {
  const ratings: SkaterRatings = { speed: 1, agility: 1, shot: 1, attack: 1, defense: 1, handling: 1, toughness: 1 };
  return { id: "", name: "", kind: "skater", ratings, overall: 0, styles: { aggressive: 0, shooter: 0, wide: 0, physical: 0 }, perks: [], hue: 0, visor: 0, antenna: 0, seasonsPlayed: 0, history: [], season: emptyForm(), awards: [], retired: false, planet: "", potential: { ...ratings }, prior: null };
}

function makeDummyGoalie(): LeaguePlayer {
  const ratings: GoalieRatings = { speed: 1, agility: 1, iq: 1, rebound: 1, composure: 1, poke: 1 };
  return { id: "", name: "", kind: "goalie", ratings, overall: 0, styles: { aggressive: 0, shooter: 0, wide: 0, physical: 0 }, perks: [], hue: 0, visor: 0, antenna: 0, seasonsPlayed: 0, history: [], season: emptyForm(), awards: [], retired: false, planet: "", potential: { ...ratings }, prior: null };
}

function cleanName(name: string) {
  const trimmed = name.trim().slice(0, 22);
  return trimmed || "Home Side";
}

function cleanTag(tag: string) {
  const letters = tag.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4);
  return letters || "HOME";
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function poisson(save: Save, lambda: number) {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= take(save);
  } while (p > limit && k < 14);
  return k - 1;
}

function take(save: Save) {
  const next = nextRandom(save.seed || 1);
  save.seed = next.seed || 1;
  return next.value;
}

function nextRandom(seed: number) {
  let a = seed >>> 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: a >>> 0 };
}

function makeRng(seed: number): Rng {
  let s = seed >>> 0 || 1;
  return {
    next() {
      const rolled = nextRandom(s);
      s = rolled.seed || 1;
      return rolled.value;
    },
    seed: () => s,
  };
}
