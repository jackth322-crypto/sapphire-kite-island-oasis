// Side-view rink. Hover is drawn only. Roles hold shape; one player pressures the puck.

import {
  TEAM_HUE,
  handlingWindow,
  hueGap,
  kitTone,
  lifeCount,
  pace,
  teamShape,
  type Matchup,
  type Perk,
  type PlayerCard,
  type TeamHabits,
  type TeamShape,
  type Kit,
} from "@/game/roster";
import { play as playSfx, playCountdown, setBoost, startGlass, stopAllGlass, stopCountdown, stopGlass } from "@/game/sfx";

export type ControlsProbe = {
  getX: () => number;
  getY: () => number;
  getSpeed: () => number;
  getYaw: () => number;
  setKeys: (codes: string[]) => void;
  getRoles?: () => { team: string; role: string; x: number; y: number; you: boolean; lives?: number; name?: string }[];
  getPuck?: () => { x: number; y: number; held: boolean; carry: number; holder: string };
  place?: (team: string, role: string, x: number, y: number) => boolean;
  wound?: (team: string, role: string) => number | string;
  cool?: () => void;
  getMode?: () => string;
  bench?: (team: string) => number;
  skip?: () => void;
  getMech?: () => {
    x: number;
    y: number;
    speed: number;
    rail: string | null;
    pin: number;
    carry: number;
    red: boolean;
    max: number;
    holder: string;
    alive: { name: string; team: string; role: string; pin: number; rail: string | null; y: number }[];
  };
  freezeAi?: (on: boolean) => void;
  give?: () => void;
  giveTo?: (team: string, role: string) => boolean;
  forceRed?: () => number;
  face?: (ang: number) => void;
  shoot?: () => string;
  pass?: () => string;
  nudge?: (team: string, role: string, vx: number, vy: number) => boolean;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

const W = 1200;
const H = 700;
const RINK = { x: 80, y: 124, w: 1040, h: 480 };
const MID_Y = RINK.y + RINK.h / 2;
const GOAL_HALF = 98;
const BASE_SPEED = 284;
const BOOST_SPEED = 452;
const GLASS_FLOOR = 640;
const PIN_TIME = 1.25;
const PIN_BAND = 78;
const PIN_SLIDE = 230;
const TOP_Y = RINK.y + 26;
const BOT_Y = RINK.y + RINK.h - 26;

type Team = "home" | "away";
type Role = "goalie" | "defender" | "mid" | "attacker";

type Robot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: Team;
  role: Role;
  controlled: boolean;
  hover: number;
  hue: number;
  visor: number;
  antenna: number;
  grabLock: number;
  boost: number;
  boosting: boolean;
  lives: number;
  lifeMax: number;
  hurt: number;
  rail: "top" | "bottom" | null;
  railLock: number;
  coast: number;
  pin: number;
  pokeCd: number;
  pokeT: number;
  pokeX: number;
  pokeY: number;
  hop: number;
  hopMax: number;
  jumpCd: number;
  grace: number;
  replay: number;
  bumpCd: number;
  idea: number;
  name: string;
  card: PlayerCard;
};

type Puck = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bank: boolean;
  laser: boolean;
  peak: number;
  play: "loose" | "ice" | "chip";
  from: Team | null;
  by: Robot | null;
  struck: Robot[];
  spin: number;
  hold: number;
  glint: number;
  air: number;
  airMax: number;
  shotNoted: boolean;
  replayId: string | null;
};

