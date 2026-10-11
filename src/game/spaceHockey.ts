// Side-view rink. Hover is drawn only. Roles hold shape; one player pressures the puck.

import {
  TEAM_HUE,
  handlingWindow,
  hueGap,
  kitTone,
  pace,
  teamShape,
  type Matchup,
  type Perk,
  type PlayerCard,
  type TeamHabits,
  type TeamShape,
  type Kit,
} from "@/game/roster";

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
  hurt: number;
  rail: "top" | "bottom" | null;
  railLock: number;
  coast: number;
  pin: number;
  pokeCd: number;
  pokeT: number;
  pokeX: number;
  pokeY: number;
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
  play: "pass" | "shot" | "loose";
  from: Team | null;
  by: Robot | null;
  struck: Robot[];
  spin: number;
  hold: number;
  glint: number;
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
  let charging: "pass" | "shot" | null = null;
  let charge = 0;
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
  let openRole: Role = "mid";
  let breakout: Team = "away";
  let blastoff = false;
  let note = "";
  let freezeAi = false;
  const deaths: { team: Team; role: Role }[] = [];

  const stick = { id: -1, ox: 0, oy: 0, dx: 0, dy: 0, tx: 0, ty: 0 };
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
        mode = "play";
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
      return slap ? "slap" : "shot";
    },
    pass: () => {
      if (!holder || mode !== "play") return "no";
      const slap = inRed(holder);
      release(facing, slap ? 860 : 520, slap, "pass");
      return slap ? "slap" : "pass";
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
        charging = "pass";
        charge = 0;
      }
    }
    if (e.code === "KeyK") {
      charging = "shot";
      charge = 0;
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
    if (e.code === "KeyJ" && charging === "pass") fire("pass");
    if (e.code === "KeyK" && charging === "shot") fire("shot");
  };
  const onBlur = () => {
    keys.clear();
    charging = null;
    charge = 0;
    stick.id = -1;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!inside(e)) return;
    const p = worldFromClient(e.clientX, e.clientY);
    if (mode === "pick") {
      bench.home.forEach((_, i) => {
        if (hitBtn(subCard(i, bench.home.length), p)) chooseSub(i);
      });
      return;
    }
    if (mode !== "play" || gameOver) return;
    if (hitBtn(passBtn, p)) {
      if (!holder || holder.team !== "home") switchSkater();
      else {
        charge = 0.7;
        fire("pass");
      }
      return;
    }
    if (hitBtn(shotBtn, p)) {
      charge = 0.7;
      fire("shot");
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

  function fire(kind: "pass" | "shot") {
    const t = clamp(Math.max(charge, 0.2), 0.2, 1);
    charging = null;
    charge = 0;
    if (holder !== human() || gameOver || mode !== "play") return;
    const slap = inRed(holder);
    const speed = kind === "pass" ? (slap ? 520 + t * 280 : 280 + t * 300) : shotSpeed(t, slap);
    release(liveAim(), speed, slap, kind, t);
  }

  function shotSpeed(t: number, slap: boolean) {
    const paceShot = pace(holder ? shotOf(holder) : 5);
    return (slap ? 760 + t * 480 : 480 + t * 420) * paceShot;
  }

  function liveAim() {
    pointFacing();
    return facing;
  }

  function release(ang: number, speed: number, slap: boolean, play: "pass" | "shot" | "loose", loaded = 0.75) {
    if (!holder) return;
    const who = holder;
    who.grabLock = slap ? 0.35 : 0.4;
    who.pin = 0;
    holder = null;
    carry = 0;
    secure = 0;
    puck.bank = perk(who, "bank");
    puck.vx = Math.cos(ang) * speed;
    puck.vy = Math.sin(ang) * speed;
    puck.play = play;
    puck.from = who.team;
    puck.by = slap ? who : puck.by;
    puck.laser = slap;
    puck.peak = slap ? speed : 0;
    puck.struck = [who];
    trail.length = 0;
    if (play === "shot") {
      const drift = who.vx * -Math.sin(ang) + who.vy * Math.cos(ang);
      const shot = shotOf(who);
      puck.spin = curveAccel(drift, shot, slap, loaded);
      puck.hold = slap ? 0.97 : 0.84 + (shot - 1) * 0.014;
    } else {
      puck.spin = 0;
      puck.hold = 1;
    }
    puck.glint = 0;
    if (play === "shot") {
      tally(who.card.id, "shots");
      lastShot = who;
    }
    if (play === "pass") lastPass = who;
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
  }

  function takePuck(r: Robot, from: Robot | null = null) {
    if (from && from !== r) {
      if (from.team !== r.team) lastPass = null;
      from.grabLock = 1.05;
      shoveApart(from, r);
    }
    holder = r;
    carry = 0;
    secure = 0.85;
    puck.vx = 0;
    puck.vy = 0;
    puck.laser = false;
    puck.play = "loose";
    puck.peak = 0;
    puck.spin = 0;
    puck.hold = 1;
    puck.glint = 0;
    puck.struck = [];
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
    }

    if (mode === "count") {
      countLeft = Math.max(0, countLeft - dt);
      if (countLeft === 0) {
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
    }

    if (charging) charge = Math.min(1, charge + dt * 1.7);
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
    pushApart(robots);
    tickPins(dt);

    if (holder) {
      parentPuck();
      carry += dt;
      if (carry >= carryLimit(holder)) dropPuck();
      else maybeSteal();
    } else {
      slidePuck(dt);
      tickLaser();
      maybeGrab();
    }

    maybePoke();
    maybeSave();

    if (inMouth() && puck.x < RINK.x + 8) addScore("away");
    else if (inMouth() && puck.x > RINK.x + RINK.w - 8) addScore("home");
  };

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
      const reach = 22 + (q.iq * 0.5 + q.speed * 0.25 + q.agility * 0.25 - 1) * 3.1;
      if (dist(g, puck) > reach || Math.abs(puck.y - g.y) > reach) continue;
      const keep = 0.92 - (q.rebound - 1) * 0.065;
      const s = attackSign(g.team);
      puck.vx = s * Math.abs(puck.vx) * keep;
      puck.vy *= keep * 0.65;
      puck.x = g.x + s * 20;
      puck.laser = false;
      puck.play = "loose";
      puck.spin = 0;
      tally(g.card.id, "saves");
      shake = 0.12;
      return;
    }
  }

  function inRed(r: Robot) {
    return r.role !== "goalie" && carry >= redAtOf(r);
  }

  function tickLaser() {
    const sp = Math.hypot(puck.vx, puck.vy);
    if (puck.laser && sp < Math.max(520, puck.peak * 0.8)) puck.laser = false;
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
    if (r.role === "goalie" || r.lives <= 0) return;
    r.lives -= 1;
    r.hurt = 0.45;
    shake = 0.28;
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
    deaths.push({ team, role });
    openNextDeath();
  }

  function openNextDeath() {
    if (mode !== "play" || gameOver || deaths.length === 0) return;
    const d = deaths[0];
    const subs = bench[d.team];
    const skaters = robots.filter((o) => o.team === d.team && o.role !== "goalie");
    if (subs.length === 0 && skaters.length === 0) {
      deaths.length = 0;
      blastoff = true;
      note = "";
      finish(d.team === "home" ? "AWAY" : "HOME");
      return;
    }
    deaths.shift();
    openRole = d.role;
    if (subs.length === 0) {
      note = "SHORTHANDED";
      mode = "count";
      countLeft = 3;
      return;
    }
    note = "";
    if (d.team === "away") {
      bringIn(subs[0]);
      mode = "count";
      countLeft = 3;
      return;
    }
    mode = "pick";
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
    sub.lives = 2;
    sub.controlled = false;
    robots.push(sub);
    if (!robots.some((o) => o.controlled) && sub.team === "home") sub.controlled = true;
  }

  function chooseSub(index: number) {
    if (mode !== "pick") return;
    const sub = bench.home[index];
    if (!sub) return;
    bringIn(sub);
    mode = "count";
    countLeft = 3;
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
    const regen = perk(r, "afterburner") ? 1.55 : 2.6;
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
    if (chasing && dist(r, puck) > 72) return true;
    return !!holder && holder.team !== r.team && attackDepth(r.team, puck.x) < 0.38 && dist(r, puck) > 150;
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
      const chasing = r === homeChaser || r === awayChaser;
      tickBoost(r, wantsBoost(r, chasing), dt);
      const spot = glassEnter(r)
        ? { x: r.x + attackSign(r.team) * 220, y: r.y < MID_Y ? TOP_Y : BOT_Y }
        : chasing
          ? chasePoint(r)
          : shapeSpot(r);
      const cruise = (r.role === "goalie" ? (desperate(r) ? 242 : 180) : chasing ? 248 : 210) * speedOf(r);
      seek(r, spot.x, spot.y, r.boosting ? BOOST_SPEED * speedOf(r) : cruise, dt);
      applyGlass(r, glassEnter(r), glassPeel(r), attackSign(r.team));
    }
  }

  function glassEnter(r: Robot) {
    if (r.role === "goalie" || r.rail) return false;
    if (holder === r && attackDepth(r.team, r.x) < 0.55) return true;
    if (holder?.team === r.team || r.role !== "defender") return false;
    return attackDepth(r.team, puck.x) < 0.28;
  }

  function glassPeel(r: Robot) {
    return !!r.rail && holder === r && attackDepth(r.team, r.x) > 0.62;
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
    const keep =
      r.controlled ||
      (holder === r && attackDepth(r.team, r.x) <= 0.62) ||
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
  }

  function pinSpot(r: Robot) {
    if (r.role === "goalie" || r.rail || holder === r) return null;
    if (!holder || holder.team === r.team || holder.role === "goalie" || holder.rail) return null;
    if (!nearGlass(holder)) return null;
    if (r !== pickChaser(r.team) && r.card.styles.physical < 74) return null;
    return { x: holder.x, y: holder.y < MID_Y ? holder.y + 34 : holder.y - 34 };
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
    if (r.role !== "goalie" && look && carry > 0.08 && !pressed) {
      const slap = inRed(r);
      release(Math.atan2(goal.y - r.y, goal.x - r.x), (slap ? 940 : 760) * pace(shotOf(r)), slap, "shot");
      return;
    }
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
        launch(s > 0 ? 0 : Math.PI, 460);
        return;
      }
      dropPuck();
      return;
    }
    const wantShot = (look || close) && carry > 0.14 + patient * 0.08;
    const bounceShot = !look && (goalieInLane || (r.card.styles.wide + habit.bounce) / 2 > 68);
    if (wantShot && deliver(r, goal, 760 * pace(shotOf(r)), bounceShot, "shot")) return;
    const passNow = !!mate && !look && !close && carry > (shootBias > 70 ? 0.58 : 0.4);
    if (passNow && mate && deliver(r, mate, passSpeed(r, mate), r.card.styles.wide > 52 || habit.bounce > 58, "pass")) return;
    let tx = goal.x - s * 70;
    let ty = MID_Y + (r.y < MID_Y ? -1 : 1) * (36 + Math.abs(r.card.styles.wide - 50));
    if (attackDepth(r.team, r.x) < 0.55 && !pressed) {
      tx = r.x + s * 260;
      ty = r.y < MID_Y ? TOP_Y : BOT_Y;
    } else if (opp && dist(r, opp) < 78) {
      const side = r.y <= opp.y ? -1 : 1;
      tx = r.x + s * 120;
      ty = r.y + side * 110;
    }
    seek(r, tx, ty, 262 * speedOf(r), dt);
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
      if (dist(r, puck) < reach) {
        const prev = holder;
        takePuck(r, prev);
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
    if (best) takePuck(best);
  }

  function slidePuck(dt: number) {
    const next = advancePuck(puck.vx, puck.vy, puck.spin, puck.hold, dt);
    puck.vx = next.vx;
    puck.vy = next.vy;
    puck.spin = next.spin;
    if (Math.hypot(puck.vx, puck.vy) < 12) {
      puck.vx = 0;
      puck.vy = 0;
      puck.spin = 0;
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
    const mouth = inMouth();
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
    const depth = attackDepth(team, puck.x);
    const prefer: Role = depth < 0.36 ? "defender" : depth < 0.66 ? "mid" : "attacker";
    const preferred = field.find((r) => r.role === prefer) ?? field[0];
    let closest = field[0];
    for (const r of field) if (dist(r, puck) < dist(closest, puck)) closest = r;
    if (dist(preferred, puck) < dist(closest, puck) + 160) return preferred;
    return closest;
  }

  function chasePoint(r: Robot) {
    if (r.grabLock > 0.15) return shapeSpot(r);
    if (holder && holder.team !== r.team) {
      const dx = r.x - holder.x;
      const dy = r.y - holder.y;
      const d = Math.hypot(dx, dy);
      if (d < 14) {
        const s = attackSign(r.team);
        return { x: holder.x - s * 90, y: holder.y + (r.y < holder.y ? -70 : 70) };
      }
      const stand = secure > 0 ? 88 : 52;
      return { x: holder.x + (dx / d) * stand, y: holder.y + (dy / d) * stand };
    }
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
      if (!holder && Math.abs(puck.spin) > 12) {
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
        x = own + s * 88;
        y = puck.y + (high ? 78 : -78);
      } else if (r.role === "mid") {
        x = own + s * 168;
        y = puck.y + (high ? -55 : 55);
      } else {
        x = own + s * 255;
        y = puck.y + (high ? 30 : -100);
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
    if (r.role === "goalie" || holder || puck.play !== "pass" || puck.from !== r.team) return false;
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
    lineUp(who === "home" ? "away" : "home");
    if (scoreH >= 5 || scoreA >= 5 || overtime) finish(scoreH >= scoreA ? "HOME" : "AWAY");
  }

  function lineUp(keeper: Team) {
    holder = null;
    carry = 0;
    trail.length = 0;
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
    faceoff = 0.85;
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
      carryRed: !!holder && inRed(holder),
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
      arc: shotArc(),
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
    });
    ctx.restore();
  };

  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    measure();
    step(dt);
    draw((now - t0) / 1000);
    placeAim();
    raf = requestAnimationFrame(frame);
  };
  lineUp("away");
  raf = requestAnimationFrame(frame);

  function shotArc() {
    if (holder !== human() || mode !== "play" || gameOver || charging === "pass") return null;
    const chargingShot = charging === "shot";
    if (!chargingShot && stick.id === -1) return null;
    const ang = liveAim();
    const slap = inRed(holder);
    const t = chargingShot ? clamp(Math.max(charge, 0.15), 0.15, 1) : 0.7;
    const speed = shotSpeed(t, slap);
    const drift = holder.vx * -Math.sin(ang) + holder.vy * Math.cos(ang);
    const spin = curveAccel(drift, shotOf(holder), slap, t);
    if (Math.abs(spin) < 36) return null;
    const vx = Math.cos(ang) * speed;
    const vy = Math.sin(ang) * speed;
    return sampleArc(holder.x + Math.cos(ang) * 28, holder.y + Math.sin(ang) * 28, vx, vy, spin, slap ? 0.97 : 0.84 + (shotOf(holder) - 1) * 0.014);
  }

  return {
    destroy() {
      running = false;
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
    lives: 2,
    hurt: 0,
    rail: null,
    railLock: 0,
    coast: 0,
    pin: 0,
    pokeCd: 0,
    pokeT: 0,
    pokeX: 0,
    pokeY: 0,
    name: card.name,
    card,
  };
}

