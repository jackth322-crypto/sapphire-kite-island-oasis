// Side-view rink. Hover is drawn only. Roles hold shape; one player pressures the puck.

import {
  TEAM_HUE,
  pace,
  teamShape,
  type Matchup,
  type Perk,
  type PlayerCard,
  type TeamHabits,
  type TeamShape,
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
const CARRY_MAX = 2;
const BASE_SPEED = 284;
const BOOST_SPEED = 452;
const PULSE_CD = 10;

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
  pulse: number;
  hurt: number;
  name: string;
  card: PlayerCard;
};

type Puck = { x: number; y: number; vx: number; vy: number; bank: boolean };

export function mountSpaceHockey(canvas: HTMLCanvasElement, match: Matchup) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");

  const keys = new Set<string>();
  let injected: Set<string> | null = null;
  const spawned = spawnMatch(match);
  const robots = spawned.robots;
  const bench: Record<Team, Robot[]> = spawned.bench;
  const puck: Puck = { x: W / 2, y: MID_Y, vx: 0, vy: 0, bank: false };
  const baseShape = {
    home: teamShape([...match.home.ice, ...match.home.bench]),
    away: teamShape([...match.away.ice, ...match.away.bench]),
  };
  const habits: Record<Team, TeamHabits> = { home: match.homeHabits, away: match.awayHabits };
  const rings: { x: number; y: number; age: number }[] = [];

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
  let faceoff = 0.45;
  let shake = 0;
  let mode: "play" | "pick" | "count" = "play";
  let countLeft = 0;
  let openRole: Role = "mid";
  let blastoff = false;
  let note = "";
  const teamCool: Record<Team, number> = { home: 0, away: 0 };
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
  const blastBtn = { x: W - 392, y: H - 86, w: 112, h: 52 };

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
      return true;
    },
    wound: (team: string, role: string) => {
      const r = robots.find((o) => o.team === team && o.role === role);
      if (!r) return "missing";
      woundRobot(r);
      return r.lives;
    },
    cool: () => {
      teamCool.home = 0;
      teamCool.away = 0;
    },
    getMode: () => (blastoff ? "blastoff" : mode),
    bench: (team: string) => bench[team === "away" ? "away" : "home"].length,
    skip: () => {
      if (mode === "pick") chooseSub(0);
      if (mode === "count") {
        mode = "play";
        openNextDeath();
      }
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
    if (e.code === "KeyL") tryPulse(human());
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
    if (hitBtn(blastBtn, p)) {
      tryPulse(human());
      return;
    }
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
    if (!dragging && (hitBtn(blastBtn, p) || hitBtn(passBtn, p) || hitBtn(shotBtn, p))) return;
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
    const speed =
      kind === "pass" ? 280 + t * 300 : (480 + t * 420) * pace(holder ? shotOf(holder) : 5);
    launch(liveAim(), speed);
  }

  function liveAim() {
    pointFacing();
    return facing;
  }

  function launch(ang: number, speed: number) {
    if (!holder) return;
    const who = holder;
    holder.grabLock = 0.4;
    holder = null;
    carry = 0;
    secure = 0;
    puck.bank = perk(who, "bank");
    puck.vx = Math.cos(ang) * speed;
    puck.vy = Math.sin(ang) * speed;
  }

  function dropPuck() {
    if (!holder) return;
    const who = holder;
    const ang = travelAngle(who);
    who.grabLock = 0.55;
    holder = null;
    carry = 0;
    secure = 0;
    puck.bank = perk(who, "bank");
    puck.vx = Math.cos(ang) * 180 + who.vx * 0.3;
    puck.vy = Math.sin(ang) * 180 + who.vy * 0.3;
  }

  function takePuck(r: Robot, from: Robot | null = null) {
    if (from && from !== r) {
      from.grabLock = 1.05;
      shoveApart(from, r);
    }
    holder = r;
    carry = 0;
    secure = 0.85;
    puck.vx = 0;
    puck.vy = 0;
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
    if (holder?.team !== "home") return;
    if (human() === holder) return;
    for (const r of robots) r.controlled = r === holder;
    const sp = Math.hypot(holder.vx, holder.vy);
    facing = sp > 40 ? Math.atan2(holder.vy, holder.vx) : 0;
  }

  const step = (dt: number) => {
    shake = Math.max(0, shake - dt * 4);
    for (const ring of rings) ring.age += dt;
    for (let i = rings.length - 1; i >= 0; i--) if (rings[i].age > 0.4) rings.splice(i, 1);
    for (const r of robots) r.hurt = Math.max(0, r.hurt - dt);
    teamCool.home = Math.max(0, teamCool.home - dt);
    teamCool.away = Math.max(0, teamCool.away - dt);

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
    for (const r of robots) r.grabLock = Math.max(0, r.grabLock - dt);

    if (charging) charge = Math.min(1, charge + dt * 1.7);

    tickBoost(human(), down("Space"), dt);
    syncControl();
    drivePlayer(dt);
    driveAi(dt);

    if (faceoff > 0 || gameOver) return;

    for (const r of robots) moveBody(r, dt, 22);
    pushApart(robots);

    if (holder) {
      parentPuck();
      carry += dt;
      if (carry >= carryLimit(holder)) dropPuck();
      else maybeSteal();
    } else {
      slidePuck(dt);
      maybeGrab();
    }

    maybeAiPulse();
    maybeSave();

    if (inMouth() && puck.x < RINK.x + 8) addScore("away");
    else if (inMouth() && puck.x > RINK.x + RINK.w - 8) addScore("home");
  };

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
      shake = 0.12;
      return;
    }
  }

  function tryPulse(r: Robot) {
    if (mode !== "play" || gameOver || faceoff > 0 || holder !== r) return;
    if (teamCool[r.team] > 0) return;
    teamCool[r.team] = PULSE_CD;
    rings.push({ x: r.x, y: r.y, age: 0 });
    const hits = robots.filter((o) => o !== r && dist(r, o) < pulseRange(r));
    const knock = pulseKnock(r);
    for (const o of hits) {
      const dx = o.x - r.x;
      const dy = o.y - r.y;
      const d = Math.hypot(dx, dy) || 1;
      const shove = knock * (o.team === r.team ? 0.85 : 1);
      o.vx += (dx / d) * shove;
      o.vy += (dy / d) * shove;
      o.x += (dx / d) * 12;
      o.y += (dy / d) * 12;
    }
    for (const o of hits) {
      if (o.role === "goalie") continue;
      if (o.team === r.team && perk(r, "clean")) continue;
      woundRobot(o);
    }
    openNextDeath();
  }

  function maybeAiPulse() {
    const carrier = holder;
    if (!carrier || carrier.controlled || teamCool[carrier.team] > 0) return;
    const range = pulseRange(carrier);
    const near = robots.filter((o) => o !== carrier && dist(o, carrier) < range);
    const foe = near.some((o) => o.team !== carrier.team && o.role !== "goalie");
    const friend = near.some((o) => o.team === carrier.team && o.role !== "goalie");
    const heat = liveShape(carrier.team).heat;
    if (!foe) return;
    if (friend && heat < 72 && carrier.card.styles.physical < 78 && !perk(carrier, "clean")) return;
    tryPulse(carrier);
  }

  function woundRobot(r: Robot) {
    if (r.role === "goalie" || r.lives <= 0) return;
    r.lives -= 1;
    r.hurt = 0.35;
    shake = 0.35;
    if (r.lives > 0) return;
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

  function pulseRange(r: Robot) {
    if (r.card.kind === "goalie") return 48;
    return 40 + (r.card.ratings.blastArea - 1) * 6;
  }

  function pulseKnock(r: Robot) {
    if (r.card.kind === "goalie") return 140;
    return 90 + (r.card.ratings.blastPower - 1) * 22;
  }

  function carryLimit(r: Robot | null) {
    if (r && perk(r, "sticky")) return 2.75;
    return CARRY_MAX;
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
        const aim = (you.boosting ? BOOST_SPEED : BASE_SPEED) * speedOf(you);
        const tau = Math.max(0.016, 0.11 - (agilityOf(you) - 1) * 0.009);
        const blend = 1 - Math.exp(-dt / tau);
        you.vx += (Math.cos(wish) * aim - you.vx) * blend;
        you.vy += (Math.sin(wish) * aim - you.vy) * blend;
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
      if (sp > maxSp) {
        you.vx = (you.vx / sp) * maxSp;
        you.vy = (you.vy / sp) * maxSp;
      }
    } else {
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
  }

  function tickBoost(r: Robot, want: boolean, dt: number) {
    r.boosting = want && r.boost > 0.02 && !gameOver;
    const burn = perk(r, "afterburner") ? 1.7 : 1.15;
    const regen = perk(r, "afterburner") ? 1.55 : 2.6;
    if (r.boosting) r.boost = Math.max(0, r.boost - dt / burn);
    else r.boost = Math.min(1, r.boost + dt / regen);
  }

  function wantsBoost(r: Robot, chasing: boolean) {
    if (r.boost < 0.12 || gameOver) return false;
    if (r.role === "goalie") return desperate(r) && dist(r, puck) > 64 && dist(r, puck) < 190;
    const opp = nearestOpponent(r);
    if (holder === r) {
      if (opp && dist(r, opp) < 110) return true;
      return canShoot(r) && (!opp || dist(r, opp) > 130);
    }
    if (chasing && dist(r, puck) > 72) return true;
    return !!holder && holder.team !== r.team && attackDepth(r.team, puck.x) < 0.38 && dist(r, puck) > 150;
  }

  function driveAi(dt: number) {
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
        if (r.boosting) {
          const sp = Math.hypot(r.vx, r.vy) || 1;
          const boosted = BOOST_SPEED * speedOf(r);
          r.vx = (r.vx / sp) * boosted;
          r.vy = (r.vy / sp) * boosted;
        }
        continue;
      }
      const chasing = r === homeChaser || r === awayChaser;
      tickBoost(r, wantsBoost(r, chasing), dt);
      const spot = chasing ? chasePoint(r) : shapeSpot(r);
      const cruise = (r.role === "goalie" ? (desperate(r) ? 242 : 180) : chasing ? 248 : 210) * speedOf(r);
      seek(r, spot.x, spot.y, r.boosting ? BOOST_SPEED * speedOf(r) : cruise, dt);
    }
  }

  function deliver(r: Robot, target: { x: number; y: number }, speed: number, preferBounce: boolean) {
    const blocked = laneBlocked(r, target, r.team);
    const bounce = wallPoint(r, target, r.team);
    if (bounce && (blocked || preferBounce)) {
      launch(Math.atan2(bounce.y - r.y, bounce.x - r.x), speed);
      return true;
    }
    if (!blocked) {
      launch(Math.atan2(target.y - r.y, target.x - r.x), speed);
      return true;
    }
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
    if (r.role === "goalie" || carry > limit * (0.78 - patient * 0.12)) {
      if (mate && deliver(r, mate, passSpeed(r, mate), true)) return;
      launch(s > 0 ? 0 : Math.PI, 420 * pace(shotOf(r)));
      return;
    }
    const wantShot = canShoot(r, shootBias, habit.earlyShot) && carry > 0.2 + (1 - shootBias / 100) * 0.3 + patient * 0.18;
    const bounceShot = goalieInLane || (r.card.styles.wide + habit.bounce) / 2 > 68;
    if (wantShot && deliver(r, goal, 760 * pace(shotOf(r)), bounceShot)) return;
    const passNow = !!mate && carry > (shootBias > 65 ? 0.46 : 0.26);
    if (passNow && mate && deliver(r, mate, passSpeed(r, mate), r.card.styles.wide > 52 || habit.bounce > 58)) return;
    let tx = goal.x - s * 70;
    let ty = MID_Y + (r.y < MID_Y ? -1 : 1) * (36 + Math.abs(r.card.styles.wide - 50));
    const opp = nearestOpponent(r);
    if (opp && dist(r, opp) < 78) {
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
    const damp = Math.pow(0.78, dt);
    puck.vx *= damp;
    puck.vy *= damp;
    if (Math.hypot(puck.vx, puck.vy) < 12) {
      puck.vx = 0;
      puck.vy = 0;
    }
    puck.x += puck.vx * dt;
    puck.y += puck.vy * dt;
    const minY = RINK.y + 14;
    const maxY = RINK.y + RINK.h - 14;
    const keep = puck.bank ? 0.96 : 0.8;
    if (puck.y < minY) {
      puck.y = minY;
      puck.vy = Math.abs(puck.vy) * keep;
    } else if (puck.y > maxY) {
      puck.y = maxY;
      puck.vy = -Math.abs(puck.vy) * keep;
    }
    const mouth = inMouth();
    const minX = RINK.x + 14;
    const maxX = RINK.x + RINK.w - 14;
    if (!mouth && puck.x < minX) {
      puck.x = minX;
      puck.vx = Math.abs(puck.vx) * keep;
    } else if (!mouth && puck.x > maxX) {
      puck.x = maxX;
      puck.vx = -Math.abs(puck.vx) * keep;
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
      let y = MID_Y + (clamp(puck.y, MID_Y - GOAL_HALF, MID_Y + GOAL_HALF) - MID_Y) * track;
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
    return Math.abs(gx - r.x) < 260 + shootBias * 0.7 + early && Math.abs(r.y - MID_Y) < 150 + early * 0.35;
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
    if (who === "home") scoreH += 1;
    else scoreA += 1;
    shake = 0.4;
    holder = null;
    carry = 0;
    puck.x = W / 2;
    puck.y = MID_Y;
    puck.vx = 0;
    puck.vy = 0;
    for (const r of robots) {
      const p = spot(r.team, r.role);
      r.x = p.x;
      r.y = p.y;
      r.vx = 0;
      r.vy = 0;
      r.grabLock = 0.3;
      r.boost = 1;
      r.boosting = false;
      r.controlled = r.team === "home" && r.role === "attacker";
    }
    facing = 0;
    faceoff = 0.7;
    if (scoreH >= 5 || scoreA >= 5 || overtime) finish(scoreH >= scoreA ? "HOME" : "AWAY");
  }

  function finish(name: string) {
    gameOver = true;
    winner = name;
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
      blastBtn,
      ownPuck: holder?.team === "home",
      aimOn: cursor.on,
      aimX: cursor.x,
      aimY: cursor.y,
      mode,
      countLeft,
      note,
      blastoff,
      rings,
      subs: bench.home,
      pulse: teamCool.home,
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
  raf = requestAnimationFrame(frame);

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
  const robots = [
    ...match.home.ice.map((card, i) => robotFrom(card, "home", roles[i], i, i === 0, false)),
    ...match.away.ice.map((card, i) => robotFrom(card, "away", roles[i], i, false, false)),
  ];
  const bench: Record<Team, Robot[]> = {
    home: match.home.bench.map((card, i) => robotFrom(card, "home", "mid", i, false, true)),
    away: match.away.bench.map((card, i) => robotFrom(card, "away", "mid", i, false, true)),
  };
  return { robots, bench };
}

function robotFrom(card: PlayerCard, team: Team, role: Role, i: number, controlled: boolean, sub: boolean): Robot {
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
    hue: TEAM_HUE[team],
    visor: card.visor,
    antenna: card.antenna,
    grabLock: 0,
    boost: 1,
    boosting: false,
    lives: 3,
    pulse: 0,
    hurt: 0,
    name: card.name,
    card,
  };
}

function spot(team: Team, role: Role) {
  const s = attackSign(team);
  const own = ownGoalX(team);
  if (role === "goalie") return { x: own + s * 26, y: MID_Y };
  if (role === "defender") return { x: own + s * 180, y: MID_Y + 80 };
  if (role === "mid") return { x: W / 2 - s * 90, y: MID_Y - 70 };
  return { x: W / 2 - s * 10, y: MID_Y + 24 };
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
  if (d < 10) {
    r.vx *= 0.7;
    r.vy *= 0.7;
    return;
  }
  const sp = d < 36 ? speed * (d / 36) : speed;
  const tau = Math.max(0.02, 0.12 - (r.card.ratings.agility - 1) * 0.01);
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
  a.x -= nx * 36;
  a.y -= ny * 36;
  b.x += nx * 36;
  b.y += ny * 36;
  a.vx = -nx * 160;
  a.vy = -ny * 80;
  b.vx = nx * 80 + attackSign(b.team) * 200;
  b.vy = ny * 40;
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
      const heavyA = a.card.perks.includes("heavy") ? 1 : 0;
      const heavyB = b.card.perks.includes("heavy") ? 1 : 0;
      const push = ((min - d) / 2) * (1 + 0.45 * (heavyB - heavyA));
      a.x -= (dx / d) * push;
      a.y -= (dy / d) * push;
      b.x += (dx / d) * push;
      b.y += (dy / d) * push;
      const shove = 28 * (1 + heavyA + heavyB);
      a.vx -= (dx / d) * shove * (0.6 + heavyB);
      a.vy -= (dy / d) * shove * (0.6 + heavyB);
      b.vx += (dx / d) * shove * (0.6 + heavyA);
      b.vy += (dy / d) * shove * (0.6 + heavyA);
    }
  }
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
    blastBtn: Btn;
    ownPuck: boolean;
    aimOn: boolean;
    aimX: number;
    aimY: number;
    mode: "play" | "pick" | "count";
    countLeft: number;
    note: string;
    blastoff: boolean;
    rings: { x: number; y: number; age: number }[];
    subs: Robot[];
    pulse: number;
  },
) {
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#160b2e");
  sky.addColorStop(0.5, "#07111f");
  sky.addColorStop(1, "#04141c");
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  c.fillStyle = "rgba(190, 220, 255, 0.7)";
  for (let i = 0; i < 36; i++) {
    const x = (i * 89 + Math.sin(time * 0.15 + i) * 6) % W;
    c.fillRect(x, (i * 41) % 130, i % 6 === 0 ? 2 : 1, i % 6 === 0 ? 2 : 1);
  }
  for (let i = 0; i < 46; i++) {
    c.fillStyle = i % 2 ? "rgba(120,180,255,0.75)" : "rgba(230,140,255,0.7)";
    c.beginPath();
    c.arc(90 + ((i * 37) % 1020), 40 + (i % 3) * 18 + Math.sin(time * 3 + i) * 2, 4 + (i % 3), 0, Math.PI * 2);
    c.fill();
  }

  c.fillStyle = "rgba(140, 210, 255, 0.18)";
  roundRect(c, RINK.x, RINK.y, RINK.w, RINK.h, 26);
  c.fill();
  c.lineWidth = 3;
  c.strokeStyle = "rgba(255,255,255,0.88)";
  c.stroke();
  c.strokeStyle = "rgba(255,255,255,0.4)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(W / 2, RINK.y + 12);
  c.lineTo(W / 2, RINK.y + RINK.h - 12);
  c.stroke();
  c.beginPath();
  c.arc(W / 2, MID_Y, 52, 0, Math.PI * 2);
  c.stroke();
  strokeGoal(c, RINK.x, 1, "#ff6b8a");
  strokeGoal(c, RINK.x + RINK.w, -1, "#7eb0ff");

  for (const ring of s.rings) {
    c.strokeStyle = `rgba(255, 120, 90, ${1 - ring.age / 0.4})`;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(ring.x, ring.y, 16 + ring.age * 90, 0, Math.PI * 2);
    c.stroke();
  }

  for (const r of s.robots) paintRobot(c, r, time, s.holder === r, s.carry, s.carryMax, r.boosting, s.holder === r && r.team === "home" ? s.pulse : 0);

  c.fillStyle = "#090b10";
  c.beginPath();
  c.arc(s.puck.x, s.puck.y, 11, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = s.holder ? "#ffe36b" : "#f5f7ff";
  c.stroke();

  c.fillStyle = "#f4f7ff";
  c.font = "700 36px ui-sans-serif, system-ui, sans-serif";
  c.textAlign = "center";
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
  c.fillText("L blast with the puck  ·  J pass  ·  K shoot", 96, H - 22);

  paintButton(c, s.blastBtn, s.pulse > 0 ? String(Math.ceil(s.pulse)) : "BLAST", false);
  paintButton(c, s.passBtn, s.ownPuck ? "PASS" : "SWAP", s.charging === "pass");
  paintButton(c, s.shotBtn, "SHOOT", s.charging === "shot");

  if (s.gameOver) banner(c, s.blastoff ? `${s.winner} BLASTOFF` : `${s.winner} WINS`);
  else if (s.mode === "pick") paintSubs(c, s.subs);
  else if (s.mode === "count") {
    banner(c, String(Math.max(1, Math.ceil(s.countLeft))));
    if (s.note) {
      c.font = "700 18px ui-sans-serif, system-ui, sans-serif";
      c.fillStyle = "#ffb4a8";
      c.fillText(s.note, W / 2, H / 2 + 48);
    }
  } else if (s.faceoff > 0 && s.scoreH + s.scoreA > 0) banner(c, "FACEOFF");
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
  boosting: boolean,
  cool: number,
) {
  const bob = Math.sin(time * 3.1 + r.hover) * 5;
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
  if (r.role !== "goalie") {
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i < r.lives ? "#ff7a66" : "rgba(255,255,255,0.28)";
      c.beginPath();
      c.arc(r.x - 10 + i * 10, y - 30, 3.2, 0, Math.PI * 2);
      c.fill();
    }
  }
  if (cool > 0) {
    c.strokeStyle = "rgba(255,120,90,0.9)";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(r.x, y, 25, -Math.PI / 2, -Math.PI / 2 + (cool / PULSE_CD) * Math.PI * 2);
    c.stroke();
  }
  if (r.hurt > 0) {
    c.strokeStyle = `rgba(255,255,255,${r.hurt / 0.35})`;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(r.x, y, 23, 0, Math.PI * 2);
    c.stroke();
  }
  if (holding) {
    c.beginPath();
    c.arc(r.x, y, 27, -Math.PI / 2, -Math.PI / 2 + (carry / carryMax) * Math.PI * 2);
    c.strokeStyle = carry > carryMax * 0.75 ? "#ff6b6b" : "#ffe36b";
    c.lineWidth = 3;
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
  c.fillStyle = "rgba(244,247,255,0.85)";
  c.font = "700 11px ui-sans-serif, system-ui, sans-serif";
  c.textAlign = "center";
  c.fillText(r.role === "goalie" ? "G" : r.role === "defender" ? "D" : r.role === "mid" ? "M" : "A", r.x, y + 36);
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