export function mountSpaceHockey(
  canvas: HTMLCanvasElement,
  match: Matchup,
  onFinish?: (homeGoals: number, awayGoals: number, sheet?: { blastoff: boolean; lines: { id: string; shots: number; goals: number; rushes: number; assists: number; blasts: number; saves: number; ga: number; pokes: number }[] }) => void,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");

  const keys = new Set<string>();
  let injected: Set<string> | null = null;
  const spawned = spawnMatch(match);
  const robots = spawned.robots;
  const bench: Record<Team, Robot[]> = spawned.bench;
  const puck: Puck = {
    x: W / 2,
    y: MID_Y,
    vx: 0,
    vy: 0,
    bank: false,
    laser: false,
    peak: 0,
    play: "loose",
    from: null,
    by: null,
    struck: [],
    spin: 0,
    hold: 1,
    glint: 0,
    air: 0,
    airMax: 0,
    shotNoted: false,
    replayId: null,
  };
  const baseShape = {
    home: teamShape([...match.home.ice, ...match.home.bench]),
    away: teamShape([...match.away.ice, ...match.away.bench]),
  };
  const habits: Record<Team, TeamHabits> = { home: match.homeHabits, away: match.awayHabits };
  const trail: { x: number; y: number }[] = [];
  const book = new Map<string, { shots: number; goals: number; rushes: number; assists: number; blasts: number; saves: number; ga: number; pokes: number }>();
  let lastShot: Robot | null = null;
  let lastPass: Robot | null = null;

  function tally(id: string, key: "shots" | "goals" | "rushes" | "assists" | "blasts" | "saves" | "ga" | "pokes") {
    let row = book.get(id);
    if (!row) {
      row = { shots: 0, goals: 0, rushes: 0, assists: 0, blasts: 0, saves: 0, ga: 0, pokes: 0 };
      book.set(id, row);
    }
    row[key] += 1;
  }

  let holder: Robot | null = null;
  let carry = 0;
  let secure = 0;
  let facing = 0;
  let charging: "chip" | "send" | null = null;
  let charge = 0;
  let checkCd = 0;
  let scoreH = 0;
  let scoreA = 0;
  let timeLeft = 300;
  let overtime = false;
  let gameOver = false;
  let winner = "";
  let faceoff = 0;
  let shake = 0;
  let mode: "play" | "pick" | "count" = "play";
  let countLeft = 0;
  let countHold = false;
  let countFrom = 0;
  let openRole: Role = "mid";
  let breakout: Team = "away";
  let blastoff = false;
  let note = "";
  let freezeAi = false;
  type SwapLine = { outName: string; outOverall: number; inName: string; inOverall: number };
  const deaths: { team: Team; role: Role; name: string; overall: number }[] = [];
  let swapLine: SwapLine | null = null;

  const stick = { id: -1, ox: 0, oy: 0, dx: 0, dy: 0, tx: 0, ty: 0 };
  let pointerCharge = -1;
  const cursor = { x: W / 2, y: MID_Y, on: false, t: 0 };
  const view = { left: 0, top: 0, width: 1, height: 1, pw: 1, ph: 1, scale: 1, ox: 0, oy: 0 };
  const aimEl = document.createElement("div");
  aimEl.setAttribute("aria-hidden", "true");
  aimEl.style.cssText =
    "position:absolute;left:0;top:0;width:52px;height:2px;margin-top:-1px;background:rgba(226,230,238,0.8);border-radius:2px;pointer-events:none;transform-origin:0 50%;z-index:2;opacity:0;will-change:transform";
  const parent = canvas.parentElement;
  if (parent) {
    const prev = parent.style.position;
    if (!prev || prev === "static") parent.style.position = "relative";
    parent.appendChild(aimEl);
  }

  const passBtn = { x: W - 268, y: H - 86, w: 112, h: 52 };
  const shotBtn = { x: W - 144, y: H - 86, w: 112, h: 52 };

  const t0 = performance.now();
  let last = t0;
  let raf = 0;
  let running = true;

  const down = (code: string) => (injected ? injected.has(code) : keys.has(code));
  const human = () => robots.find((r) => r.controlled) ?? robots[0];

  window.__controlsTest = {
    getX: () => human().x,
    getY: () => human().y,
    getSpeed: () => Math.hypot(human().vx, human().vy),
    getYaw: () => facing,
    setKeys: (codes) => {
      injected = new Set(codes);
    },
    getRoles: () =>
      robots.map((r) => ({
        team: r.team,
        role: r.role,
        x: r.x,
        y: r.y,
        you: r.controlled,
        boosting: r.boosting,
        boost: r.boost,
        lives: r.lives,
        name: r.name,
      })),
    getPuck: () => ({
      x: puck.x,
      y: puck.y,
      held: holder === human(),
      carry,
      holder: holder ? `${holder.team}:${holder.role}` : "",
    }),
    place: (team: string, role: string, x: number, y: number) => {
      const r = robots.find((o) => o.team === team && o.role === role);
      if (!r) return false;
      r.x = x;
      r.y = y;
      r.vx = 0;
      r.vy = 0;
      r.rail = null;
      r.railLock = 0;
      r.coast = 0;
      r.pin = 0;
      r.boost = 1;
      r.boosting = false;
      return true;
    },
    wound: (team: string, role: string) => {
      const r = robots.find((o) => o.team === team && o.role === role);
      if (!r) return "missing";
      woundRobot(r);
      return r.lives;
    },
    cool: () => undefined,
    getMode: () => (blastoff ? "blastoff" : mode),
    bench: (team: string) => bench[team === "away" ? "away" : "home"].length,
    skip: () => {
      if (mode === "pick") chooseSub(0);
      if (mode === "count") {
        countLeft = 0;
        mode = "play";
        stopCountdown();
        openNextDeath();
      }
    },
    getMech: () => ({
      x: human().x,
      y: human().y,
      speed: Math.hypot(human().vx, human().vy),
      rail: human().rail,
      pin: human().pin,
      carry,
      red: !!holder && holder.role !== "goalie" && carry >= redAtOf(holder),
      max: carryLimit(holder),
      holder: holder ? `${holder.team}:${holder.role}` : "",
      alive: robots.map((r) => ({
        name: r.name,
        team: r.team,
        role: r.role,
        pin: r.pin,
        rail: r.rail,
        y: r.y,
      })),
    }),
    freezeAi: (on: boolean) => {
      freezeAi = on;
    },
    give: () => {
      takePuck(human());
    },
    giveTo: (team: string, role: string) => {
      const r = robots.find((o) => o.team === team && o.role === role);
      if (!r) return false;
      takePuck(r);
      return true;
    },
    forceRed: () => {
      if (!holder) takePuck(human());
      if (!holder) return 0;
      carry = redAtOf(holder) + 0.04;
      return carry;
    },
    face: (ang: number) => {
      facing = ang;
    },
    shoot: () => {
      if (!holder || holder !== human() || mode !== "play") return "no";
      const slap = inRed(holder);
      release(facing, slap ? 980 : 520, slap, "shot");
      return slap ? "slap" : "send";
    },
    pass: () => {
      if (!holder || mode !== "play") return "no";
      const plan = chipPlan(0.55, holder.card.kind === "skater" ? holder.card.ratings.shot : 5);
      release(facing, plan.speed, false, "chip", 0.55);
      return "chip";
    },
    nudge: (team: string, role: string, vx: number, vy: number) => {
      const r = robots.find((o) => o.team === team && o.role === role);
      if (!r) return false;
      r.vx = vx;
      r.vy = vy;
      return true;
    },
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (mode === "pick" && ["Digit1", "Digit2", "Digit3", "Numpad1", "Numpad2", "Numpad3"].includes(e.code)) {
      chooseSub(Number(e.code.slice(-1)) - 1);
      return;
    }
    if (mode !== "play" || gameOver) return;
    if (e.code === "KeyJ") {
      if (!holder || holder.team !== "home") switchSkater();
      else {
        charging = "chip";
        charge = 0;
      }
    }
    if (e.code === "KeyK") {
      const you = human();
      if (holder === you && you.replay > 0) {
        you.replay = 0;
        release(liveAim(), shotSpeed(1, true), true, "shot", 1);
        return;
      }
      if (holder === you) {
        charging = "send";
        charge = 0;
      } else if (you.role === "goalie") tryJump();
      else tryCheck();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
    if (e.code === "KeyJ" && charging === "chip") fire("chip");
    if (e.code === "KeyK" && charging === "send") fire("send");
  };
  const onBlur = () => {
    keys.clear();
    charging = null;
    charge = 0;
    pointerCharge = -1;
    stick.id = -1;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!inside(e)) return;
    const p = worldFromClient(e.clientX, e.clientY);
    if (mode === "pick") {
      bench.home.forEach((_, i) => {
      if (hitBtn(subCard(i, bench.home.length), p)) {
        playSfx("click");
        chooseSub(i);
      }
      });
      return;
    }
    if (mode !== "play" || gameOver) return;
    if (hitBtn(passBtn, p)) {
      if (!holder || holder.team !== "home") {
        playSfx("click");
        switchSkater();
      } else {
        charging = "chip";
        charge = 0;
        pointerCharge = e.pointerId;
      }
      return;
    }
    if (hitBtn(shotBtn, p)) {
      if (holder !== human()) {
        if (human().role === "goalie") tryJump();
        else tryCheck();
        return;
      }
      if (human().replay > 0) {
        human().replay = 0;
        release(liveAim(), shotSpeed(1, true), true, "shot", 1);
        return;
      }
      charging = "send";
      charge = 0;
      pointerCharge = e.pointerId;
      return;
    }
    stick.id = e.pointerId;
    stick.ox = p.x;
    stick.oy = p.y;
    noteCursor(p);
  };
  const onPointerMove = (e: PointerEvent) => {
    const dragging = stick.id !== -1 && e.pointerId === stick.id;
    if (!dragging && !inside(e)) return;
    const p = worldFromClient(e.clientX, e.clientY);
    if (!dragging && (hitBtn(passBtn, p) || hitBtn(shotBtn, p))) return;
    noteCursor(p);
  };
  const onPointerUp = (e: PointerEvent) => {
    if (pointerCharge === e.pointerId && charging) {
      const kind = charging;
      pointerCharge = -1;
      fire(kind);
    }
    if (e.pointerId === stick.id) {
      stick.id = -1;
      stick.dx = 0;
      stick.dy = 0;
    }
  };

  function measure() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    view.left = rect.left;
    view.top = rect.top;
    view.width = Math.max(1, rect.width);
    view.height = Math.max(1, rect.height);
    view.pw = Math.max(1, Math.round(rect.width * dpr));
    view.ph = Math.max(1, Math.round(rect.height * dpr));
    view.scale = Math.min(view.pw / W, view.ph / H);
    view.ox = (view.pw - W * view.scale) / 2;
    view.oy = (view.ph - H * view.scale) / 2;
    if (Math.abs(canvas.width - view.pw) > 2 || Math.abs(canvas.height - view.ph) > 2) {
      canvas.width = view.pw;
      canvas.height = view.ph;
    }
  }

  function inside(e: PointerEvent) {
    return (
      e.clientX >= view.left &&
      e.clientX <= view.left + view.width &&
      e.clientY >= view.top &&
      e.clientY <= view.top + view.height
    );
  }

  function worldFromClient(clientX: number, clientY: number) {
    const px = ((clientX - view.left) / view.width) * view.pw;
    const py = ((clientY - view.top) / view.height) * view.ph;
    return { x: (px - view.ox) / view.scale, y: (py - view.oy) / view.scale };
  }

  function worldToScreen(x: number, y: number) {
    return {
      x: ((view.ox + x * view.scale) / view.pw) * view.width,
      y: ((view.oy + y * view.scale) / view.ph) * view.height,
    };
  }

  function noteCursor(p: { x: number; y: number }) {
    cursor.x = p.x;
    cursor.y = p.y;
    cursor.on = true;
    cursor.t = performance.now();
    stick.tx = p.x;
    stick.ty = p.y;
    pointFacing();
    placeAim();
  }

  function placeAim() {
    if (!cursor.on || mode !== "play" || gameOver) {
      aimEl.style.opacity = "0";
      return;
    }
    const you = human();
    const from = worldToScreen(you.x, you.y);
    const to = worldToScreen(cursor.x, cursor.y);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    aimEl.style.opacity = len > 2 ? "1" : "0";
    aimEl.style.width = `${len}px`;
    aimEl.style.transform = `translate(${from.x}px,${from.y}px) rotate(${Math.atan2(dy, dx)}rad)`;
  }

  function mouseOwnsAim() {
    return cursor.on && (stick.id !== -1 || performance.now() - cursor.t < 700);
  }

  function pointFacing() {
    if (!mouseOwnsAim()) return;
    const you = human();
    const dx = cursor.x - you.x;
    const dy = cursor.y - you.y;
    if (Math.hypot(dx, dy) < 4) return;
    facing = Math.atan2(dy, dx);
  }

  measure();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("pointerrawupdate", onPointerMove as EventListener, { passive: true });
  window.addEventListener("resize", measure);

  function chipPlan(t: number, shot = 5) {
    const loaded = clamp(t, 0.08, 1);
    const ease = Math.pow(loaded, 1.9);
    const skill = (clamp(shot, 1, 11) - 1) / 10;
    const air = 0.24 + loaded * 0.5;
    const travel = 130 + ease * (220 + skill * 780);
    return { air, travel, speed: travel / air };
  }

  function chipLoadFor(distance: number, shot: number) {
    if (chipPlan(1, shot).travel < distance) return null;
    let lo = 0.08;
    let hi = 1;
    for (let i = 0; i < 10; i++) {
      const mid = (lo + hi) / 2;
      if (chipPlan(mid, shot).travel < distance) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function fire(kind: "chip" | "send") {
    const chip = kind === "chip";
    const t = chip ? clamp(Math.max(charge, 0.08), 0.08, 1) : clamp(Math.max(charge, 0.2), 0.2, 1);
    charging = null;
    charge = 0;
    pointerCharge = -1;
    if (holder !== human() || gameOver || mode !== "play") return;
    if (chip) {
      const plan = chipPlan(t, shotOf(holder));
      release(liveAim(), plan.speed, false, "chip", t);
      return;
    }
    const slap = inRed(holder);
    release(liveAim(), shotSpeed(t, slap), slap, "shot", t);
  }

  function shotSpeed(t: number, slap: boolean) {
    const paceShot = pace(holder ? shotOf(holder) : 5);
    return (slap ? 760 + t * 480 : 480 + t * 420) * paceShot;
  }

  function liveAim() {
    pointFacing();
    return facing;
  }

  function release(ang: number, speed: number, slap: boolean, play: "pass" | "shot" | "loose" | "chip" | "ice", loaded = 0.75) {
    if (!holder) return;
    const who = holder;
    const loft = play === "chip";
    const sent = loft || play === "shot" || play === "pass" || play === "ice";
    who.grabLock = slap && !loft ? 0.2 : 0.4;
    who.pin = 0;
    holder = null;
    carry = 0;
    secure = 0;
    puck.x = who.x + Math.cos(ang) * 28;
    puck.y = who.y + Math.sin(ang) * 28;
    puck.bank = perk(who, "bank");
    puck.vx = Math.cos(ang) * speed;
    puck.vy = Math.sin(ang) * speed;
    puck.play = loft ? "chip" : sent ? "ice" : "loose";
    puck.from = who.team;
    puck.by = sent ? who : puck.by;
    puck.laser = play === "shot" && slap;
    puck.replayId = puck.laser ? who.card.id : null;
    puck.peak = puck.laser ? speed : 0;
    puck.struck = [who];
    puck.shotNoted = false;
    trail.length = 0;
    if (loft) {
      const plan = chipPlan(loaded, shotOf(who));
      puck.air = plan.air;
      puck.airMax = plan.air;
      puck.spin = 0;
      puck.hold = 1;
    } else if (sent) {
      const drift = who.vx * -Math.sin(ang) + who.vy * Math.cos(ang);
      const shot = shotOf(who);
      puck.spin = curveAccel(drift, shot, slap, loaded, who.boosting, who.coast);
      puck.hold = slap ? 0.97 : 0.84 + (shot - 1) * 0.014;
      puck.air = 0;
      puck.airMax = 0;
    } else {
      puck.spin = 0;
      puck.hold = 1;
      puck.air = 0;
      puck.airMax = 0;
    }
    puck.glint = 0;
    if (loft) playSfx("pass", { gain: who.controlled ? 1 : 0.45 });
    else if (sent) playSfx(puck.laser ? "slap" : "shot", { gain: who.controlled ? 1 : 0.4 });
  }

  function launch(ang: number, speed: number) {
    release(ang, speed, false, "shot");
  }

  function dropPuck() {
    if (!holder) return;
    const who = holder;
    const keepX = who.vx;
    const keepY = who.vy;
    const sp = Math.hypot(keepX, keepY);
    release(travelAngle(who), 80, false, "loose");
    who.grabLock = 0.4;
    if (sp > 24) {
      puck.vx = (keepX / sp) * 95 + keepX * 0.12;
      puck.vy = (keepY / sp) * 95 + keepY * 0.12;
    } else {
      const s = attackSign(who.team);
      puck.vx = s * 90;
      puck.vy = 0;
    }
    puck.by = null;
    puck.shotNoted = false;
    puck.air = 0;
    puck.airMax = 0;
  }

  function takePuck(r: Robot, from: Robot | null = null, sound = false) {
    const incoming = Math.hypot(puck.vx, puck.vy);
    const secondTouch = puck.replayId === r.card.id && incoming > 440;
    if (!from) creditCatch(r);
    else if (from.team !== r.team) lastPass = null;
    if (from && from !== r) {
      from.grabLock = 1.05;
      shoveApart(from, r);
    }
    holder = r;
    carry = 0;
    const touchFor = secondTouch ? replayWindow(r) : 0;
    secure = secondTouch ? touchFor : 0.85;
    r.replay = touchFor;
    puck.replayId = null;
    puck.vx = 0;
    puck.vy = 0;
    puck.laser = false;
    puck.play = "loose";
    puck.peak = 0;
    puck.spin = 0;
    puck.hold = 1;
    puck.glint = 0;
    puck.air = 0;
    puck.airMax = 0;
    puck.shotNoted = false;
    puck.struck = [];
    if (sound) playSfx("pickup", { gain: r.controlled ? 1 : 0.55 });
  }

  function creditCatch(r: Robot) {
    const sender = puck.by;
    if (sender && sender !== r && sender.team === r.team && !puck.shotNoted && r.role !== "goalie") lastPass = sender;
    else if (sender && sender.team !== r.team) lastPass = null;
  }

  function travelAngle(r: Robot) {
    if (r.controlled) return liveAim();
    if (Math.hypot(r.vx, r.vy) > 36) return Math.atan2(r.vy, r.vx);
    return attackSign(r.team) > 0 ? 0 : Math.PI;
  }

  function switchSkater() {
    if (gameOver || holder?.team === "home") return;
    const goalie = robots.find((r) => r.team === "home" && r.role === "goalie");
    const s = attackSign("home");
    const carrierX = holder ? holder.x : null;
    const beaten =
      carrierX !== null &&
      robots.filter((r) => r.team === "home" && r.role !== "goalie").every((r) => (r.x - carrierX) * s > 0);
    if (goalie && beaten) {
      if (human() !== goalie) {
        for (const r of robots) r.controlled = r === goalie;
        const sp = Math.hypot(goalie.vx, goalie.vy);
        facing = sp > 40 ? Math.atan2(goalie.vy, goalie.vx) : facing;
      }
      return;
    }
    const field = robots.filter((r) => r.team === "home");
    field.sort((a, b) => dist(a, puck) - dist(b, puck));
    if (field.length === 0) return;
    const you = human();
    const next = you === field[0] ? (field[1] ?? field[0]) : field[0];
    for (const r of robots) r.controlled = r === next;
    const sp = Math.hypot(next.vx, next.vy);
    facing = sp > 40 ? Math.atan2(next.vy, next.vx) : facing;
  }

  function syncControl() {
    if (holder?.team !== "home" || holder.role === "goalie") return;
    if (human() === holder) return;
    for (const r of robots) r.controlled = r === holder;
    const sp = Math.hypot(holder.vx, holder.vy);
    facing = sp > 40 ? Math.atan2(holder.vy, holder.vx) : 0;
  }

  const step = (dt: number) => {
    shake = Math.max(0, shake - dt * 4);
    for (const r of robots) {
      r.hurt = Math.max(0, r.hurt - dt);
      r.railLock = Math.max(0, r.railLock - dt);
      r.jumpCd = Math.max(0, r.jumpCd - dt);
      if (r.hop > 0) r.hop = Math.max(0, r.hop - dt);
    }

    if (mode === "count") {
      if (countHold) {
        countLeft = 3;
        return;
      }
      const elapsed = (performance.now() - countFrom) / 1000;
      countLeft = Math.max(0, 3 - elapsed);
      if (elapsed >= 3) {
        countLeft = 0;
        mode = "play";
        openNextDeath();
      }
      return;
    }
    if (mode === "pick" || gameOver) return;

    if (!overtime && faceoff <= 0) {
      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft === 0) {
        if (scoreH === scoreA) overtime = true;
        else finish(scoreH > scoreA ? "HOME" : "AWAY");
      }
    }
    faceoff = Math.max(0, faceoff - dt);
    secure = Math.max(0, secure - dt);
    for (const r of robots) {
      r.grabLock = Math.max(0, r.grabLock - dt);
      r.pokeCd = Math.max(0, r.pokeCd - dt);
      r.pokeT = Math.max(0, r.pokeT - dt);
      r.grace = Math.max(0, r.grace - dt);
      r.replay = Math.max(0, r.replay - dt);
      r.bumpCd = Math.max(0, r.bumpCd - dt);
      r.idea = Math.max(0, r.idea - dt);
    }
    checkCd = Math.max(0, checkCd - dt);

    if (charging === "chip") charge = Math.min(1, charge + dt * 1.36);
    else if (charging) charge = Math.min(1, charge + dt * 1.7);
    puck.glint = Math.max(0, puck.glint - dt);

    if (faceoff > 0) {
      for (const r of robots) {
        r.vx = 0;
        r.vy = 0;
        r.boosting = false;
      }
      if (holder) parentPuck();
      return;
    }

    tickBoost(human(), down("Space"), dt);
    syncControl();
    drivePlayer(dt);
    driveAi(dt);
    for (const r of robots) bleedCoast(r, dt);

    if (gameOver) return;

    for (const r of robots) moveBody(r, dt, 22);
    boostStrip();
    pushApart(robots);
    tickPins(dt);

    if (holder) {
      parentPuck();
      carry += dt;
      if (carry >= carryLimit(holder)) dropPuck();
      else maybeSteal();
    } else {
      slidePuck(dt);
      if (puck.air > 0) {
        puck.air = Math.max(0, puck.air - dt);
        if (puck.air === 0) {
          puck.play = "ice";
          puck.glint = 0.2;
        }
      } else {
        tickLaser();
        maybeGrab();
      }
    }

    if (puck.air <= 0 || goalLip()) {
      maybePoke();
      maybeSave();
      considerShot();
    }
    maybeRoof();

    if ((puck.air <= 0 || goalLip()) && inMouth() && puck.x < RINK.x + 8) addScore("away");
    else if ((puck.air <= 0 || goalLip()) && inMouth() && puck.x > RINK.x + RINK.w - 8) addScore("home");
  };

  function considerShot() {
    if (holder || (puck.air > 0 && !goalLip()) || puck.shotNoted || !puck.by || puck.by.role === "goalie") return;
    const left = RINK.x + 8;
    const right = RINK.x + RINK.w - 8;
    const atRight = puck.x > right - 140 && puck.vx > 70 && puck.by.team === "home";
    const atLeft = puck.x < left + 140 && puck.vx < -70 && puck.by.team === "away";
    if (!atRight && !atLeft) return;
    if (!inMouth()) return;
    puck.shotNoted = true;
    tally(puck.by.card.id, "shots");
    lastShot = puck.by;
  }

  function maybePoke() {
    for (const g of robots) {
      if (g.role !== "goalie" || g.card.kind !== "goalie" || g.pokeCd > 0) continue;
      const poke = g.card.ratings.poke;
      const reach = 32 + (poke - 1) * 4;
      const own = ownGoalX(g.team);
      const inCrease = attackDepth(g.team, puck.x) < 0.28 || Math.abs(puck.x - own) < 150;
      if (!inCrease) continue;
      const rusher = holder && holder.team !== g.team && holder.role !== "goalie" ? holder : null;
      const slow = Math.hypot(puck.vx, puck.vy) < 260;
      const loose = !holder && slow && Math.abs(puck.x - own) < 145;
      const mark = rusher ?? (loose ? puck : null);
      if (!mark || dist(g, mark) > reach) continue;
      const s = attackSign(g.team);
      const side = Math.abs(mark.y - g.y) < 8 ? (mark.y < MID_Y ? -1 : 1) : Math.sign(mark.y - g.y);
      const speed = 340 + poke * 18;
      const ang = Math.atan2(side * 0.92, s * 0.4);
      if (rusher) {
        rusher.grabLock = 0.72;
        rusher.vx = s * 110;
        rusher.vy += side * 50;
        rusher.x += s * 8;
        holder = null;
        carry = 0;
        secure = 0;
      }
      puck.x = g.x + Math.cos(ang) * 26;
      puck.y = g.y + Math.sin(ang) * 26;
      puck.vx = Math.cos(ang) * speed;
      puck.vy = Math.sin(ang) * speed;
      puck.laser = false;
      puck.replayId = null;
      puck.play = "loose";
      puck.from = g.team;
      puck.peak = 0;
      puck.bank = false;
      puck.spin = 0;
      puck.struck = [];
      g.pokeCd = 1.45 - (poke - 1) * 0.07;
      g.pokeT = 0.26;
      g.pokeX = g.x + Math.cos(ang) * (reach + 16);
      g.pokeY = g.y + Math.sin(ang) * (reach + 16);
      tally(g.card.id, "pokes");
      playSfx("poke", { gain: g.controlled ? 1 : 0.6 });
      shake = 0.1;
      return;
    }
  }

  function maybeSave() {
    if (holder) return;
    for (const g of robots) {
      if (g.role !== "goalie" || g.card.kind !== "goalie") continue;
      const own = ownGoalX(g.team);
      const toward = g.team === "home" ? puck.vx < -40 : puck.vx > 40;
      if (!toward || Math.abs(puck.x - own) > 150) continue;
      const q = g.card.ratings;
      const dropping = puck.air > 0;
      const reach = (22 + (q.iq * 0.5 + q.speed * 0.25 + q.agility * 0.25 - 1) * 3.1) * (dropping ? 0.8 : 1);
      if (dist(g, puck) > reach || Math.abs(puck.y - g.y) > reach * (dropping ? 0.86 : 1)) continue;
      const keep = 0.92 - (q.rebound - 1) * 0.065;
      const s = attackSign(g.team);
      puck.vx = s * Math.abs(puck.vx) * keep;
      puck.vy *= keep * 0.65;
      puck.x = g.x + s * 20;
      puck.laser = false;
      puck.play = "loose";
      puck.air = 0;
      puck.airMax = 0;
      puck.spin = 0;
      creditSave(g);
      playSfx("save");
      shake = 0.12;
      return;
    }
  }

  function creditSave(g: Robot) {
    tally(g.card.id, "saves");
    if (puck.by && puck.by.team !== g.team && puck.by.role !== "goalie" && !puck.shotNoted) {
      puck.shotNoted = true;
      tally(puck.by.card.id, "shots");
      lastShot = puck.by;
    }
  }

  function goalLip() {
    if (puck.air <= 0 || puck.airMax <= 0) return true;
    const t = 1 - puck.air / puck.airMax;
    return t > 0.5 && Math.sin(t * Math.PI) <= 0.32;
  }

  function chipHeight() {
    if (puck.air <= 0 || puck.airMax <= 0) return 0;
    return Math.sin((1 - puck.air / puck.airMax) * Math.PI) * 52;
  }

  function tryJump() {
    const you = human();
    if (!you || you.role !== "goalie" || holder === you || gameOver || mode !== "play") return;
    startJump(you);
  }

  function startJump(g: Robot) {
    if (g.role !== "goalie" || g.hop > 0 || g.jumpCd > 0) return;
    g.hopMax = 0.46;
    g.hop = g.hopMax;
    g.jumpCd = 0.92;
  }

  function maybeRoof() {
    if (holder || puck.air <= 0) return;
    const height = chipHeight();
    for (const g of robots) {
      if (g.role !== "goalie" || g.card.kind !== "goalie" || g.hop <= 0 || g.hopMax <= 0) continue;
      const own = ownGoalX(g.team);
      if (Math.abs(puck.x - own) > 170) continue;
      if (Math.abs(puck.x - g.x) > 78 || Math.abs(puck.y - g.y) > 86) continue;
      const risen = Math.sin((1 - g.hop / g.hopMax) * Math.PI) * 72;
      const iq = g.card.ratings.iq / 11;
      if (Math.abs(height - risen) > 12 + iq * 24) continue;
      const s = attackSign(g.team);
      puck.air = 0;
      puck.airMax = 0;
      puck.vx = s * 240;
      puck.vy = (MID_Y - puck.y) * 0.35;
      puck.x = g.x + s * 26;
      puck.y = g.y;
      puck.laser = false;
      puck.replayId = null;
      puck.play = "loose";
      puck.spin = 0;
      creditSave(g);
      playSfx("save", { gain: g.controlled ? 1 : 0.65 });
      shake = 0.16;
      g.hop = Math.min(g.hop, 0.12);
      return;
    }
  }

  function considerChipJump(g: Robot) {
    if (g.controlled || g.hop > 0 || g.jumpCd > 0 || holder || puck.air <= 0.05 || puck.airMax <= 0) return;
    if (puck.by && puck.by.team === g.team) return;
    const own = ownGoalX(g.team);
    const dir = g.team === "home" ? -1 : 1;
    if (puck.vx * dir < 50) return;
    const dx = own - puck.x;
    if (dx * dir < -24) return;
    const tHit = dx / puck.vx;
    if (tHit < -0.04 || tHit > Math.min(0.8, puck.air)) return;
    const yAt = puck.y + puck.vy * Math.max(0, tHit);
    if (Math.abs(yAt - MID_Y) > GOAL_HALF + 28) return;
    const iq = g.card.kind === "goalie" ? g.card.ratings.iq / 11 : 0.4;
    if (Math.abs(yAt - g.y) > 28 + iq * 50) return;
    const startAt = tHit - 0.2;
    const early = (1 - iq) * 0.24;
    if (startAt > 0.012 + early * 0.4) return;
    if (startAt < -0.035) return;
    startJump(g);
  }

  function inRed(r: Robot) {
    return r.role !== "goalie" && carry >= redAtOf(r);
  }

  function tickLaser() {
    const sp = Math.hypot(puck.vx, puck.vy);
    if (puck.laser && sp < Math.max(520, puck.peak * 0.8)) puck.laser = false;
    if (puck.replayId && sp < 440) puck.replayId = null;
    if (sp < 70) puck.play = "loose";
    if (puck.laser) {
      trail.push({ x: puck.x, y: puck.y });
      if (trail.length > 22) trail.shift();
      tipLaser(sp);
      for (const o of [...robots]) {
        if (o.role === "goalie" || !puck.from || o.team === puck.from || puck.struck.includes(o)) continue;
        if (dist(o, puck) > 28) continue;
        puck.struck.push(o);
        const nx = puck.vx / (sp || 1);
        const ny = puck.vy / (sp || 1);
        o.vx += nx * 480;
        o.vy += ny * 220;
        o.x += nx * 18;
        o.y += ny * 10;
        o.grabLock = 0.75;
        o.pin = 0;
        if (o.rail) knockRail(o);
        if (puck.by) tally(puck.by.card.id, "blasts");
        woundRobot(o);
      }
      return;
    }
    if (trail.length > 0) trail.shift();
  }

  function tipLaser(sp: number) {
    if (!puck.from) return;
    let tipper: Robot | null = null;
    let best = 36;
    for (const o of robots) {
      if (o.role === "goalie" || o.team !== puck.from || puck.struck.includes(o)) continue;
      const d = dist(o, puck);
      if (d < best) {
        best = d;
        tipper = o;
      }
    }
    if (!tipper) return;
    puck.struck.push(tipper);
    const goalX = puck.from === "home" ? RINK.x + RINK.w - 6 : RINK.x + 6;
    const skill = shotOf(tipper);
    const miss = (6 - skill) * 14;
    const aimY = clamp(tipper.y + miss * 0.35, MID_Y - GOAL_HALF - 36, MID_Y + GOAL_HALF + 36);
    const ang = Math.atan2(aimY - puck.y, goalX - puck.x);
    const keep = Math.max(520, sp * (0.8 + skill * 0.016));
    puck.vx = Math.cos(ang) * keep;
    puck.vy = Math.sin(ang) * keep;
    puck.spin = clamp((tipper.y - MID_Y) * 1.4, -180, 180);
    puck.hold = 0.9 + skill * 0.008;
    puck.peak = Math.max(puck.peak, keep);
    puck.glint = 0.22;
    if (puck.by && puck.by !== tipper) lastPass = puck.by;
    lastShot = tipper;
    tally(tipper.card.id, "shots");
    playSfx("tip");
    tipper.grabLock = 0.45;
  }

  function tickPins(dt: number) {
    const held = new Set<Robot>();
    const victim = holder && holder.role !== "goalie" ? holder : null;
    if (victim && !victim.rail) {
      let gain = 0;
      for (const a of [...robots]) {
        if (a === victim || a.team === victim.team || a.role === "goalie" || a.rail || !a.boosting) continue;
        if (dist(a, victim) > 58) continue;
        const topGap = victim.y - TOP_Y;
        const botGap = BOT_Y - victim.y;
        const wall =
          topGap >= -8 && topGap < PIN_BAND && topGap <= botGap ? "top" : botGap >= -8 && botGap < PIN_BAND ? "bottom" : null;
        if (!wall) continue;
        const pressing = wall === "top" ? a.y > victim.y - 8 : a.y < victim.y + 8;
        if (!pressing) continue;
        if (Math.abs(victim.vx) > PIN_SLIDE) continue;
        const glassY = wall === "top" ? TOP_Y + 18 : BOT_Y - 18;
        victim.y += (glassY - victim.y) * Math.min(1, dt * 10);
        victim.vy *= 0.2;
        const heavy = perk(a, "heavy") ? 1.2 : 1;
        gain = Math.max(gain, (dt / PIN_TIME) * heavy);
        held.add(victim);
      }
      if (gain > 0) {
        victim.pin = Math.min(1, victim.pin + gain);
        if (victim.pin >= 1) {
          victim.pin = 0;
          woundRobot(victim);
        }
      }
    }
    for (const r of robots) if (!held.has(r)) r.pin = Math.max(0, r.pin - dt * 2.4);
  }

  function woundRobot(r: Robot) {
    if (r.role === "goalie" || r.lives <= 0 || r.grace > 0) return;
    r.lives -= 1;
    r.hurt = 0.45;
    shake = 0.28;
    playSfx("blast", { gain: r.controlled ? 1 : 0.7 });
    if (r.lives > 0) {
      r.pin = 0;
      const off = r.y < MID_Y ? 1 : -1;
      r.y += off * 28;
      r.vy += off * 160;
      return;
    }
    if (holder === r) {
      holder = null;
      carry = 0;
      secure = 0;
    }
    const wasYou = r.controlled;
    const team = r.team;
    const role = r.role;
    const at = robots.indexOf(r);
    if (at >= 0) robots.splice(at, 1);
    if (wasYou) {
      const next = robots.find((o) => o.team === "home");
      if (next) next.controlled = true;
    }
    deaths.push({ team, role, name: r.name, overall: r.card.overall });
    openNextDeath();
  }

  function openNextDeath() {
    if (mode !== "play" || gameOver || deaths.length === 0) return;
    const d = deaths[0];
    const subs = bench[d.team];
    const skaters = robots.filter((o) => o.team === d.team && o.role !== "goalie");
    if (subs.length === 0 && skaters.length === 0) {
      deaths.length = 0;
      swapLine = null;
      blastoff = true;
      note = "";
      finish(d.team === "home" ? "AWAY" : "HOME");
      return;
    }
    deaths.shift();
    openRole = d.role;
    swapLine = { outName: d.name, outOverall: d.overall, inName: "", inOverall: 0 };
    if (subs.length === 0) {
      note = "SHORTHANDED";
      beginCountdown();
      return;
    }
    note = "";
    if (d.team === "away") {
      const sub = subs[0];
      bringIn(sub);
      swapLine = { outName: d.name, outOverall: d.overall, inName: sub.name, inOverall: sub.card.overall };
      beginCountdown();
      return;
    }
    mode = "pick";
  }

  function beginCountdown() {
    mode = "count";
    countHold = true;
    countLeft = 3;
    countFrom = performance.now();
    playCountdown(() => {
      if (mode !== "count") return;
      countHold = false;
      countFrom = performance.now();
      countLeft = 3;
    });
    window.setTimeout(() => {
      if (mode !== "count" || !countHold) return;
      countHold = false;
      countFrom = performance.now();
      countLeft = 3;
    }, 800);
  }

  function bringIn(sub: Robot) {
    const pile = bench[sub.team];
    const at = pile.indexOf(sub);
    if (at >= 0) pile.splice(at, 1);
    sub.role = openRole;
    sub.x = W / 2;
    sub.y = MID_Y;
    sub.vx = 0;
    sub.vy = 0;
    sub.boosting = false;
    sub.rail = null;
    sub.railLock = 0;
    sub.coast = 0;
    sub.pin = 0;
    sub.lives = sub.lifeMax;
    sub.grace = 2;
    sub.replay = 0;
    sub.bumpCd = 0;
    sub.controlled = false;
    robots.push(sub);
    if (!robots.some((o) => o.controlled) && sub.team === "home") sub.controlled = true;
  }

  function chooseSub(index: number) {
    if (mode !== "pick") return;
    const sub = bench.home[index];
    if (!sub) return;
    bringIn(sub);
    if (swapLine) swapLine = { ...swapLine, inName: sub.name, inOverall: sub.card.overall };
    beginCountdown();
  }

  function subCard(index: number, count: number): Btn {
    const w = 168;
    const gap = 18;
    const total = count * w + (count - 1) * gap;
    return { x: (W - total) / 2 + index * (w + gap), y: H / 2 - 78, w, h: 156 };
  }

  function perk(r: Robot, name: Perk) {
    return r.card.perks.includes(name);
  }

  function agilityOf(r: Robot) {
    return r.card.ratings.agility;
  }

  function speedOf(r: Robot) {
    return pace(r.card.ratings.speed);
  }

  function shotOf(r: Robot) {
    return r.card.kind === "skater" ? r.card.ratings.shot : 5;
  }

  function attackOf(r: Robot) {
    return r.card.kind === "skater" ? r.card.ratings.attack : r.card.ratings.iq;
  }

  function defenseOf(r: Robot) {
    return r.card.kind === "skater" ? r.card.ratings.defense : r.card.ratings.iq;
  }

  function handlingOf(r: Robot) {
    return r.card.kind === "skater" ? r.card.ratings.handling : 5;
  }

  function carryLimit(r: Robot | null) {
    if (!r) return 1.5;
    const extra = perk(r, "sticky") ? 0.45 : 0;
    return handlingWindow(handlingOf(r)).carryMax + extra;
  }

  function redAtOf(r: Robot) {
    return handlingWindow(handlingOf(r)).redAt;
  }

  function replayWindow(r: Robot) {
    const hands = handlingOf(r);
    return 0.16 + (hands - 1) * 0.038 + (perk(r, "touch") ? 0.24 : 0);
  }

  function liveShape(team: Team): TeamShape {
    let push = baseShape[team].push;
    let share = baseShape[team].share;
    const lead = team === "home" ? scoreH - scoreA : scoreA - scoreH;
    if (lead > 0) push -= 18;
    if (lead < 0) push += 16;
    const skaters = robots.filter((r) => r.team === team && r.role !== "goalie").length;
    if (skaters < 3) {
      push -= 22;
      share -= 18;
    }
    return {
      ...baseShape[team],
      push: clamp(push, 0, 100),
      share: clamp(share, 0, 100),
    };
  }

  function readOf(r: Robot) {
    if (r.card.kind === "goalie") return r.card.ratings.iq / 11;
    return (r.card.ratings.attack * 0.6 + r.card.ratings.handling * 0.4) / 11;
  }

  function tryCheck() {
    if (checkCd > 0 || gameOver || mode !== "play" || holder === human()) return;
    const you = human();
    if (!you || you.role === "goalie") return;
    checkCd = 0.42;
    let target: Robot | null = null;
    let best = 88;
    const fx = Math.cos(facing);
    const fy = Math.sin(facing);
    for (const o of robots) {
      if (o.team === you.team) continue;
      if (o.role === "goalie" && holder !== o) continue;
      const dx = o.x - you.x;
      const dy = o.y - you.y;
      const d = Math.hypot(dx, dy);
      if (d > 88 || d < 1) continue;
      if ((dx * fx + dy * fy) / d < 0.42) continue;
      if (holder === o) {
        target = o;
        break;
      }
      if (d < best) {
        best = d;
        target = o;
      }
    }
    if (!target) return;
    landBump(you, target, facing);
  }

  function tryAiBump(r: Robot) {
    if (r.bumpCd > 0 || r.role === "goalie" || !holder || holder.team === r.team || holder.role === "goalie") return false;
    const d = dist(r, holder);
    if (d > 76 || d < 12) return false;
    const sp = Math.hypot(holder.vx, holder.vy);
    const hx = sp > 28 ? holder.vx / sp : Math.cos(travelAngle(holder));
    const hy = sp > 28 ? holder.vy / sp : Math.sin(travelAngle(holder));
    const dx = r.x - holder.x;
    const dy = r.y - holder.y;
    const humanTarget = holder.controlled;
    const behind = (dx * hx + dy * hy) / d < (humanTarget ? -0.28 : 0.2);
    const physical = r.card.styles.physical;
    if (!behind && physical < 56 && defenseOf(r) < 7) return false;
    if (humanTarget && d > 60) return false;
    if (!behind && d > 54) return false;
    r.bumpCd = humanTarget ? 1.2 : behind ? 0.5 : 0.8;
    const aim = Math.atan2(holder.y - r.y, holder.x - r.x);
    landBump(r, holder, aim);
    return true;
  }

  function landBump(you: Robot, target: Robot, aim: number) {
    const fx = Math.cos(aim);
    const fy = Math.sin(aim);
    const dx = you.x - target.x;
    const dy = you.y - target.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = Math.hypot(target.vx, target.vy);
    const hx = sp > 36 ? target.vx / sp : Math.cos(travelAngle(target));
    const hy = sp > 36 ? target.vy / sp : Math.sin(travelAngle(target));
    const fromBehind = (dx * hx + dy * hy) / d < (target.controlled ? -0.4 : -0.05);
    you.pokeT = 0.16;
    you.pokeX = target.x;
    you.pokeY = target.y;
    if (!fromBehind) {
      target.vx += fx * 70;
      target.vy += fy * 40;
      playSfx("poke", { gain: you.controlled ? 0.7 : 0.28 });
      return;
    }
    const gap = defenseOf(you) - handlingOf(target) + (target.controlled ? -1 : 1);
    const shove = 150 + defenseOf(you) * 16 + Math.max(0, gap) * 18;
    target.vx += hx * shove;
    target.vy += hy * shove * 0.85;
    target.x += hx * 8;
    you.vx *= 0.78;
    you.vy *= 0.78;
    const canStrip = !you.controlled && holder === target && gap >= 0 && !(target.controlled && secure > 0);
    playSfx(canStrip ? "blast" : "poke", { gain: holder === target ? (you.controlled ? 0.85 : 0.55) : 0.4 });
    if (!canStrip) {
      if (holder === target) target.grabLock = Math.max(target.grabLock, 0.18);
      return;
    }
    popLoose(target, hx, hy, dx, dy);
  }

  function popLoose(target: Robot, hx: number, hy: number, dx: number, dy: number) {
    const side = Math.sign(dx * hy - dy * hx) || 1;
    const pop = 180;
    holder = null;
    carry = 0;
    secure = 0;
    target.grabLock = 0.6;
    puck.x = target.x + hx * 20;
    puck.y = target.y + hy * 20;
    puck.vx = hx * pop + hy * side * 70;
    puck.vy = hy * pop * 0.45 + hx * side * 90;
    puck.play = "loose";
    puck.laser = false;
    puck.replayId = null;
    puck.air = 0;
    puck.airMax = 0;
    puck.by = null;
    puck.shotNoted = false;
    puck.spin = 0;
    lastPass = null;
  }

  function boostStrip() {
    const you = human();
    if (!you.boosting || you.bumpCd > 0 || you.role === "goalie" || gameOver || mode !== "play") return;
    if (!holder || holder === you || holder.team === you.team || holder.role === "goalie") return;
    const d = dist(you, holder);
    if (d > 62 || d < 1) return;
    const sp = Math.hypot(you.vx, you.vy);
    const cap = BOOST_SPEED * speedOf(you);
    if (sp < cap * 0.92) return;
    const nx = (holder.x - you.x) / d;
    const ny = (holder.y - you.y) / d;
    if ((you.vx * nx + you.vy * ny) / sp < 0.5) return;
    you.bumpCd = 0.55;
    you.pokeT = 0.16;
    you.pokeX = holder.x;
    you.pokeY = holder.y;
    const hx = you.vx / sp;
    const hy = you.vy / sp;
    const outcome = boostHit(you, holder);
    if (outcome === "none") {
      playSfx("poke", { gain: 0.32 });
      return;
    }
    if (outcome === "bump") {
      const shove = 110 + toughOf(you) * 16;
      holder.vx += hx * shove;
      holder.vy += hy * shove * 0.42;
      holder.grabLock = Math.max(holder.grabLock, 0.2);
      playSfx("poke", { gain: 0.75 });
      return;
    }
    playSfx("blast", { gain: 0.9 });
    popLoose(holder, hx, hy, you.x - holder.x, you.y - holder.y);
  }

  function toughOf(r: Robot) {
    const base = r.card.kind === "skater" ? r.card.ratings.toughness : 6;
    return base + (perk(r, "heavy") ? 3.5 : 0);
  }

  function boostHit(you: Robot, carrier: Robot) {
    const gap = defenseOf(you) - handlingOf(carrier);
    const strip = clamp(0.28 + gap * 0.05, 0.06, 0.62);
    const bulk = toughOf(carrier) - toughOf(you);
    const nothingShare = clamp(0.42 + bulk * 0.055, 0.14, 0.86);
    const remain = 1 - strip;
    const roll = Math.random();
    if (roll < remain * nothingShare) return "none" as const;
    if (roll < remain) return "bump" as const;
    return "strip" as const;
  }

  function drivePlayer(dt: number) {
    const you = human();
    let ix = 0;
    let iy = 0;
    if (down("KeyA") || down("ArrowLeft")) ix -= 1;
    if (down("KeyD") || down("ArrowRight")) ix += 1;
    if (down("KeyW") || down("ArrowUp")) iy -= 1;
    if (down("KeyS") || down("ArrowDown")) iy += 1;
    if (stick.id !== -1 && !gameOver) {
      const dx = cursor.x - you.x;
      const dy = cursor.y - you.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        const wish = Math.atan2(dy, dx);
        facing = wish;
        const skating = (you.boosting ? BOOST_SPEED : BASE_SPEED) * speedOf(you);
        const coasting = you.coast > 0 && !you.rail;
        const aim = coasting ? Math.max(skating, Math.hypot(you.vx, you.vy)) : skating;
        const tau = coasting ? 0.5 : Math.max(0.016, 0.11 - (agilityOf(you) - 1) * 0.009);
        const blend = 1 - Math.exp(-dt / tau);
        you.vx += (Math.cos(wish) * aim - you.vx) * blend;
        you.vy += (Math.sin(wish) * aim - you.vy) * blend;
        const inward =
          (you.rail === "top" && Math.sin(wish) > 0.28) || (you.rail === "bottom" && Math.sin(wish) < -0.28);
        applyGlass(you, true, inward, Math.cos(wish));
      }
      return;
    }
    pointFacing();
    const len = Math.hypot(ix, iy);
    const maxSp = (you.boosting ? BOOST_SPEED : BASE_SPEED) * speedOf(you);
    if (len > 0.08 && !gameOver) {
      const n = Math.max(1, len);
      const accel = (1100 + agilityOf(you) * 80) * speedOf(you);
      you.vx += (ix / n) * accel * dt;
      you.vy += (iy / n) * accel * dt;
      const sp = Math.hypot(you.vx, you.vy);
      const coasting = you.coast > 0 && !you.rail;
      if (sp > maxSp && !coasting) {
        you.vx = (you.vx / sp) * maxSp;
        you.vy = (you.vy / sp) * maxSp;
      }
    } else if (you.coast <= 0) {
      const damp = Math.pow(0.04, dt);
      you.vx *= damp;
      you.vy *= damp;
    }
    if (!mouseOwnsAim() && Math.hypot(you.vx, you.vy) > 28 && stick.id === -1) {
      const velAng = Math.atan2(you.vy, you.vx);
      if (len > 0.08) facing = velAng;
      else {
        const diff = Math.atan2(Math.sin(velAng - facing), Math.cos(velAng - facing));
        if (Math.abs(diff) < 0.4) facing = velAng;
      }
    }
    const inward = (you.rail === "top" && iy > 0) || (you.rail === "bottom" && iy < 0);
    applyGlass(you, true, inward, ix);
  }

  function bleedCoast(r: Robot, dt: number) {
    if (r.rail || r.coast <= 0) return;
    r.coast = Math.max(0, r.coast - dt);
    const sp = Math.hypot(r.vx, r.vy);
    if (sp < 8) return;
    const skate = (r.boosting ? BOOST_SPEED : BASE_SPEED) * speedOf(r);
    const mag = skate + (sp - skate) * Math.exp(-dt / 0.62);
    r.vx = (r.vx / sp) * mag;
    r.vy = (r.vy / sp) * mag;
  }

  function tickBoost(r: Robot, want: boolean, dt: number) {
    const burning = want && !r.rail && r.boost > 0.02 && !gameOver;
    r.boosting = burning;
    const burn = perk(r, "afterburner") ? 1.7 : 1.15;
    const regen = perk(r, "afterburner") ? 1.35 : 2.3;
    if (r.boosting) r.boost = Math.max(0, r.boost - dt / burn);
    else r.boost = Math.min(1, r.boost + dt / regen);
  }

  function wantsBoost(r: Robot, chasing: boolean) {
    if (r.boost < 0.12 || gameOver) return false;
    if (r.role === "goalie") return desperate(r) && dist(r, puck) > 64 && dist(r, puck) < 190;
    const opp = nearestOpponent(r);
    if (
      holder &&
      holder.team !== r.team &&
      holder.role !== "goalie" &&
      !holder.rail &&
      nearGlass(holder) &&
      dist(r, holder) < 120
    )
      return true;
    if (holder === r) {
      if (opp && dist(r, opp) < 110) return true;
      return canShoot(r) && (!opp || dist(r, opp) > 130);
    }
    if (holder && holder.team !== r.team && holder.role !== "goalie" && dist(r, holder) > 80 && dist(r, holder) < 320) return true;
    if (chasing && dist(r, puck) > 48) return true;
    return false;
  }

  function driveAi(dt: number) {
    if (freezeAi) {
      for (const r of robots) if (!r.controlled) r.boosting = false;
      return;
    }
    const homeChaser = pickChaser("home");
    const awayChaser = pickChaser("away");
    for (const r of robots) {
      if (r.controlled || gameOver) {
        if (!r.controlled) r.boosting = false;
        continue;
      }
      if (holder === r) {
        tickBoost(r, wantsBoost(r, false), dt);
        thinkWithPuck(r, dt);
        if (r.boosting && !r.rail && r.coast <= 0) {
          const sp = Math.hypot(r.vx, r.vy) || 1;
          const boosted = BOOST_SPEED * speedOf(r);
          r.vx = (r.vx / sp) * boosted;
          r.vy = (r.vy / sp) * boosted;
        }
        applyGlass(r, glassEnter(r), glassPeel(r), attackSign(r.team));
        continue;
      }
      if (playArrival(r, dt)) {
        tickBoost(r, dist(r, landingPoint()) > 90, dt);
        continue;
      }
      if (playPass(r, dt)) {
        tickBoost(r, false, dt);
        continue;
      }
      if (playTip(r, dt)) {
        tickBoost(r, false, dt);
        continue;
      }
      const pinAt = pinSpot(r);
      if (pinAt) {
        tickBoost(r, true, dt);
        seek(r, pinAt.x, pinAt.y, BOOST_SPEED * speedOf(r), dt);
        continue;
      }
      const screen = screenSpot(r);
      if (screen) {
        const gap = dist(r, screen);
        tickBoost(r, gap > 170, dt);
        seek(r, screen.x, screen.y, (gap > 110 ? 200 : gap > 36 ? 120 : 64) * speedOf(r), dt);
        applyGlass(r, false, false, attackSign(r.team));
        continue;
      }
      const chasing = r === homeChaser || r === awayChaser;
      if (r.role === "goalie") considerChipJump(r);
      if (r.role !== "goalie") tryAiBump(r);
      tickBoost(r, wantsBoost(r, chasing), dt);
      const spot = glassEnter(r)
        ? { x: r.x + attackSign(r.team) * 220, y: r.y < MID_Y ? TOP_Y : BOT_Y }
        : chasing
          ? chasePoint(r)
          : shapeSpot(r);
      const cruise = (r.role === "goalie" ? (desperate(r) ? 250 : 188) : chasing ? 318 : 276) * speedOf(r);
      seek(r, spot.x, spot.y, r.boosting ? BOOST_SPEED * speedOf(r) : cruise, dt);
      if (r.role === "goalie") sealGoalie(r);
      applyGlass(r, glassEnter(r), glassPeel(r), attackSign(r.team));
    }
  }

  function playArrival(r: Robot, dt: number) {
    if (r.role === "goalie" || holder || puck.air <= 0) return false;
    const mine = puck.by?.team === r.team;
    let best = r;
    let bestScore = strideScore(r);
    for (const o of robots) {
      if (o === r || o.team !== r.team || o.role === "goalie" || o.controlled) continue;
      const score = strideScore(o);
      if (score > bestScore) {
        best = o;
        bestScore = score;
      }
    }
    if (best !== r) return false;
    if (!mine) {
      seek(r, landingPoint().x, landingPoint().y, 260 * speedOf(r), dt);
      return true;
    }
    catchInStride(r, dt);
    return true;
  }

  function strideScore(r: Robot) {
    const spot = landingPoint();
    const d = dist(r, spot);
    const iq = readOf(r);
    const speed = 300 * speedOf(r);
    const late = d / speed - Math.max(0.05, puck.air);
    return (late < 0.28 ? 160 : 0) - d * 0.55 + iq * 70 - Math.max(0, late) * 90;
  }

  function catchInStride(r: Robot, dt: number) {
    const iq = readOf(r);
    const spot = landingPoint();
    const flight = Math.hypot(puck.vx, puck.vy) || 1;
    const dirx = puck.vx / flight;
    const diry = puck.vy / flight;
    if (iq < 0.38) {
      seek(r, spot.x, spot.y, (190 + iq * 70) * speedOf(r), dt);
      return;
    }
    const relx = spot.x - r.x;
    const rely = spot.y - r.y;
    const along = relx * dirx + rely * diry;
    const latx = relx - dirx * along;
    const laty = rely - diry * along;
    const lat = Math.hypot(latx, laty) || 1;
    const cover = puck.air > 0.06 ? along / puck.air : 220;
    const cruise = (210 + iq * 200) * speedOf(r);
    const speed = along > 24 ? clamp(cover, 150, cruise + 60) : cruise * (0.62 + iq * 0.3);
    const cor = Math.min(1, 0.3 + iq);
    const tx = r.x + dirx * 90 + (latx / lat) * 70 * cor;
    const ty = r.y + diry * 90 + (laty / lat) * 70 * cor;
    strideSeek(r, tx, ty, Math.max(140, speed), dt);
  }

  function glassEnter(r: Robot) {
    if (r.role === "goalie" || r.rail) return false;
    if (holder === r && attackDepth(r.team, r.x) < 0.55) return true;
    if (holder === r && wantsWallShot(r)) return true;
    if (holder?.team === r.team || r.role !== "defender") return false;
    return attackDepth(r.team, puck.x) < 0.28;
  }

  function glassPeel(r: Robot) {
    if (!r.rail || holder !== r) return false;
    const depth = attackDepth(r.team, r.x);
    if (depth <= 0.6) return false;
    if (wantsSlapRide(r) && !inRed(r) && depth < 0.8) return false;
    return true;
  }

  function wantsSlapRide(r: Robot) {
    return shotOf(r) >= 6 || r.card.styles.shooter > 58;
  }

  function wantsWallShot(r: Robot) {
    if (r.role === "goalie" || r.rail) return false;
    const depth = attackDepth(r.team, r.x);
    if (depth < 0.36 || depth > 0.7) return false;
    if (openLook(r)) return false;
    const opp = nearestOpponent(r);
    if (opp && dist(r, opp) < 72) return false;
    return wantsSlapRide(r) || r.card.styles.wide > 56;
  }

  function applyGlass(r: Robot, enter: boolean, inward: boolean, along: number) {
    if (r.role === "goalie" || r.railLock > 0) {
      if (r.railLock > 0) r.rail = null;
      return;
    }
    if (r.rail && inward) {
      leaveRail(r, true);
      return;
    }
    const riding = holder === r && attackDepth(r.team, r.x) <= (wantsSlapRide(r) ? 0.8 : 0.62);
    const keep =
      r.controlled ||
      riding ||
      (r.role === "defender" && holder?.team !== r.team && attackDepth(r.team, r.x) < 0.26);
    if (r.rail && !keep) {
      leaveRail(r, false);
      return;
    }
    if (!r.rail && !enter) return;
    if (!r.rail) {
      const pinning = !!holder && holder !== r && holder.team !== r.team && !holder.rail && dist(r, holder) < 70 && nearGlass(holder);
      if (pinning) return;
      if (r.y <= TOP_Y + 36) r.rail = "top";
      else if (r.y >= BOT_Y - 36) r.rail = "bottom";
      else return;
      r.coast = 0;
      startGlass(`${r.team}:${r.name}`, r.controlled ? 1 : 0.55);
    }
    const dir = along === 0 ? Math.sign(r.vx) || attackSign(r.team) : Math.sign(along);
    r.y = r.rail === "top" ? TOP_Y : BOT_Y;
    r.vy = 0;
    r.vx = dir * Math.max(GLASS_FLOOR, 700 * speedOf(r));
    r.boosting = false;
  }

  function nearGlass(o: Robot) {
    return o.y <= TOP_Y + PIN_BAND || o.y >= BOT_Y - PIN_BAND;
  }

  function leaveRail(r: Robot, peel: boolean) {
    const wall = r.rail;
    if (!wall) return;
    const dir = Math.sign(r.vx) || attackSign(r.team);
    const along = Math.max(Math.abs(r.vx) * 0.97, GLASS_FLOOR * 0.92);
    r.rail = null;
    r.railLock = peel ? 0.42 : 0.34;
    r.coast = 1.15;
    r.vx = dir * along;
    const kick = peel ? 220 : 110;
    r.vy = wall === "top" ? kick : -kick;
    stopGlass(`${r.team}:${r.name}`);
    playSfx("glassOff", { gain: r.controlled ? 1 : 0.5 });
  }

  function pinSpot(r: Robot) {
    if (r.role === "goalie" || r.rail || holder === r) return null;
    if (!holder || holder.team === r.team || holder.role === "goalie" || holder.rail) return null;
    if (!nearGlass(holder)) return null;
    if (r !== pickChaser(r.team) && r.card.styles.physical < 74) return null;
    return { x: holder.x, y: holder.y < MID_Y ? holder.y + 34 : holder.y - 34 };
  }

  function screenUrge(r: Robot) {
    if (r.role === "goalie" || r.card.kind !== "skater") return 0;
    const heavy = perk(r, "heavy") ? 18 : 0;
    const attacking = holder?.team === r.team || (!holder && puck.from === r.team);
    const read = attacking ? attackOf(r) : defenseOf(r);
    return r.card.ratings.toughness * 4.2 + r.card.styles.physical * 0.28 + heavy + read * 1.6;
  }

  function screenSpot(r: Robot) {
    if (r.controlled || holder === r || r.role === "goalie" || r.rail) return null;
    const mateHasIt = !!holder && holder.team === r.team;
    const s = attackSign(r.team);
    const towardNet = puck.vx * s > 80 || puck.laser || puck.play === "chip";
    const shotComing = !holder && puck.from === r.team && puck.by?.team === r.team && towardNet;
    if (!mateHasIt && !shotComing) return null;
    const depthAt = mateHasIt && holder ? holder.x : puck.x;
    if (attackDepth(r.team, depthAt) < 0.48) return null;
    const keeper = robots.find((o) => o.team !== r.team && o.role === "goalie");
    if (!keeper) return null;
    const urge = screenUrge(r);
    if (urge < 42) return null;
    let best = r;
    let bestUrge = urge;
    for (const o of robots) {
      if (o === r || o.team !== r.team || o === holder || o.role === "goalie") continue;
      const other = screenUrge(o);
      if (other > bestUrge) {
        best = o;
        bestUrge = other;
      }
    }
    if (best !== r) return null;
    const slide = Math.sign((holder ? holder.y : puck.y) - keeper.y);
    return {
      x: clamp(keeper.x - s * 60, RINK.x + 48, RINK.x + RINK.w - 48),
      y: clamp(keeper.y + slide * 16, MID_Y - GOAL_HALF + 10, MID_Y + GOAL_HALF - 10),
    };
  }

  function sealGoalie(g: Robot) {
    for (const o of robots) {
      if (o.team === g.team || o.role === "goalie") continue;
      const d = dist(o, g);
      if (d > 62 || d < 1) continue;
      const tough = o.card.kind === "skater" ? o.card.ratings.toughness : 5;
      if (screenUrge(o) < 50 && tough < 8 && !perk(o, "heavy")) continue;
      const inFront = (g.x - o.x) * attackSign(o.team) > 8;
      if (!inFront) continue;
      const ny = (o.y - g.y) / d;
      const toward = g.vy * ny;
      if (toward <= 20) continue;
      const heavy = perk(o, "heavy") ? 0.16 : 0;
      const cut = clamp(0.22 + Math.max(0, tough - 6) * 0.06 + heavy, 0.22, 0.55);
      g.vy -= ny * toward * cut;
    }
  }

  function deliver(r: Robot, target: { x: number; y: number }, speed: number, preferBounce: boolean, play: "pass" | "shot") {
    const blocked = laneBlocked(r, target, r.team);
    const bounce = wallPoint(r, target, r.team);
    const slap = inRed(r);
    const send = (ang: number) => {
      release(ang, slap ? Math.max(speed, 800) : speed, slap, play);
      return true;
    };
    if (bounce && (blocked || preferBounce)) return send(Math.atan2(bounce.y - r.y, bounce.x - r.x));
    if (!blocked) return send(Math.atan2(target.y - r.y, target.x - r.x));
    return false;
  }

  function thinkWithPuck(r: Robot, dt: number) {
    const s = attackSign(r.team);
    const mate = bestReceiver(r);
    const goal = { x: r.team === "home" ? RINK.x + RINK.w - 4 : RINK.x + 4, y: MID_Y };
    const goalie = robots.find((o) => o.team !== r.team && o.role === "goalie");
    const goalieInLane = !!goalie && dist(goalie, r) > 36 && distToSeg(goalie, r, goal) < 48;
    const shape = liveShape(r.team);
    const habit = habits[r.team];
    const shootBias = r.card.styles.shooter * 0.55 + (100 - shape.share) * 0.45;
    const patient = habit.patient / 100;
    const limit = carryLimit(r);
    const opp = nearestOpponent(r);
    const pressed = !!opp && dist(r, opp) < 64;
    const look = openLook(r);
    const close = canShoot(r, shootBias, habit.earlyShot);
    const shotSkill = shotOf(r);
    const untilRed = redAtOf(r) - carry;
    const shooterLean = r.card.styles.shooter;
    const canSlap = shotSkill >= 6 || shooterLean > 55;
    const sniper = shotSkill >= 8 || (shotSkill >= 6 && shooterLean > 68);
    const lane = r.role !== "goalie" && bodyInLane(r);
    const holdLook = sniper && !inRed(r) && !pressed && look && untilRed > 0 && untilRed < 1.45;
    const holdBlast = canSlap && !inRed(r) && lane && untilRed > 0 && untilRed < (pressed ? 0.32 : sniper ? 1.2 : 0.75);
    const holdRed = r.role !== "goalie" && (holdLook || holdBlast);
    if (r.replay > 0 && (look || lane || shotSkill >= 7 || shooterLean > 64)) {
      r.replay = 0;
      release(slapTarget(r), shotSpeed(1, true), true, "shot", 1);
      return;
    }
    if (offWallShot(r)) return;
    if (r.role !== "goalie" && inRed(r) && (look || lane || (!pressed && canSlap && attackDepth(r.team, r.x) > 0.46))) {
      release(slapTarget(r), shotSpeed(1, true), true, "shot", 1);
      return;
    }
    if (r.role !== "goalie" && look && carry > 0.08 && !pressed && !holdRed) {
      const slap = inRed(r);
      release(Math.atan2(goal.y - r.y, goal.x - r.x), (slap ? 940 : 760) * pace(shotOf(r)), slap, "shot");
      return;
    }
    if (pressed && !look && !holdRed && carry > 0.12 && tryChip(r)) return;
    if (r.role !== "goalie" && attackDepth(r.team, r.x) < 0.42 && carry > 0.16 && (pressed || !mate) && tryDump(r)) return;
    if (r.role === "goalie" || carry > limit * 0.96) {
      if (r.role !== "goalie" && (look || close)) {
        const slap = inRed(r);
        release(Math.atan2(goal.y - r.y, goal.x - r.x), (slap ? 900 : 720) * pace(shotOf(r)), slap, "shot");
        return;
      }
      if (r.role !== "goalie" && mate && deliver(r, mate, passSpeed(r, mate), true, "pass")) return;
      if (r.role === "goalie") {
        const order: Role[] = ["attacker", "mid", "defender"];
        for (const role of order) {
          const mate = robots.find((o) => o.team === r.team && o.role === role);
          if (mate && deliver(r, mate, passSpeed(r, mate), false, "pass")) return;
        }
        if (tryChip(r)) return;
        launch(s > 0 ? 0 : Math.PI, 460);
        return;
      }
      if (attackDepth(r.team, r.x) < 0.5 && tryDump(r)) return;
      if (tryChip(r)) return;
      dropPuck();
      return;
    }
    if (!holdRed && !look && !pressed && carry > 0.18 && tryChipShot(r)) return;
    const wantShot = !holdRed && (look || close) && carry > 0.14 + patient * 0.08;
    const bounceShot = !look && (goalieInLane || (r.card.styles.wide + habit.bounce) / 2 > 68);
    if (wantShot && deliver(r, goal, 760 * pace(shotOf(r)), bounceShot, "shot")) return;
    if (wantShot && !look && tryChip(r)) return;
    const passNow = !holdRed && !!mate && !look && !close && carry > (shootBias > 70 ? 0.58 : 0.4);
    if (passNow && mate && deliver(r, mate, passSpeed(r, mate), r.card.styles.wide > 52 || habit.bounce > 58, "pass")) return;
    if (!holdRed && !look && carry > 0.34 && tryChip(r)) return;
    let tx = goal.x - s * 70;
    let ty = MID_Y + (r.y < MID_Y ? -1 : 1) * (36 + Math.abs(r.card.styles.wide - 50));
    if (attackDepth(r.team, r.x) < 0.55 && !pressed) {
      tx = r.x + s * 260;
      ty = r.y < MID_Y ? TOP_Y : BOT_Y;
    } else if (wantsWallShot(r)) {
      tx = r.x + s * 200;
      ty = r.y < MID_Y ? TOP_Y : BOT_Y;
    } else if (opp && dist(r, opp) < 78) {
      const side = r.y <= opp.y ? -1 : 1;
      tx = r.x + s * 120;
      ty = r.y + side * 110;
    }
    seek(r, tx, ty, 312 * speedOf(r), dt);
  }

  function offWallShot(r: Robot) {
    if (r.role === "goalie" || r.rail || r.coast < 0.72 || r.railLock <= 0) return false;
    if (attackDepth(r.team, r.x) < 0.5) return false;
    const slap = inRed(r);
    release(netAngle(r), (slap ? 1000 : 860) * pace(shotOf(r)), slap, "shot", slap ? 1 : 0.85);
    return true;
  }

  function netAngle(r: Robot) {
    const goal = { x: r.team === "home" ? RINK.x + RINK.w - 8 : RINK.x + 8, y: MID_Y };
    return Math.atan2(goal.y - r.y, goal.x - r.x);
  }

  function slapTarget(r: Robot) {
    const goal = { x: r.team === "home" ? RINK.x + RINK.w - 8 : RINK.x + 8, y: MID_Y };
    const bounce = wallPoint(r, goal, r.team);
    const goalie = robots.find((o) => o.team !== r.team && o.role === "goalie");
    const goalieInLane = !!goalie && dist(goalie, r) > 40 && distToSeg(goalie, r, goal) < 48;
    const clogged = laneBlocked(r, goal, r.team, 28) && !bodyInLane(r);
    if (bounce && (goalieInLane || clogged) && (r.card.styles.wide > 34 || shotOf(r) >= 6)) {
      return Math.atan2(bounce.y - r.y, bounce.x - r.x);
    }
    return slapAngle(r);
  }

  function tryDump(r: Robot) {
    if (r.role === "goalie") return false;
    const mates = robots.filter((o) => o.team === r.team && o !== r && o.role !== "goalie");
    if (!mates.length) return false;
    const s = attackSign(r.team);
    const chaser = mates.reduce((best, o) => ((o.x - best.x) * s > 0 ? o : best));
    const aim = {
      x: s > 0 ? RINK.x + RINK.w - 68 : RINK.x + 68,
      y: chaser.y < MID_Y ? RINK.y + 74 : RINK.y + RINK.h - 74,
    };
    const shot = shotOf(r);
    let dx = aim.x - r.x;
    let dy = aim.y - r.y;
    const gap = Math.hypot(dx, dy) || 1;
    const max = chipPlan(1, shot).travel * 0.92;
    if (gap > max) {
      dx = (dx / gap) * max;
      dy = (dy / gap) * max;
    }
    const t = chipLoadFor(Math.max(48, Math.hypot(dx, dy) - 20), shot);
    if (t === null) return false;
    const plan = chipPlan(t, shot);
    release(Math.atan2(dy, dx), plan.speed, false, "chip", t);
    return true;
  }

  function tryChipShot(r: Robot) {
    if (r.role === "goalie" || r.idea > 0) return false;
    if (attackDepth(r.team, r.x) < 0.52) return false;
    const goal = { x: r.team === "home" ? RINK.x + RINK.w - 6 : RINK.x + 6, y: MID_Y };
    const d = Math.hypot(goal.x - r.x, goal.y - r.y);
    if (d < 320 || d > 760) return false;
    r.idea = 1.15;
    if (Math.random() > 0.05 + (shotOf(r) - 1) * 0.012) return false;
    const t = chipLoadFor(d, shotOf(r));
    if (t === null) return false;
    const plan = chipPlan(t, shotOf(r));
    release(Math.atan2(goal.y - r.y, goal.x - r.x), plan.speed, false, "chip", t);
    return true;
  }

  function slapAngle(r: Robot) {
    const goal = { x: r.team === "home" ? RINK.x + RINK.w - 8 : RINK.x + 8, y: MID_Y };
    let pick: Robot | null = null;
    let best = 44;
    for (const o of robots) {
      if (o.team === r.team || o.role === "goalie") continue;
      const gap = dist(o, r);
      if (gap < 30 || gap > 340) continue;
      const off = distToSeg(o, r, goal);
      if (off < best) {
        best = off;
        pick = o;
      }
    }
    const aim = pick ?? goal;
    return Math.atan2(aim.y - r.y, aim.x - r.x);
  }

  function bodyInLane(r: Robot) {
    const goal = { x: r.team === "home" ? RINK.x + RINK.w - 8 : RINK.x + 8, y: MID_Y };
    let body = false;
    for (const o of robots) {
      if (o.team === r.team || o.role === "goalie") continue;
      const gap = dist(o, r);
      if (gap < 40 || gap > 340) continue;
      if (distToSeg(o, r, goal) < 42) body = true;
    }
    return body;
  }

  function tryChip(r: Robot) {
    const spot = chipSpot(r);
    if (!spot) return false;
    const shot = shotOf(r);
    let aim = { x: spot.x, y: spot.y };
    const gap = () => Math.max(48, Math.hypot(aim.x - r.x, aim.y - r.y) - 26);
    let t = chipLoadFor(gap(), shot);
    if (t === null) return false;
    if (spot.mate) {
      const air = chipPlan(t, shot).air;
      const s = attackSign(r.team);
      const lead = 28 + air * 90;
      const ax = clamp(spot.mate.x + spot.mate.vx * air * 0.95 + s * lead, RINK.x + 36, RINK.x + RINK.w - 36);
      const ay = clamp(spot.mate.y + spot.mate.vy * air * 0.8, RINK.y + 36, RINK.y + RINK.h - 36);
      const led = Math.hypot(ax - r.x, ay - r.y);
      if (chipPlan(1, shot).travel >= led - 26) {
        aim = { x: ax, y: ay };
        const next = chipLoadFor(Math.max(48, led - 26), shot);
        if (next !== null) t = next;
      }
    }
    const plan = chipPlan(t, shot);
    release(Math.atan2(aim.y - r.y, aim.x - r.x), plan.speed, false, "chip", t);
    return true;
  }

  function chipSpot(r: Robot) {
    const s = attackSign(r.team);
    const opp = nearestOpponent(r);
    const pressed = !!opp && dist(r, opp) < 86;
    let best: { x: number; y: number; mate: Robot } | null = null;
    let bestScore = 70;
    for (const o of robots) {
      if (o === r || o.team !== r.team || o.role === "goalie") continue;
      const d = dist(r, o);
      if (d < 140 || d > 660) continue;
      const ahead = (o.x - r.x) * s;
      if (r.role !== "goalie" && ahead < 16) continue;
      const inNet = Math.abs(o.y - MID_Y) < GOAL_HALF - 8 && (s > 0 ? o.x > RINK.x + RINK.w - 90 : o.x < RINK.x + 90);
      if (inNet) continue;
      const blocked = laneBlocked(r, o, r.team, 26);
      if (!blocked && !pressed) continue;
      let space = 999;
      for (const foe of robots) if (foe.team !== r.team) space = Math.min(space, dist(o, foe));
      const score = (blocked ? 130 : 36) + ahead * 0.22 + Math.min(space, 200) * 0.45;
      if (score > bestScore) {
        bestScore = score;
        best = { x: o.x + s * 14, y: o.y, mate: o };
      }
    }
    return best;
  }

  function landingPoint() {
    const t = Math.max(0, puck.air);
    return {
      x: clamp(puck.x + puck.vx * t, RINK.x + 24, RINK.x + RINK.w - 24),
      y: clamp(puck.y + puck.vy * t, RINK.y + 24, RINK.y + RINK.h - 24),
    };
  }

  function passSpeed(r: Robot, mate: Robot) {
    return clamp(dist(r, mate) * (1.5 + attackOf(r) * 0.04), 340, 700);
  }

  function parentPuck() {
    if (!holder) return;
    const ang = travelAngle(holder);
    puck.x = holder.x + Math.cos(ang) * 28;
    puck.y = holder.y + Math.sin(ang) * 28;
    puck.vx = holder.vx;
    puck.vy = holder.vy;
  }

  function maybeSteal() {
    if (!holder || secure > 0) return;
    for (const r of robots) {
      if (r.team === holder.team || r.grabLock > 0) continue;
      const base = perk(holder, "glue") ? 16 : 26;
      const reach = clamp(base + (defenseOf(r) - defenseOf(holder)) * 0.9, 12, 34);
      const hit = holder.controlled ? Math.min(reach, perk(holder, "glue") ? 12 : 18) : reach;
      if (dist(r, puck) < hit) {
        const prev = holder;
        takePuck(r, prev, true);
        return;
      }
    }
  }

  function maybeGrab() {
    if (faceoff > 0) return;
    let best: Robot | null = null;
    let bestD = 60;
    for (const r of robots) {
      if (r.grabLock > 0) continue;
      const reach = perk(r, "pickup") ? 46 : 30;
      const d = dist(r, puck);
      if (d < reach && d < bestD) {
        bestD = d;
        best = r;
      }
    }
    if (best) takePuck(best, null, true);
  }

  function slidePuck(dt: number) {
    if (puck.air <= 0) {
      const next = advancePuck(puck.vx, puck.vy, puck.spin, puck.hold, dt);
      puck.vx = next.vx;
      puck.vy = next.vy;
      puck.spin = next.spin;
      if (Math.hypot(puck.vx, puck.vy) < 12) {
        puck.vx = 0;
        puck.vy = 0;
        puck.spin = 0;
      }
    }
    puck.x += puck.vx * dt;
    puck.y += puck.vy * dt;
    const minY = RINK.y + 14;
    const maxY = RINK.y + RINK.h - 14;
    const keep = puck.bank ? 0.96 : 0.8;
    if (puck.y < minY) {
      puck.y = minY;
      puck.vy = Math.abs(puck.vy) * keep;
      puck.spin *= 0.35;
    } else if (puck.y > maxY) {
      puck.y = maxY;
      puck.vy = -Math.abs(puck.vy) * keep;
      puck.spin *= 0.35;
    }
    const mouth = inMouth() && goalLip();
    const minX = RINK.x + 14;
    const maxX = RINK.x + RINK.w - 14;
    if (!mouth && puck.x < minX) {
      puck.x = minX;
      puck.vx = Math.abs(puck.vx) * keep;
      puck.spin *= 0.35;
    } else if (!mouth && puck.x > maxX) {
      puck.x = maxX;
      puck.vx = -Math.abs(puck.vx) * keep;
      puck.spin *= 0.35;
    }
  }

  function inMouth() {
    return puck.y > MID_Y - GOAL_HALF && puck.y < MID_Y + GOAL_HALF;
  }

  function pickChaser(team: Team) {
    if (holder?.team === team) return null;
    const field = robots.filter((r) => r.team === team && r.role !== "goalie" && !r.controlled);
    if (field.length === 0) return null;
    const depth = attackDepth(team, puck.air > 0 ? landingPoint().x : puck.x);
    const prefer: Role = depth < 0.36 ? "defender" : depth < 0.66 ? "mid" : "attacker";
    const preferred = field.find((r) => r.role === prefer) ?? field[0];
    const mark = puck.air > 0 ? landingPoint() : puck;
    let closest = field[0];
    for (const r of field) if (dist(r, mark) < dist(closest, mark)) closest = r;
    if (puck.air > 0) return closest;
    if (dist(preferred, puck) < dist(closest, puck) + 160) return preferred;
    return closest;
  }

  function chasePoint(r: Robot) {
    if (r.grabLock > 0.15) return shapeSpot(r);
    if (holder && holder.team !== r.team) {
      const sp = Math.hypot(holder.vx, holder.vy);
      const hx = sp > 28 ? holder.vx / sp : attackSign(holder.team);
      const hy = sp > 28 ? holder.vy / sp : 0;
      return { x: holder.x - hx * 34 - hy * 12, y: holder.y - hy * 34 + hx * 12 };
    }
    if (puck.air > 0) return landingPoint();
    return { x: puck.x, y: puck.y };
  }

  function nearestOpponent(r: Robot) {
    let best: Robot | null = null;
    let bestD = 1e9;
    for (const o of robots) {
      if (o.team === r.team) continue;
      const d = dist(r, o);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  function onAttack(team: Team) {
    if (holder?.team === team) return true;
    if (holder) return false;
    return attackDepth(team, puck.x) >= 0.5;
  }

  function shapeSpot(r: Robot) {
    const s = attackSign(r.team);
    const own = ownGoalX(r.team);
    const opp = ownGoalX(r.team === "home" ? "away" : "home");
    if (r.role === "goalie" && r.card.kind === "goalie") {
      const q = r.card.ratings;
      const track = 0.3 + (q.iq / 11) * 0.7;
      let watchY = puck.y;
      if (!holder && puck.air > 0 && Math.abs(puck.vx) > 40) {
        const t = clamp((own - puck.x) / puck.vx, 0, puck.air);
        watchY = puck.y + puck.vy * t;
      } else if (!holder && Math.abs(puck.spin) > 12) {
        const sp = Math.hypot(puck.vx, puck.vy) || 1;
        const lead = 0.08 + (q.composure / 11) * 0.22;
        watchY = puck.y + puck.vy * lead + (puck.vx / sp) * 0.5 * puck.spin * lead * lead;
      }
      let y = MID_Y + (clamp(watchY, MID_Y - GOAL_HALF, MID_Y + GOAL_HALF) - MID_Y) * track;
      y += Math.sin(r.hover + performance.now() / 480) * Math.max(0, 7 - q.composure) * 4;
      let x = own + s * (18 + Math.max(0, 8 - q.composure) * 1.6);
      if (desperate(r)) {
        const dare = (11 - q.composure) / 10;
        const reachOut = 24 + dare * 110;
        const lo = Math.min(own, own + s * reachOut);
        const hi = Math.max(own, own + s * reachOut);
        x = clamp(puck.x - s * 16, lo, hi);
        y = clamp(puck.y, MID_Y - 70 - dare * 30, MID_Y + 70 + dare * 30);
      }
      return { x, y };
    }
    const atk = onAttack(r.team);
    const lead = holder?.team === r.team ? holder : puck;
    const high = lead.y < MID_Y;
    let x = r.x;
    let y = r.y;
    if (!atk) {
      const other: Team = r.team === "home" ? "away" : "home";
      const press = holder ? holder.team === other && attackDepth(other, puck.x) < 0.4 : attackDepth(r.team, puck.x) > 0.58;
      if (press) {
        if (r.role === "attacker") {
          x = puck.x + s * 62;
          y = puck.y + (puck.y < MID_Y ? 64 : -64);
        } else if (r.role === "mid") {
          x = puck.x - s * 8;
          y = puck.y + (puck.y < MID_Y ? -76 : 76);
        } else {
          x = own + s * 420;
          y = MID_Y + (puck.y - MID_Y) * 0.45;
        }
      } else if (r.role === "defender") {
        const depth = attackDepth(r.team, puck.x);
        x = own + s * (78 + depth * 160);
        y = MID_Y + (puck.y - MID_Y) * 0.62;
      } else if (r.role === "mid") {
        const depth = attackDepth(r.team, puck.x);
        x = own + s * (150 + depth * 200);
        y = puck.y + (high ? -42 : 42);
      } else {
        const depth = attackDepth(r.team, puck.x);
        x = own + s * (230 + depth * 250);
        y = puck.y + (high ? 28 : -72);
      }
    } else if (r.role === "attacker") {
      x = opp - s * 88;
      y = high ? MID_Y + 118 : MID_Y - 118;
    } else if (r.role === "mid") {
      x = lead.x + s * 150;
      y = high ? MID_Y - 125 : MID_Y + 125;
    } else {
      x = lead.x - s * 145;
      y = high ? MID_Y + 95 : MID_Y - 95;
    }
    const spot = {
      x: clamp(x, RINK.x + 52, RINK.x + RINK.w - 52),
      y: clamp(y, RINK.y + 56, RINK.y + RINK.h - 56),
    };
    const oppNear = nearestOpponentAt(spot, r.team);
    if (oppNear && dist(spot, oppNear) < 68) {
      spot.y += spot.y < oppNear.y ? -56 : 56;
    }
    const shape = liveShape(r.team);
    const habit = habits[r.team];
    const mixed = r.card.styles.aggressive * 0.65 + shape.push * 0.35;
    spot.x += s * ((mixed - 50) / 50) * 86;
    const wide = (r.card.styles.wide * 0.7 + shape.width * 0.3 - 50) / 50;
    spot.y += (spot.y < MID_Y ? -1 : 1) * wide * 48;
    if (!atk && r.card.kind === "skater") spot.x -= s * ((defenseOf(r) - 5) * 7 - ((r.card.styles.physical - 50) / 50) * 26);
    if (habit.crash > 64 && r.role === "attacker") spot.x = opp - s * (78 - habit.crash * 0.25);
    spot.x = clamp(spot.x, RINK.x + 52, RINK.x + RINK.w - 52);
    spot.y = clamp(spot.y, RINK.y + 56, RINK.y + RINK.h - 56);
    return spot;
  }

  function nearestOpponentAt(p: { x: number; y: number }, team: Team) {
    let best: Robot | null = null;
    let bestD = 1e9;
    for (const o of robots) {
      if (o.team === team) continue;
      const d = dist(p, o);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  function laneBlocked(a: { x: number; y: number }, b: { x: number; y: number }, team: Team, pad = 32) {
    for (const o of robots) {
      if (o.team === team) continue;
      if (dist(o, a) < 24) continue;
      if (distToSeg(o, a, b) < pad) return true;
    }
    return false;
  }

  function wallPoint(from: { x: number; y: number }, to: { x: number; y: number }, team: Team) {
    const walls = [RINK.y + 16, RINK.y + RINK.h - 16];
    let best: { x: number; y: number } | null = null;
    let bestTravel = 1e9;
    for (const wy of walls) {
      const mirY = wy * 2 - to.y;
      const dy = mirY - from.y;
      const dx = to.x - from.x;
      if (Math.abs(dy) < 10) continue;
      const t = (wy - from.y) / dy;
      if (t < 0.15 || t > 0.9) continue;
      const bx = from.x + dx * t;
      if (bx < RINK.x + 48 || bx > RINK.x + RINK.w - 48) continue;
      const bounce = { x: bx, y: wy };
      if (laneBlocked(from, bounce, team)) continue;
      if (laneBlocked(bounce, to, team)) continue;
      const travel = dist(from, bounce) + dist(bounce, to);
      if (travel > 980 || travel >= bestTravel) continue;
      bestTravel = travel;
      best = bounce;
    }
    return best;
  }

  function desperate(r: Robot) {
    const own = ownGoalX(r.team);
    const nearNet = Math.abs(puck.x - own) < 150 && Math.abs(puck.y - MID_Y) < GOAL_HALF + 36;
    if (!nearNet) return false;
    const help = robots.some((o) => o !== r && o.team === r.team && o.role !== "goalie" && dist(o, puck) < 110);
    return !help;
  }

  function canShoot(r: Robot, shootBias = 50, early = 0) {
    if (r.role === "goalie") return false;
    if (r.role === "defender" && shootBias < 72 && early < 70) return false;
    const gx = r.team === "home" ? RINK.x + RINK.w : RINK.x;
    return Math.abs(gx - r.x) < 340 + shootBias * 0.8 + early && Math.abs(r.y - MID_Y) < 170 + early * 0.3;
  }

  function openLook(r: Robot) {
    if (r.role === "goalie" || attackDepth(r.team, r.x) < 0.5) return false;
    if (Math.abs(r.y - MID_Y) > 200) return false;
    const goal = { x: r.team === "home" ? RINK.x + RINK.w - 8 : RINK.x + 8, y: MID_Y };
    for (const o of robots) {
      if (o.team === r.team || o.role === "goalie") continue;
      if (dist(o, r) < 26) continue;
      if (distToSeg(o, r, goal) < 36) return false;
    }
    return true;
  }

  function passLaneY(r: Robot) {
    if (Math.abs(puck.vx) < 50) return null;
    const t = (r.x - puck.x) / puck.vx;
    if (t < 0 || t > 1.25) return null;
    const y = puck.y + puck.vy * t;
    if (y < RINK.y + 20 || y > RINK.y + RINK.h - 20) return null;
    return y;
  }

  function playTip(r: Robot, dt: number) {
    if (r.controlled || r.role === "goalie" || holder || !puck.laser || puck.from !== r.team || puck.struck.includes(r)) return false;
    const sp = Math.hypot(puck.vx, puck.vy) || 1;
    const nx = puck.vx / sp;
    const ny = puck.vy / sp;
    const dx = r.x - puck.x;
    const dy = r.y - puck.y;
    const along = dx * nx + dy * ny;
    if (along < 24 || along > 170) return false;
    const side = Math.abs(dx * ny - dy * nx);
    if (side > 78) return false;
    seek(r, puck.x + nx * along, puck.y + ny * along, 280 * speedOf(r), dt);
    return true;
  }

  function playPass(r: Robot, dt: number) {
    if (r.role === "goalie" || holder || puck.air > 0 || puck.shotNoted || puck.play !== "ice" || !puck.by || puck.by.team !== r.team || puck.by === r) return false;
    const iq = attackOf(r) / 11;
    if (iq < 0.36) return false;
    const s = attackSign(r.team);
    const speed = Math.hypot(r.vx, r.vy);
    const towardGoal = r.vx * s > 46;
    const lane = passLaneY(r);
    const hold = (y: number) => {
      r.vx *= Math.pow(0.18, dt);
      const dy = y - r.y;
      if (Math.abs(dy) > 16 && Math.abs(dy) < 100) r.vy += Math.sign(dy) * 140 * iq * dt;
      else r.vy *= Math.pow(0.22, dt);
    };
    if (!towardGoal || speed < 60) {
      hold(lane ?? r.y);
      return true;
    }
    const ty = lane !== null && Math.abs(lane - r.y) < 120 ? lane : r.y;
    seek(r, r.x + s * 170, ty, Math.max(speed, 190) * (0.72 + iq * 0.28), dt);
    return true;
  }

  function bestReceiver(from: Robot) {
    const s = attackSign(from.team);
    const goal = { x: from.team === "home" ? RINK.x + RINK.w : RINK.x, y: MID_Y };
    const risk = habits[from.team].risk;
    const minSpace = clamp(86 - risk * 0.58, 26, 86);
    const lanePad = clamp(42 - risk * 0.24, 16, 42);
    let best: Robot | null = null;
    let bestScore = 110;
    for (const o of robots) {
      if (o === from || o.team !== from.team || o.role === "goalie") continue;
      const d = dist(from, o);
      if (d < 75 || d > 500) continue;
      if (laneBlocked(from, o, from.team, lanePad)) continue;
      let space = 999;
      for (const opp of robots) {
        if (opp.team === from.team) continue;
        space = Math.min(space, dist(o, opp));
      }
      if (space < minSpace) continue;
      const ahead = (o.x - from.x) * s;
      const shot = !laneBlocked(o, goal, from.team, lanePad) && Math.abs(o.x - goal.x) < 360 ? 100 : 0;
      const score = space * 1.5 + ahead * 0.4 + shot;
      if (score > bestScore) {
        bestScore = score;
        best = o;
      }
    }
    return best;
  }

  function addScore(who: Team) {
    if (!holder && puck.by && puck.by.team === who && puck.by.role !== "goalie" && !puck.shotNoted) {
      puck.shotNoted = true;
      tally(puck.by.card.id, "shots");
      lastShot = puck.by;
    }
    const scorer = holder && holder.team === who && holder.role !== "goalie" ? holder : lastShot && lastShot.team === who ? lastShot : null;
    if (scorer) {
      tally(scorer.card.id, "goals");
      if (holder === scorer) tally(scorer.card.id, "rushes");
      if (lastPass && lastPass.card.id !== scorer.card.id && lastPass.team === who) tally(lastPass.card.id, "assists");
    }
    const keeper = [...robots, ...bench[who === "home" ? "away" : "home"]].find((robot) => robot.team !== who && robot.role === "goalie");
    if (keeper) tally(keeper.card.id, "ga");
    lastPass = null;
    lastShot = null;
    if (who === "home") scoreH += 1;
    else scoreA += 1;
    shake = 0.4;
    playSfx("goal");
    playSfx("cheer", { gain: who === "home" ? 1 : 0.45 });
    lineUp(who === "home" ? "away" : "home");
    if (scoreH >= 5 || scoreA >= 5 || overtime) finish(scoreH >= scoreA ? "HOME" : "AWAY");
  }

  function lineUp(keeper: Team, opening = false) {
    holder = null;
    carry = 0;
    trail.length = 0;
    puck.by = null;
    puck.air = 0;
    puck.airMax = 0;
    puck.shotNoted = false;
    puck.laser = false;
    puck.replayId = null;
    stopAllGlass();
    for (const r of robots) {
      const p = spot(r.team, r.role);
      r.x = p.x;
      r.y = p.y;
      r.vx = 0;
      r.vy = 0;
      r.grabLock = 0.45;
      r.boost = 1;
      r.boosting = false;
      r.rail = null;
      r.railLock = 0.35;
      r.coast = 0;
      r.pin = 0;
      r.hop = 0;
      r.hopMax = 0;
      r.jumpCd = 0.4;
      r.replay = 0;
      r.bumpCd = 0;
      r.idea = 0;
      r.pokeCd = 0.4;
      r.pokeT = 0;
      r.controlled = r.team === "home" && r.role === "attacker";
    }
    const goalie = robots.find((r) => r.team === keeper && r.role === "goalie");
    if (goalie) {
      goalie.grabLock = 0;
      takePuck(goalie);
    }
    breakout = keeper;
    facing = attackSign(keeper) > 0 ? 0 : Math.PI;
    if (opening) {
      faceoff = 0;
      beginCountdown();
    } else faceoff = 0.85;
  }

  let reported = false;
  function finish(name: string) {
    if (name === "HOME" && scoreH <= scoreA) {
      scoreH = scoreA + 1;
      ghostGoal("home");
    }
    if (name === "AWAY" && scoreA <= scoreH) {
      scoreA = scoreH + 1;
      ghostGoal("away");
    }
    gameOver = true;
    winner = name;
    if (reported) return;
    reported = true;
    playSfx(name === "HOME" ? "win" : "loss", { delay: 0.35 });
    onFinish?.(scoreH, scoreA, {
      blastoff,
      lines: [...book.entries()].map(([id, row]) => ({ id, ...row })),
    });
  }

  function ghostGoal(team: Team) {
    const pool = [...robots, ...bench[team]].filter((robot) => robot.team === team && robot.role !== "goalie");
    const scorer = pool[0];
    if (scorer) {
      tally(scorer.card.id, "goals");
      tally(scorer.card.id, "rushes");
    }
    const keeper = [...robots, ...bench[team === "home" ? "away" : "home"]].find((robot) => robot.team !== team && robot.role === "goalie");
    if (keeper) tally(keeper.card.id, "ga");
  }

  const draw = (time: number) => {
    fitCanvas(canvas, ctx, view);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 16, (Math.random() - 0.5) * shake * 16);
    paintWorld(ctx, time, {
      robots,
      puck,
      holder,
      carry,
      carryMax: carryLimit(holder),
      carryRed: !!holder && (inRed(holder) || holder.replay > 0),
      secondTouch: !!holder && holder === human() && holder.replay > 0,
      player: human(),
      facing,
      charging,
      charge,
      boost: human().boost,
      boosting: human().boosting,
      stick,
      scoreH,
      scoreA,
      timeLeft,
      overtime,
      gameOver,
      winner,
      faceoff,
      passBtn,
      shotBtn,
      ownPuck: holder?.team === "home",
      aimOn: cursor.on,
      aimX: cursor.x,
      aimY: cursor.y,
      mode,
      countLeft,
      note,
      blastoff,
      breakout,
      bend: bendTell(),
      arc: shotArc(),
      chipMark: chipMark(),
      trail,
      homeTag: match.homeTag ?? "",
      awayTag: match.awayTag ?? "",
      homeHue: match.homeHue ?? TEAM_HUE.home,
      awayHue: match.awayHue ?? TEAM_HUE.away,
      homeInk: match.homeInk ?? null,
      awayInk: match.awayInk ?? null,
      homeKit: match.homeKit ?? { primary: TEAM_HUE.home, secondary: 210, accent: 48 },
      awayKit: match.awayKit ?? { primary: TEAM_HUE.away, secondary: 280, accent: 18 },
      rinkKit: match.rinkKit ?? match.homeKit ?? { primary: TEAM_HUE.home, secondary: 168, accent: 200 },
      subs: bench.home,
      swap: swapLine,
    });
    ctx.restore();
  };

  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    measure();
    step(dt);
    setBoost(mode === "play" && !gameOver && faceoff <= 0 && !!human()?.boosting);
    draw((now - t0) / 1000);
    placeAim();
    raf = requestAnimationFrame(frame);
  };
  lineUp("away", true);
  raf = requestAnimationFrame(frame);

  function bendTell() {
    if (holder || faceoff > 0 || Math.abs(puck.spin) < 36) return null;
    const team = puck.by?.team ?? puck.from;
    if (!team) return null;
    const sp = Math.hypot(puck.vx, puck.vy) || 1;
    const side = Math.sign(puck.spin);
    return {
      pts: sampleArc(puck.x, puck.y, puck.vx, puck.vy, puck.spin, puck.hold, 0.5),
      alpha: clamp((Math.abs(puck.spin) - 36) / 260, 0.12, 0.9),
      team,
      nx: (-puck.vy / sp) * side,
      ny: (puck.vx / sp) * side,
    };
  }

  function shotArc() {
    if (holder !== human() || mode !== "play" || gameOver || charging === "chip") return null;
    const chargingSend = charging === "send";
    if (!chargingSend && stick.id === -1) return null;
    const ang = liveAim();
    const slap = inRed(holder);
    const t = chargingSend ? clamp(Math.max(charge, 0.15), 0.15, 1) : 0.7;
    const speed = shotSpeed(t, slap);
    const drift = holder.vx * -Math.sin(ang) + holder.vy * Math.cos(ang);
    const spin = curveAccel(drift, shotOf(holder), slap, t, holder.boosting, holder.coast);
    if (Math.abs(spin) < 36) return null;
    const vx = Math.cos(ang) * speed;
    const vy = Math.sin(ang) * speed;
    return sampleArc(holder.x + Math.cos(ang) * 28, holder.y + Math.sin(ang) * 28, vx, vy, spin, slap ? 0.97 : 0.84 + (shotOf(holder) - 1) * 0.014);
  }

  function chipMark() {
    if (holder !== human() || mode !== "play" || gameOver || charging !== "chip") return null;
    const plan = chipPlan(Math.max(charge, 0.08), shotOf(holder));
    const ang = liveAim();
    const x = holder.x + Math.cos(ang) * (28 + plan.travel);
    const y = holder.y + Math.sin(ang) * (28 + plan.travel);
    return {
      x: clamp(x, RINK.x + 20, RINK.x + RINK.w - 20),
      y: clamp(y, RINK.y + 20, RINK.y + RINK.h - 20),
      fromX: holder.x + Math.cos(ang) * 28,
      fromY: holder.y + Math.sin(ang) * 28,
    };
  }

  return {
    destroy() {
      running = false;
      setBoost(false);
      stopAllGlass();
      stopCountdown();
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("pointerrawupdate", onPointerMove as EventListener);
      window.removeEventListener("resize", measure);
      aimEl.remove();
      delete window.__controlsTest;
    },
  };
}

function spawnMatch(match: Matchup) {
  const roles: Role[] = ["attacker", "mid", "defender", "goalie"];
  const hues = { home: match.homeHue ?? TEAM_HUE.home, away: match.awayHue ?? TEAM_HUE.away };
  const robots = [
    ...match.home.ice.map((card, i) => robotFrom(card, "home", roles[i], i, i === 0, false, hues.home)),
    ...match.away.ice.map((card, i) => robotFrom(card, "away", roles[i], i, false, false, hues.away)),
  ];
  const bench: Record<Team, Robot[]> = {
    home: match.home.bench.map((card, i) => robotFrom(card, "home", "mid", i, false, true, hues.home)),
    away: match.away.bench.map((card, i) => robotFrom(card, "away", "mid", i, false, true, hues.away)),
  };
  return { robots, bench };
}

function robotFrom(card: PlayerCard, team: Team, role: Role, i: number, controlled: boolean, sub: boolean, hue: number): Robot {
  const p = sub ? { x: -300, y: -300 } : spot(team, role);
  const lives = lifeCount(card);
  return {
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    team,
    role,
    controlled,
    hover: i * 1.4 + (sub ? 3 : 0),
    hue,
    visor: card.visor,
    antenna: card.antenna,
    grabLock: 0,
    boost: 1,
    boosting: false,
    lives,
    lifeMax: lives,
    hurt: 0,
    rail: null,
    railLock: 0,
    coast: 0,
    pin: 0,
    pokeCd: 0,
    pokeT: 0,
    pokeX: 0,
    pokeY: 0,
    hop: 0,
    hopMax: 0,
    jumpCd: 0,
    grace: 0,
    replay: 0,
    bumpCd: 0,
    idea: 0,
    name: card.name,
    card,
  };
}

function curveAccel(drift: number, shot: number, slap: boolean, loaded: number, boost = false, fresh = 0) {
  const bend = slap ? 0.5 : 0.72 + clamp(loaded, 0.15, 1) * 0.9;
  const skill = 0.8 + (clamp(shot, 1, 11) - 1) * 0.03;
  let power = 2.85;
  if (boost) power *= 1.7;
  if (fresh > 0.04) power *= 1 + 1.85 * clamp(fresh / 1.15, 0, 1);
  return clamp(drift * power * bend * skill, -1400, 1400);
}

function advancePuck(vx: number, vy: number, spin: number, hold: number, dt: number) {
  let xvx = vx;
  let xvy = vy;
  let xspin = spin;
  if (Math.abs(xspin) > 8) {
    const sp = Math.hypot(xvx, xvy) || 1;
    const nx = -xvy / sp;
    const ny = xvx / sp;
    xvx += nx * xspin * dt;
    xvy += ny * xspin * dt;
    const next = Math.hypot(xvx, xvy) || 1;
    const retain = 1 - (1 - clamp(hold, 0.7, 1)) * dt * 1.6;
    xvx = (xvx / next) * sp * retain;
    xvy = (xvy / next) * sp * retain;
    xspin *= Math.pow(0.7, dt);
  } else xspin = 0;
  const damp = Math.pow(0.78, dt);
  return { vx: xvx * damp, vy: xvy * damp, spin: xspin };
}

function sampleArc(x: number, y: number, vx: number, vy: number, spin: number, hold: number, seconds = 0.81) {
  const pts: { x: number; y: number }[] = [{ x, y }];
  let px = x;
  let py = y;
  let pvx = vx;
  let pvy = vy;
  let ps = spin;
  const dt = 0.045;
  const steps = Math.max(2, Math.round(seconds / dt));
  for (let i = 0; i < steps; i++) {
    const next = advancePuck(pvx, pvy, ps, hold, dt);
    pvx = next.vx;
    pvy = next.vy;
    ps = next.spin;
    px += pvx * dt;
    py += pvy * dt;
    pts.push({ x: px, y: py });
    if (px < RINK.x + 8 || px > RINK.x + RINK.w - 8) break;
    if (py < RINK.y + 10 || py > RINK.y + RINK.h - 10) break;
  }
  return pts;
}

function spot(team: Team, role: Role) {
  const s = attackSign(team);
  const own = ownGoalX(team);
  if (role === "goalie") return { x: own + s * 34, y: MID_Y };
  if (role === "defender") return { x: own + s * 210, y: MID_Y + 130 };
  if (role === "mid") return { x: own + s * 360, y: MID_Y - 120 };
  return { x: W / 2 - s * 78, y: MID_Y + 36 };
}

function ownGoalX(team: Team) {
  return team === "home" ? RINK.x + 30 : RINK.x + RINK.w - 30;
}

function attackSign(team: Team) {
  return team === "home" ? 1 : -1;
}

function attackDepth(team: Team, x: number) {
  const own = ownGoalX(team);
  const opp = ownGoalX(team === "home" ? "away" : "home");
  return clamp((x - own) / (opp - own), 0, 1);
}

function strideSeek(r: Robot, tx: number, ty: number, speed: number, dt: number) {
  const dx = tx - r.x;
  const dy = ty - r.y;
  const d = Math.hypot(dx, dy) || 1;
  const blend = 1 - Math.exp(-dt / 0.16);
  r.vx += ((dx / d) * speed - r.vx) * blend;
  r.vy += ((dy / d) * speed - r.vy) * blend;
}

function seek(r: Robot, tx: number, ty: number, speed: number, dt = 1 / 60) {
  const dx = tx - r.x;
  const dy = ty - r.y;
  const d = Math.hypot(dx, dy) || 1;
  const coasting = r.coast > 0 && !r.rail;
  if (d < 10 && !coasting) {
    r.vx *= 0.7;
    r.vy *= 0.7;
    return;
  }
  const cur = Math.hypot(r.vx, r.vy);
  const sp = coasting ? Math.max(speed, cur) : d < 36 ? speed * (d / 36) : speed;
  const tau = coasting ? 0.55 : Math.max(0.02, 0.12 - (r.card.ratings.agility - 1) * 0.01);
  const blend = 1 - Math.exp(-dt / tau);
  r.vx += ((dx / d) * sp - r.vx) * blend;
  r.vy += ((dy / d) * sp - r.vy) * blend;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distToSeg(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const den = abx * abx + aby * aby || 1;
  const t = clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / den, 0, 1);
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}

function moveBody(r: Robot, dt: number, radius: number) {
  r.x += r.vx * dt;
  r.y += r.vy * dt;
  const minX = RINK.x + radius;
  const maxX = RINK.x + RINK.w - radius;
  const minY = RINK.y + radius;
  const maxY = RINK.y + RINK.h - radius;
  if (r.x < minX) {
    r.x = minX;
    r.vx *= -0.2;
  } else if (r.x > maxX) {
    r.x = maxX;
    r.vx *= -0.2;
  }
  if (r.y < minY) {
    r.y = minY;
    r.vy *= -0.2;
  } else if (r.y > maxY) {
    r.y = maxY;
    r.vy *= -0.2;
  }
}

function bodyMass(r: Robot) {
  const tough = r.card.kind === "skater" ? r.card.ratings.toughness : 7;
  const heavy = r.card.perks.includes("heavy") ? 1.45 : 1;
  return (0.72 + (tough - 1) * 0.078) * heavy;
}

function shoveApart(a: Robot, b: Robot) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let d = Math.hypot(dx, dy);
  if (d < 1) {
    dx = attackSign(b.team);
    dy = 0.4;
    d = Math.hypot(dx, dy);
  }
  const nx = dx / d;
  const ny = dy / d;
  const giveA = bodyMass(b) / (bodyMass(a) + bodyMass(b));
  const giveB = 1 - giveA;
  a.x -= nx * 48 * giveA;
  a.y -= ny * 48 * giveA;
  b.x += nx * 48 * giveB;
  b.y += ny * 48 * giveB;
  a.vx = -nx * 220 * giveA;
  a.vy = -ny * 110 * giveA;
  b.vx = nx * 120 * giveB + attackSign(b.team) * 200;
  b.vy = ny * 50 * giveB;
}