function curveAccel(drift: number, shot: number, slap: boolean, loaded: number) {
  const bend = slap ? 0.22 : 0.35 + clamp(loaded, 0.15, 1) * 0.75;
  const skill = 0.62 + (clamp(shot, 1, 11) - 1) * 0.05;
  return clamp(drift * 1.55 * bend * skill, -460, 460);
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
    xspin *= Math.pow(0.42, dt);
  } else xspin = 0;
  const damp = Math.pow(0.78, dt);
  return { vx: xvx * damp, vy: xvy * damp, spin: xspin };
}

function sampleArc(x: number, y: number, vx: number, vy: number, spin: number, hold: number) {
  const pts: { x: number; y: number }[] = [{ x, y }];
  let px = x;
  let py = y;
  let pvx = vx;
  let pvy = vy;
  let ps = spin;
  const dt = 0.045;
  for (let i = 0; i < 18; i++) {
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
      const giveA = massB / (massA + massB);
      const giveB = massA / (massA + massB);
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
        const kick = ((spA - 160) / 380) * massA * 64;
        b.vx += (a.vx / spA) * kick;
        b.vy += (a.vy / spA) * kick;
        const bleed = 0.05 * giveA;
        a.vx *= 1 - bleed;
        a.vy *= 1 - bleed;
      }
      if (spB > 160) {
        const kick = ((spB - 160) / 380) * massB * 64;
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
    player: Robot;
    facing: number;
    charging: "pass" | "shot" | null;
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
    arc: { x: number; y: number }[] | null;
    trail: { x: number; y: number }[];
    subs: Robot[];
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

  for (const r of s.robots) paintRobot(c, r, time, s.holder === r, s.carry, s.carryMax, s.carryRed, r.boosting);

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

  const hot = s.puck.laser && !s.holder;
  c.fillStyle = hot ? "#fff4ea" : "#090b10";
  c.beginPath();
  c.arc(s.puck.x, s.puck.y, 11, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = hot ? "#ff3b2e" : s.holder ? "#ffe36b" : "#f5f7ff";
  if (hot) c.lineWidth = 3;
  c.stroke();

  if (s.puck.glint > 0) {
    const fade = s.puck.glint / 0.22;
    c.save();
    c.strokeStyle = `rgba(255, 244, 210, ${fade})`;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(s.puck.x, s.puck.y, 18 + (1 - fade) * 16, 0, Math.PI * 2);
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
  c.fillText("Drift into the shot to bend it   ·   stand in a red-ring slap to tip it", 96, H - 22);

  paintButton(c, s.passBtn, s.ownPuck ? "PASS" : "SWAP", s.charging === "pass");
  paintButton(c, s.shotBtn, "SHOOT", s.charging === "shot");

  if (s.gameOver) {
    const name = s.winner === "HOME" ? s.homeTag || "HOME" : s.awayTag || "AWAY";
    banner(c, s.blastoff ? `${name} CLEARS` : `${name} WINS  ${s.scoreH}–${s.scoreA}`);
  } else if (s.mode === "pick") paintSubs(c, s.subs);
  else if (s.mode === "count") {
    banner(c, String(Math.max(1, Math.ceil(s.countLeft))));
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

function paintSubs(c: CanvasRenderingContext2D, subs: Robot[]) {
  c.fillStyle = "rgba(4, 8, 18, 0.62)";
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#f7f8ff";
  c.font = "800 28px ui-sans-serif, system-ui, sans-serif";
  c.textAlign = "center";
  c.fillText("CHOOSE A SUB", W / 2, H / 2 - 118);
  c.font = "500 15px ui-sans-serif, system-ui, sans-serif";
  c.fillStyle = "rgba(220,232,255,0.8)";
  c.fillText("They drop in at center ice", W / 2, H / 2 - 94);
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
    c.arc(x + w / 2, y + 48, 22, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#f4f7ff";
    c.font = "700 16px ui-sans-serif, system-ui, sans-serif";
    c.fillText(sub.name, x + w / 2, y + 96);
    c.font = "500 13px ui-sans-serif, system-ui, sans-serif";
    c.fillStyle = "rgba(220,232,255,0.75)";
    c.fillText("PRESS " + (i + 1), x + w / 2, y + 122);
  });
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
) {
  const bob = (r.rail ? 0.2 : 1) * Math.sin(time * 3.1 + r.hover) * 5;
  const y = r.y + bob;
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
  c.ellipse(r.x, r.y + 22, 16, 5, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = `hsl(${r.hue} 88% 62%)`;
  c.beginPath();
  c.arc(r.x, y, 20, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = r.controlled ? 4 : 2;
  c.strokeStyle = r.controlled ? "#ffe36b" : "rgba(255,255,255,0.9)";
  c.stroke();
  if (r.hurt > 0) {
    c.strokeStyle = `rgba(255,255,255,${r.hurt / 0.35})`;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(r.x, y, 23, 0, Math.PI * 2);
    c.stroke();
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
  c.strokeStyle = `hsl(${r.hue} 88% 72%)`;
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
    for (let i = 0; i < 2; i++) {
      c.fillStyle = i < r.lives ? (r.lives === 1 ? "#ff9a78" : "#f4f7ff") : "rgba(255,255,255,0.22)";
      c.beginPath();
      c.arc(r.x - 7 + i * 14, y + 50, 2.6, 0, Math.PI * 2);
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