function pushApart(list: Robot[]) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      if (d < 0.5) {
        dx = 1;
        dy = 0.35;
        d = Math.hypot(dx, dy);
      }
      const min = a.team !== b.team ? 58 : 46;
      if (d >= min) continue;
      const massA = bodyMass(a);
      const massB = bodyMass(b);
      let giveA = massB / (massA + massB);
      let giveB = massA / (massA + massB);
      if (a.role === "goalie" && b.role !== "goalie") {
        giveA *= 0.2;
        giveB = 1 - giveA;
      } else if (b.role === "goalie" && a.role !== "goalie") {
        giveB *= 0.2;
        giveA = 1 - giveB;
      }
      const push = min - d;
      a.x -= (dx / d) * push * giveA;
      a.y -= (dy / d) * push * giveA;
      b.x += (dx / d) * push * giveB;
      b.y += (dy / d) * push * giveB;
      const shove = 26;
      a.vx -= (dx / d) * shove * giveA * 1.5;
      a.vy -= (dy / d) * shove * giveA * 1.5;
      b.vx += (dx / d) * shove * giveB * 1.5;
      b.vy += (dy / d) * shove * giveB * 1.5;
      const spA = Math.hypot(a.vx, a.vy);
      const spB = Math.hypot(b.vx, b.vy);
      if (spA > 160) {
        const kick = ((spA - 160) / 380) * massA * 64 * (b.role === "goalie" ? 0.22 : 1);
        b.vx += (a.vx / spA) * kick;
        b.vy += (a.vy / spA) * kick;
        const bleed = 0.05 * giveA;
        a.vx *= 1 - bleed;
        a.vy *= 1 - bleed;
      }
      if (spB > 160) {
        const kick = ((spB - 160) / 380) * massB * 64 * (a.role === "goalie" ? 0.22 : 1);
        a.vx -= (b.vx / spB) * kick;
        a.vy -= (b.vy / spB) * kick;
        const bleed = 0.05 * giveB;
        b.vx *= 1 - bleed;
        b.vy *= 1 - bleed;
      }
      if (a.team !== b.team) {
        if (a.rail) knockRail(a);
        if (b.rail) knockRail(b);
      }
    }
  }
}

function knockRail(r: Robot) {
  const wall = r.rail;
  r.rail = null;
  r.railLock = 0.65;
  r.coast = 0;
  r.vy = wall === "top" ? 250 : wall === "bottom" ? -250 : r.vy;
  r.vx *= 0.55;
  stopGlass(`${r.team}:${r.name}`);
}

function hitBtn(b: { x: number; y: number; w: number; h: number }, p: { x: number; y: number }) {
  return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
}

function fitCanvas(canvas: HTMLCanvasElement, c: CanvasRenderingContext2D, view: { pw: number; ph: number; scale: number; ox: number; oy: number }) {
  c.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  c.fillStyle = "#070b18";
  c.fillRect(-400, -400, W + 800, H + 800);
}

type Stick = { id: number; ox: number; oy: number; dx: number; dy: number; tx: number; ty: number };
type Btn = { x: number; y: number; w: number; h: number };

function paintWorld(
  c: CanvasRenderingContext2D,
  time: number,
  s: {
    robots: Robot[];
    puck: Puck;
    holder: Robot | null;
    carry: number;
    carryMax: number;
    carryRed: boolean;
    secondTouch: boolean;
    player: Robot;
    facing: number;
    charging: "chip" | "send" | null;
    charge: number;
    boost: number;
    boosting: boolean;
    stick: Stick;
    scoreH: number;
    scoreA: number;
    timeLeft: number;
    overtime: boolean;
    gameOver: boolean;
    winner: string;
    faceoff: number;
    passBtn: Btn;
    shotBtn: Btn;
    ownPuck: boolean;
    aimOn: boolean;
    aimX: number;
    aimY: number;
    mode: "play" | "pick" | "count";
    countLeft: number;
    note: string;
    blastoff: boolean;
    breakout: Team;
    bend: { pts: { x: number; y: number }[]; alpha: number; team: Team; nx: number; ny: number } | null;
    arc: { x: number; y: number }[] | null;
    chipMark: { x: number; y: number; fromX: number; fromY: number } | null;
    trail: { x: number; y: number }[];
    subs: Robot[];
    swap: { outName: string; outOverall: number; inName: string; inOverall: number } | null;
    homeTag: string;
    awayTag: string;
    homeHue: number;
    awayHue: number;
    homeInk: number | null;
    awayInk: number | null;
    homeKit: Kit;
    awayKit: Kit;
    rinkKit: Kit;
  },
) {
  const rink = s.rinkKit;
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, kitTone(rink, "primary", 1, 42, 14));
  sky.addColorStop(0.55, "#07111f");
  sky.addColorStop(1, kitTone(rink, "secondary", 1, 36, 10));
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  c.fillStyle = kitTone(rink, "accent", 0.75, 80, 78);
  for (let i = 0; i < 36; i++) {
    const x = (i * 89 + Math.sin(time * 0.15 + i) * 6) % W;
    c.fillRect(x, (i * 41) % 130, i % 6 === 0 ? 2 : 1, i % 6 === 0 ? 2 : 1);
  }
  for (let i = 0; i < 46; i++) {
    c.fillStyle = i % 2 ? kitTone(rink, "primary", 0.8, 80, 68) : kitTone(rink, "accent", 0.7, 75, 70);
    c.beginPath();
    c.arc(90 + ((i * 37) % 1020), 40 + (i % 3) * 18 + Math.sin(time * 3 + i) * 2, 4 + (i % 3), 0, Math.PI * 2);
    c.fill();
  }

  const ice = c.createLinearGradient(0, RINK.y, 0, RINK.y + RINK.h);
  ice.addColorStop(0, kitTone(rink, "primary", 0.34, 70, 46));
  ice.addColorStop(0.5, kitTone(rink, "secondary", 0.2, 55, 62));
  ice.addColorStop(1, kitTone(rink, "primary", 0.34, 70, 42));
  c.fillStyle = ice;
  roundRect(c, RINK.x, RINK.y, RINK.w, RINK.h, 26);
  c.fill();
  paintCrest(c, W / 2, MID_Y, 58, rink, 0.22);
  c.lineWidth = 4;
  c.strokeStyle = kitTone(rink, "secondary", 0.95, 75, 62);
  roundRect(c, RINK.x, RINK.y, RINK.w, RINK.h, 26);
  c.stroke();
  c.strokeStyle = kitTone(rink, "accent", 0.9, 85, 70);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(W / 2, RINK.y + 12);
  c.lineTo(W / 2, RINK.y + RINK.h - 12);
  c.stroke();
  c.beginPath();
  c.arc(W / 2, MID_Y, 70, 0, Math.PI * 2);
  c.stroke();
  paintCrest(c, RINK.x + 78, RINK.y + 46, 16, s.homeKit, 0.95);
  paintCrest(c, RINK.x + RINK.w - 78, RINK.y + 46, 16, s.awayKit, 0.95);
  strokeGoal(c, RINK.x, 1, postColor(s.homeHue, s.homeInk));
  strokeGoal(c, RINK.x + RINK.w, -1, postColor(s.awayHue, s.awayInk));

  for (const r of s.robots) {
    if (r.pin < 0.02) continue;
    const top = r.y < MID_Y;
    const edge = top ? RINK.y + 5 : RINK.y + RINK.h - 5;
    const reach = 40 + 150 * r.pin;
    const tip = top ? edge + reach : edge - reach;
    const y0 = Math.min(edge, tip);
    const h = Math.abs(tip - edge);
    c.save();
    c.shadowColor = "#ff2a1a";
    c.shadowBlur = 18;
    c.fillStyle = `rgba(255, 45, 30, ${0.45 + 0.5 * r.pin})`;
    c.fillRect(r.x - 9, y0, 18, h);
    c.fillStyle = "#fff1c9";
    c.fillRect(r.x - 2, y0, 4, h);
    c.restore();
  }

  for (const r of s.robots) if (r.rail) {
    const dir = Math.sign(r.vx) || 1;
    c.save();
    c.lineCap = "round";
    c.shadowColor = "#b8fbff";
    c.shadowBlur = 14;
    c.strokeStyle = "rgba(170, 250, 255, 0.95)";
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(r.x - dir * 24, r.y);
    c.lineTo(r.x - dir * 160, r.y);
    c.stroke();
    c.shadowBlur = 0;
    c.strokeStyle = "rgba(255,255,255,0.8)";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(r.x - dir * 18, r.y + (r.rail === "top" ? 10 : -10));
    c.lineTo(r.x - dir * 110, r.y + (r.rail === "top" ? 10 : -10));
    c.stroke();
    c.restore();
  }

  for (const r of s.robots) if (r.pokeT > 0) {
    const fade = r.pokeT / 0.26;
    c.save();
    c.lineCap = "round";
    c.shadowColor = "#fff3c4";
    c.shadowBlur = 16;
    c.strokeStyle = `rgba(255, 244, 214, ${0.35 + fade * 0.65})`;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(r.x, r.y);
    c.lineTo(r.pokeX, r.pokeY);
    c.stroke();
    c.shadowBlur = 0;
    c.strokeStyle = `rgba(255,255,255,${fade})`;
    c.lineWidth = 2;
    c.stroke();
    c.restore();
  }

  for (const r of s.robots) paintRobot(c, r, time, s.holder === r, s.carry, s.carryMax, s.carryRed, r.boosting, r.team === "home" ? s.homeKit : s.awayKit);

  if (s.bend && s.bend.pts.length > 1) {
    const kit = s.bend.team === "home" ? s.homeKit : s.awayKit;
    c.save();
    c.lineCap = "round";
    const pts = s.bend.pts;
    for (let i = 1; i < pts.length; i++) {
      const fade = 1 - (i - 1) / (pts.length - 1);
      c.strokeStyle = kitTone(kit, "primary", s.bend.alpha * fade, 82, 62);
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(pts[i - 1].x, pts[i - 1].y);
      c.lineTo(pts[i].x, pts[i].y);
      c.stroke();
    }
    c.restore();
  }

  if (s.arc && s.arc.length > 1) {
    c.save();
    c.lineCap = "round";
    c.setLineDash([7, 8]);
    c.strokeStyle = "rgba(126, 231, 255, 0.85)";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(s.arc[0].x, s.arc[0].y);
    for (let i = 1; i < s.arc.length; i++) c.lineTo(s.arc[i].x, s.arc[i].y);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  }

  if (s.trail.length > 1) {
    c.save();
    c.lineCap = "round";
    c.lineJoin = "round";
    c.shadowColor = "#ff3a2a";
    c.shadowBlur = 18;
    c.strokeStyle = "rgba(255, 70, 48, 0.35)";
    c.lineWidth = 16;
    c.beginPath();
    c.moveTo(s.trail[0].x, s.trail[0].y);
    for (let i = 1; i < s.trail.length; i++) c.lineTo(s.trail[i].x, s.trail[i].y);
    c.stroke();
    c.shadowBlur = 10;
    c.strokeStyle = "#fff6e8";
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  }

  if (s.chipMark) {
    c.save();
    c.setLineDash([5, 7]);
    c.strokeStyle = "rgba(255, 214, 120, 0.8)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(s.chipMark.fromX, s.chipMark.fromY);
    c.lineTo(s.chipMark.x, s.chipMark.y - 22);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = "rgba(255, 227, 107, 0.95)";
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(s.chipMark.x, s.chipMark.y, 16, 7, 0, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "rgba(255, 227, 107, 0.9)";
    c.beginPath();
    c.arc(s.chipMark.x, s.chipMark.y - 22, 5, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  const rise = s.puck.air > 0 && s.puck.airMax > 0 ? Math.sin((1 - s.puck.air / s.puck.airMax) * Math.PI) : 0;
  const lift = rise * 52;
  if (lift > 2) {
    c.save();
    c.fillStyle = `rgba(0, 0, 0, ${0.28 - rise * 0.12})`;
    c.beginPath();
    c.ellipse(s.puck.x, s.puck.y, 12 - rise * 5, 5 - rise * 1.5, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(255, 236, 180, 0.35)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(s.puck.x, s.puck.y);
    c.lineTo(s.puck.x, s.puck.y - lift);
    c.stroke();
    c.restore();
  }

  const hot = s.puck.laser && !s.holder;
  c.fillStyle = hot ? "#fff4ea" : rise > 0.2 ? "#f7fbff" : "#090b10";
  c.beginPath();
  c.arc(s.puck.x, s.puck.y - lift, 11 + rise * 3, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = hot ? "#ff3b2e" : s.holder ? "#ffe36b" : "#f5f7ff";
  if (hot) c.lineWidth = 3;
  c.stroke();

  if (s.bend) {
    const kit = s.bend.team === "home" ? s.homeKit : s.awayKit;
    const px = s.puck.x + s.bend.nx * 16;
    const py = s.puck.y - lift + s.bend.ny * 16;
    const ox = s.bend.nx;
    const oy = s.bend.ny;
    c.fillStyle = kitTone(kit, "primary", Math.min(1, s.bend.alpha + 0.2), 90, 66);
    c.beginPath();
    c.moveTo(px + ox * 8, py + oy * 8);
    c.lineTo(px - oy * 5.5, py + ox * 5.5);
    c.lineTo(px + oy * 5.5, py - ox * 5.5);
    c.closePath();
    c.fill();
  }

  if (s.puck.glint > 0) {
    const fade = s.puck.glint / 0.22;
    c.save();
    c.strokeStyle = `rgba(255, 244, 210, ${fade})`;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(s.puck.x, s.puck.y - lift, 18 + (1 - fade) * 16, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  c.fillStyle = "#f4f7ff";
  c.font = "700 36px ui-sans-serif, system-ui, sans-serif";
  c.textAlign = "center";
  if (s.homeTag && s.awayTag) {
    c.font = "700 16px ui-sans-serif, system-ui, sans-serif";
    c.fillStyle = postColor(s.homeHue, s.homeInk);
    c.textAlign = "right";
    c.fillText(s.homeTag, W / 2 - 86, 74);
    c.fillStyle = postColor(s.awayHue, s.awayInk);
    c.textAlign = "left";
    c.fillText(s.awayTag, W / 2 + 86, 74);
    c.textAlign = "center";
  }
  c.fillStyle = "#f4f7ff";
  c.font = "700 36px ui-sans-serif, system-ui, sans-serif";
  c.fillText(`${s.scoreH}  –  ${s.scoreA}`, W / 2, 78);
  c.font = "600 14px ui-sans-serif, system-ui, sans-serif";
  c.textAlign = "left";
  c.fillStyle = "rgba(220,232,255,0.78)";
  c.fillText(`SUBS ${s.subs.length}`, 96, 78);
  c.font = "600 20px ui-sans-serif, system-ui, sans-serif";
  c.fillStyle = s.overtime ? "#ffe36b" : "#9ad7ff";
  const m = Math.floor(s.timeLeft / 60);
  const sec = Math.floor(s.timeLeft % 60);
  c.fillText(s.overtime ? "GOLDEN GOAL" : `${m}:${sec.toString().padStart(2, "0")}`, W / 2, 108);

  c.fillStyle = "rgba(220,232,255,0.8)";
  c.font = "600 13px ui-sans-serif, system-ui, sans-serif";
  c.textAlign = "left";
  c.fillText("BOOST", 96, H - 48);
  roundRect(c, 148, H - 60, 160, 10, 5);
  c.strokeStyle = "rgba(255,255,255,0.35)";
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = s.boost > 0.25 ? "#7ee7ff" : "#ff8b6b";
  roundRect(c, 148, H - 60, 160 * s.boost, 10, 5);
  c.fill();

  c.fillStyle = "rgba(220,232,255,0.72)";
  c.font = "500 14px ui-sans-serif, system-ui, sans-serif";
  c.fillText("J chips, hold for distance   ·   K sends, checks, or jumps   ·   full-speed boost can bump or strip", 96, H - 22);

  paintButton(c, s.passBtn, s.ownPuck ? "CHIP" : "SWAP", s.charging === "chip");
  paintButton(c, s.shotBtn, s.secondTouch ? "SLAP" : s.holder === s.player ? "SEND" : s.player.role === "goalie" ? "JUMP" : "CHECK", s.charging === "send" || s.secondTouch);

  if (s.gameOver) {
    const name = s.winner === "HOME" ? s.homeTag || "HOME" : s.awayTag || "AWAY";
    banner(c, s.blastoff ? `${name} CLEARS` : `${name} WINS  ${s.scoreH}–${s.scoreA}`);
  } else if (s.mode === "pick") paintSubs(c, s.subs, s.swap);
  else if (s.mode === "count") {
    if (s.swap) paintSwap(c, s.swap);
    const tick = Math.ceil(s.countLeft - 1e-6);
    if (tick >= 1 && tick <= 3) banner(c, String(tick));
    if (s.note) {
      c.font = "700 18px ui-sans-serif, system-ui, sans-serif";
      c.fillStyle = "#ffb4a8";
      c.fillText(s.note, W / 2, H / 2 + 48);
    }
  } else if (s.faceoff > 0) {
    const tag = s.breakout === "home" ? s.homeTag || "HOME" : s.awayTag || "AWAY";
    banner(c, `${tag} BREAKOUT`);
  }
}

function paintButton(c: CanvasRenderingContext2D, b: Btn, label: string, hot: boolean) {
  c.fillStyle = hot ? "rgba(255, 227, 107, 0.92)" : "rgba(8, 16, 32, 0.72)";
  roundRect(c, b.x, b.y, b.w, b.h, 10);
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = hot ? "#fff4c2" : "rgba(180, 220, 255, 0.7)";
  c.stroke();
  c.fillStyle = hot ? "#1a1404" : "#e7f4ff";
  c.font = "700 15px ui-sans-serif, system-ui, sans-serif";
  c.textAlign = "center";
  c.fillText(label, b.x + b.w / 2, b.y + 32);
}

function paintSwap(c: CanvasRenderingContext2D, swap: { outName: string; outOverall: number; inName: string; inOverall: number }) {
  c.textAlign = "center";
  c.font = "800 22px ui-sans-serif, system-ui, sans-serif";
  c.fillStyle = "#ffb4a8";
  c.fillText(`${swap.outName.toUpperCase()}   ${swap.outOverall}   OUT`, W / 2, H / 2 - 96);
  if (swap.inName) {
    c.fillStyle = "#b6f3c9";
    c.fillText(`${swap.inName.toUpperCase()}   ${swap.inOverall}   IN`, W / 2, H / 2 - 68);
  }
}

function paintSubs(
  c: CanvasRenderingContext2D,
  subs: Robot[],
  swap: { outName: string; outOverall: number; inName: string; inOverall: number } | null,
) {
  c.fillStyle = "rgba(4, 8, 18, 0.62)";
  c.fillRect(0, 0, W, H);
  c.textAlign = "center";
  if (swap) {
    c.fillStyle = "#ffb4a8";
    c.font = "800 22px ui-sans-serif, system-ui, sans-serif";
    c.fillText(`${swap.outName.toUpperCase()}   ${swap.outOverall}   BLASTED`, W / 2, H / 2 - 148);
  }
  c.fillStyle = "#f7f8ff";
  c.font = "800 28px ui-sans-serif, system-ui, sans-serif";
  c.fillText("WHO COMES IN", W / 2, H / 2 - 112);
  subs.forEach((sub, i) => {
    const w = 168;
    const gap = 18;
    const total = subs.length * w + Math.max(0, subs.length - 1) * gap;
    const x = (W - total) / 2 + i * (w + gap);
    const y = H / 2 - 78;
    c.fillStyle = "rgba(8, 16, 32, 0.92)";
    roundRect(c, x, y, w, 156, 14);
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "rgba(180, 220, 255, 0.75)";
    c.stroke();
    c.fillStyle = `hsl(${sub.hue} 88% 62%)`;
    c.beginPath();
    c.arc(x + w / 2, y + 42, 22, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#f4f7ff";
    c.font = "700 16px ui-sans-serif, system-ui, sans-serif";
    c.fillText(sub.name, x + w / 2, y + 86);
    c.fillStyle = "#ffe36b";
    c.font = "800 22px ui-sans-serif, system-ui, sans-serif";
    c.fillText(String(sub.card.overall), x + w / 2, y + 112);
    c.font = "500 13px ui-sans-serif, system-ui, sans-serif";
    c.fillStyle = "rgba(220,232,255,0.75)";
    c.fillText("PRESS " + (i + 1), x + w / 2, y + 136);
  });
}

function fillTeamDisc(c: CanvasRenderingContext2D, x: number, y: number, radius: number, kit: Kit) {
  c.save();
  c.beginPath();
  c.arc(x, y, radius, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = kitTone(kit, "primary", 1, 82, 50);
  c.fillRect(x - radius - 1, y - radius - 1, radius * 2 + 2, radius * 2 + 2);
  c.fillStyle = kitTone(kit, "accent", 1, 86, 62);
  c.fillRect(x - radius - 1, y - radius - 1, radius * 2 + 2, radius * 0.4);
  c.fillStyle = kitTone(kit, "secondary", 1, 74, 56);
  c.fillRect(x - radius - 1, y + radius * 0.16, radius * 2 + 2, radius * 0.38);
  c.restore();
}

function paintRobot(
  c: CanvasRenderingContext2D,
  r: Robot,
  time: number,
  holding: boolean,
  carry: number,
  carryMax: number,
  red: boolean,
  boosting: boolean,
  kit: Kit,
) {
  const bob = (r.rail ? 0.2 : 1) * Math.sin(time * 3.1 + r.hover) * 5;
  const hop = r.hop > 0 && r.hopMax > 0 ? Math.sin((1 - r.hop / r.hopMax) * Math.PI) : 0;
  const y = r.y + bob - hop * 68;
  if (boosting) {
    const ang = Math.atan2(r.vy, r.vx) + Math.PI;
    c.fillStyle = "rgba(255, 196, 87, 0.9)";
    c.beginPath();
    c.moveTo(r.x + Math.cos(ang) * 18, y + Math.sin(ang) * 18);
    c.lineTo(r.x + Math.cos(ang + 0.5) * 8, y + Math.sin(ang + 0.5) * 8);
    c.lineTo(r.x + Math.cos(ang) * (28 + (time * 20) % 10), y + Math.sin(ang) * (28 + (time * 20) % 10));
    c.fill();
  }
  c.fillStyle = "rgba(0,0,0,0.3)";
  c.beginPath();
  c.ellipse(r.x, r.y + 22, 16 - hop * 7, 5 - hop * 1.4, 0, 0, Math.PI * 2);
  c.fill();
  fillTeamDisc(c, r.x, y, 20, kit);
  c.lineWidth = r.controlled ? 4 : 2;
  c.strokeStyle = r.controlled ? "#ffe36b" : "rgba(255,255,255,0.9)";
  c.beginPath();
  c.arc(r.x, y, 20, 0, Math.PI * 2);
  c.stroke();
  if (r.hurt > 0) {
    c.strokeStyle = `rgba(255,255,255,${r.hurt / 0.35})`;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(r.x, y, 23, 0, Math.PI * 2);
    c.stroke();
  }
  if (r.grace > 0) {
    c.save();
    c.setLineDash([4, 4]);
    c.strokeStyle = `rgba(190, 255, 220, ${0.35 + Math.min(1, r.grace / 2) * 0.55})`;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(r.x, y, 27, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
  if (holding) {
    if (red) {
      c.beginPath();
      c.arc(r.x, y, 32, 0, Math.PI * 2);
      c.strokeStyle = `rgba(255, 36, 36, ${0.45 + 0.45 * Math.sin(time * 18)})`;
      c.lineWidth = 6;
      c.stroke();
    }
    c.beginPath();
    c.arc(r.x, y, 27, -Math.PI / 2, -Math.PI / 2 + (carry / carryMax) * Math.PI * 2);
    c.strokeStyle = red ? "#ff2d2d" : "#ffe36b";
    c.lineWidth = red ? 5 : 3;
    c.stroke();
  }
  c.fillStyle = "#071018";
  if (r.visor === 0) c.fillRect(r.x - 9, y - 4, 18, 6);
  else if (r.visor === 1) {
    c.beginPath();
    c.arc(r.x, y - 1, 6, 0, Math.PI * 2);
    c.fill();
  } else {
    c.fillRect(r.x - 10, y - 6, 8, 8);
    c.fillRect(r.x + 2, y - 6, 8, 8);
  }
  c.strokeStyle = kitTone(kit, "accent", 1, 88, 70);
  c.lineWidth = 2;
  c.beginPath();
  if (r.antenna === 1) {
    c.moveTo(r.x - 6, y - 18);
    c.lineTo(r.x - 11, y - 30);
    c.moveTo(r.x + 6, y - 18);
    c.lineTo(r.x + 11, y - 30);
  } else if (r.antenna === 2) {
    c.moveTo(r.x - 5, y - 18);
    c.lineTo(r.x, y - 32);
    c.lineTo(r.x + 5, y - 18);
  } else if (r.antenna === 3) {
    c.moveTo(r.x, y - 20);
    c.lineTo(r.x + 9, y - 30);
  } else {
    c.moveTo(r.x, y - 20);
    c.lineTo(r.x, y - 32);
  }
  c.stroke();
  const pos = r.role === "goalie" ? "G" : r.role === "defender" ? "D" : r.role === "mid" ? "M" : "A";
  c.fillStyle = r.controlled ? "#ffe36b" : "rgba(244,247,255,0.92)";
  c.font = "700 12px ui-sans-serif, system-ui, sans-serif";
  c.textAlign = "center";
  c.fillText(`${pos}  ${r.name}`, r.x, y + 38);
  if (r.role !== "goalie") {
    const n = Math.max(1, r.lifeMax || 1);
    const span = 14;
    const start = r.x - ((n - 1) * span) / 2;
    for (let i = 0; i < n; i++) {
      const full = r.lives >= n;
      c.fillStyle = i < r.lives ? (full ? "#f4f7ff" : "#ff9a78") : "rgba(255,255,255,0.22)";
      c.beginPath();
      c.arc(start + i * span, y + 50, 2.6, 0, Math.PI * 2);
      c.fill();
    }
  }
}

function paintCrest(c: CanvasRenderingContext2D, x: number, y: number, r: number, kit: Kit, alpha: number) {
  c.save();
  c.globalAlpha = alpha;
  c.beginPath();
  c.moveTo(x, y - r);
  c.lineTo(x + r * 0.72, y - r * 0.42);
  c.lineTo(x + r * 0.72, y + r * 0.28);
  c.quadraticCurveTo(x + r * 0.72, y + r * 0.95, x, y + r);
  c.quadraticCurveTo(x - r * 0.72, y + r * 0.95, x - r * 0.72, y + r * 0.28);
  c.lineTo(x - r * 0.72, y - r * 0.42);
  c.closePath();
  c.fillStyle = kitTone(kit, "primary", 1, 74, 46);
  c.fill();
  c.beginPath();
  c.arc(x, y + r * 0.08, r * 0.38, 0, Math.PI * 2);
  c.fillStyle = kitTone(kit, "secondary", 1, 68, 58);
  c.fill();
  c.beginPath();
  c.moveTo(x, y - r * 0.22);
  c.lineTo(x + r * 0.18, y + r * 0.08);
  c.lineTo(x, y + r * 0.32);
  c.lineTo(x - r * 0.18, y + r * 0.08);
  c.closePath();
  c.fillStyle = hueGap(kit.accent, kit.secondary) < 14 && slotNeutral(kit) ? kitTone(kit, "primary", 1, 90, 78) : kitTone(kit, "accent", 1, 86, 64);
  c.fill();
  c.restore();
}

function postColor(hue: number, ink: number | null) {
  if (ink !== null) {
    const light = ink < 28 ? 78 : ink;
    return `hsl(220 ${ink < 14 || ink > 90 ? 0 : 8}% ${light}%)`;
  }
  return `hsl(${hue} 78% 62%)`;
}

function slotNeutral(kit: Kit) {
  return typeof kit.neutral?.accent !== "number" && typeof kit.neutral?.secondary !== "number";
}

function hsla(hue: number, alpha: number, saturation = 70, light = 55) {
  return `hsla(${Math.round(hue)}, ${saturation}%, ${light}%, ${alpha})`;
}

function strokeGoal(c: CanvasRenderingContext2D, x: number, dir: number, color: string) {
  c.strokeStyle = color;
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(x, MID_Y - GOAL_HALF);
  c.lineTo(x - dir * 26, MID_Y - GOAL_HALF);
  c.lineTo(x - dir * 26, MID_Y + GOAL_HALF);
  c.lineTo(x, MID_Y + GOAL_HALF);
  c.stroke();
}

function banner(c: CanvasRenderingContext2D, text: string) {
  c.fillStyle = "rgba(4, 8, 18, 0.55)";
  c.fillRect(0, H / 2 - 44, W, 88);
  c.fillStyle = "#f7f8ff";
  c.font = "800 40px ui-sans-serif, system-ui, sans-serif";
  c.textAlign = "center";
  c.fillText(text, W / 2, H / 2 + 12);
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
