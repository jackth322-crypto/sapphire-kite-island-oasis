import { GripVertical } from "lucide-react";
import { PerkIcons } from "@/components/Perks";
import { overallColor, PlayerMark, ratingColor } from "@/components/PlayerMark";
import { useMemo, useRef, useState } from "react";
import {
  dealRandom,
  fitHint,
  habitLine,
  makePool,
  overallGoalie,
  overallSkater,
  PERK_LABEL,
  PERKS,
  rollHabits,
  styleName,
  teamColor,
  teamGrades,
  teamShape,
  type DealBias,
  type GoalieCard,
  type GoalieRatings,
  type Matchup,
  type Perk,
  type PlayerCard,
  type SkaterCard,
  type SkaterRatings,
  type Styles,
  type TeamHabits,
} from "@/game/roster";

type SideName = "home" | "away";
type Slot = { side: SideName; index: number };

const SLOT_NAMES = ["Attack", "Mid", "Defense", "Goalie", "Sub 1", "Sub 2", "Sub 3"];
const EVEN_STYLES: Styles = { aggressive: 50, shooter: 50, wide: 50, physical: 50 };
const SKATER_BASE: SkaterRatings = { speed: 6, agility: 6, shot: 6, attack: 6, defense: 6, handling: 6, toughness: 6 };
const GOALIE_BASE: GoalieRatings = { speed: 6, agility: 6, iq: 6, rebound: 6, composure: 6, poke: 6 };
const STYLE_AXIS: { key: keyof Styles; lo: string; hi: string }[] = [
  { key: "aggressive", lo: "Defense", hi: "Attack" },
  { key: "shooter", lo: "Create", hi: "Shoot" },
  { key: "wide", lo: "Direct", hi: "Wide" },
  { key: "physical", lo: "Smooth", hi: "Physical" },
];

const SHORT_PERK: Record<Perk, string> = {
  bank: "Bank",
  sticky: "Sticky",
  afterburner: "Burner",
  glue: "Glue",
  heavy: "Heavy",
  pickup: "Pickup",
  touch: "Touch",
};

export function RosterPicker({ onPlay, onMenu }: { onPlay: (match: Matchup) => void; onMenu: () => void }) {
  const [pool] = useState(() => makePool());
  const [extra, setExtra] = useState<PlayerCard[]>([]);
  const [habits] = useState(() => ({ home: rollHabits(Math.floor(Math.random() * 1e9)), away: rollHabits(Math.floor(Math.random() * 1e9)) }));
  const [home, setHome] = useState<(PlayerCard | null)[]>(() => Array(7).fill(null));
  const [away, setAway] = useState<(PlayerCard | null)[]>(() => Array(7).fill(null));
  const [picked, setPicked] = useState<Slot | null>({ side: "home", index: 0 });
  const [customOpen, setCustomOpen] = useState(false);
  const [dragging, setDragging] = useState<Slot | null>(null);
  const [over, setOver] = useState<Slot | null>(null);
  const [lineupNote, setLineupNote] = useState("");
  const dragFrom = useRef<Slot | null>(null);
  const overRef = useRef<Slot | null>(null);
  const armed = useRef<{ slot: Slot; x: number; y: number } | null>(null);
  const skipClick = useRef(false);
  const homeRef = useRef(home);
  const awayRef = useRef(away);
  const customCount = useRef(1);
  homeRef.current = home;
  awayRef.current = away;

  const skaters = [...pool.skaters, ...extra.filter((card): card is SkaterCard => card.kind === "skater")];
  const goalies = [...pool.goalies, ...extra.filter((card) => card.kind === "goalie")];
  const used = new Set([...home, ...away].flatMap((card) => (card ? [card.id] : [])));
  const ready = home.every(Boolean) && away.every(Boolean);

  function sideOf(id: string): SideName | null {
    if (home.some((c) => c?.id === id)) return "home";
    if (away.some((c) => c?.id === id)) return "away";
    return null;
  }

  function assign(card: PlayerCard) {
    if (!picked) return;
    const goalieSlot = picked.index === 3;
    if (goalieSlot !== (card.kind === "goalie")) return;
    const write = picked.side === "home" ? setHome : setAway;
    const other = picked.side === "home" ? setAway : setHome;
    write((rows) => rows.map((c, i) => (i === picked.index ? card : c?.id === card.id ? null : c)));
    other((rows) => rows.map((c) => (c?.id === card.id ? null : c)));
    setPicked((cur) => {
      if (!cur || cur.side !== picked.side) return cur;
      const next = rowsAfter(cur.index);
      return { side: cur.side, index: next };
    });
  }

  function clearSlot(slot: Slot) {
    const write = slot.side === "home" ? setHome : setAway;
    write((rows) => rows.map((c, i) => (i === slot.index ? null : c)));
    setPicked(slot);
  }

  function rowsOf(side: SideName) {
    return side === "home" ? homeRef.current : awayRef.current;
  }

  function dropLegal(from: Slot, to: Slot) {
    const leaving = rowsOf(from.side)[from.index];
    const sitting = rowsOf(to.side)[to.index];
    const fits = (player: PlayerCard | null | undefined, index: number) => !player || (index === 3) === (player.kind === "goalie");
    return !!leaving && fits(leaving, to.index) && fits(sitting, from.index);
  }

  function beginDrag(slot: Slot, event: React.PointerEvent<HTMLButtonElement>) {
    if (!rowsOf(slot.side)[slot.index]) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragFrom.current = slot;
    overRef.current = slot;
    setDragging(slot);
    setOver(slot);
    setLineupNote("");
  }

  function armDrag(slot: Slot, event: React.PointerEvent<HTMLButtonElement>) {
    if (!rowsOf(slot.side)[slot.index] || event.pointerType !== "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    armed.current = { slot, x: event.clientX, y: event.clientY };
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const arm = armed.current;
    if (arm && !dragFrom.current) {
      if (Math.hypot(event.clientX - arm.x, event.clientY - arm.y) < 6) return;
      dragFrom.current = arm.slot;
      overRef.current = arm.slot;
      setDragging(arm.slot);
      setOver(arm.slot);
      setLineupNote("");
      armed.current = null;
    }
    if (!dragFrom.current) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const next = parseSlot(hit?.closest("[data-slot]")?.getAttribute("data-slot") ?? null);
    if (!next) return;
    overRef.current = next;
    setOver(next);
  }

  function endDrag(fromName: boolean) {
    const from = dragFrom.current;
    const to = overRef.current;
    if (fromName && from) skipClick.current = true;
    dragFrom.current = null;
    overRef.current = null;
    armed.current = null;
    setDragging(null);
    setOver(null);
    if (!from || !to || (from.side === to.side && from.index === to.index)) return;
    if (!dropLegal(from, to)) {
      setLineupNote("Goalies stay in the net.");
      return;
    }
    const nextHome = [...homeRef.current];
    const nextAway = [...awayRef.current];
    const bag = { home: nextHome, away: nextAway };
    const leaving = bag[from.side][from.index];
    bag[from.side][from.index] = bag[to.side][to.index];
    bag[to.side][to.index] = leaving;
    setHome(nextHome);
    setAway(nextAway);
    setPicked(to);
    setLineupNote("");
  }

  function cancelDrag() {
    dragFrom.current = null;
    overRef.current = null;
    armed.current = null;
    setDragging(null);
    setOver(null);
  }

  function applyDeal(mode: DealBias) {
    const dealt = dealRandom(skaters, goalies, mode);
    setHome([...dealt.home.ice, ...dealt.home.bench]);
    setAway([...dealt.away.ice, ...dealt.away.bench]);
    setLineupNote(mode === "weak" ? "You have the weak side." : mode === "stars" ? "You have the stars." : mode === "duel" ? "Both sides are stacked." : "");
  }

  function addCustom(card: PlayerCard) {
    const stamped = { ...card, id: `custom-${customCount.current++}` } as PlayerCard;
    setExtra((rows) => [stamped, ...rows]);
    setCustomOpen(false);
    if (picked && (picked.index === 3) === (stamped.kind === "goalie")) {
      assign(stamped);
      setLineupNote("");
    } else setLineupNote(stamped.kind === "goalie" ? "Keeper added. Put them in the goalie slot." : "Player added. Put them in a skater slot.");
  }

  function play() {
    if (!ready) return;
    onPlay({
      home: { ice: home.slice(0, 4) as PlayerCard[], bench: home.slice(4) as PlayerCard[] },
      away: { ice: away.slice(0, 4) as PlayerCard[], bench: away.slice(4) as PlayerCard[] },
      homeHabits: habits.home,
      awayHabits: habits.away,
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:px-4">
        <header className="glass flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <div>
            <p className="display text-sm tracking-[0.16em] text-[#8fd4ff]">Free play</p>
            <h1 className="display text-4xl leading-none text-white sm:text-5xl">Space Hockey</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => applyDeal("random")} className="hud-tab hud-tab-sm">
              Random
            </button>
            <button type="button" onClick={() => applyDeal("duel")} className="hud-tab hud-tab-sm">
              Stars vs stars
            </button>
            <button type="button" onClick={() => applyDeal("stars")} className="hud-tab hud-tab-sm">
              Stars vs weak
            </button>
            <button type="button" onClick={() => applyDeal("weak")} className="hud-tab hud-tab-sm">
              Weak vs stars
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={play}
              className="rounded-full bg-[#ffe36b] px-4 py-2 text-sm font-bold text-[#1a1404] disabled:opacity-40"
            >
              Drop the puck
            </button>
            <button type="button" onClick={onMenu} className="text-sm font-semibold text-[#8fd4ff] underline-offset-4 hover:underline">
              Menu
            </button>
          </div>
        </header>
        {lineupNote ? <p className="shrink-0 text-sm text-[#ffb4c4]">{lineupNote}</p> : null}

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)_minmax(0,1fr)] lg:overflow-hidden">
          <SidePanel
            title="Home"
            tint="#7ee7ff"
            rows={home}
            habits={habits.home}
            picked={picked}
            dragging={dragging}
            over={over}
            onPick={(index) => setPicked({ side: "home", index })}
            onClear={(index) => clearSlot({ side: "home", index })}
            onGrip={(index, event) => beginDrag({ side: "home", index }, event)}
            onArm={(index, event) => armDrag({ side: "home", index }, event)}
            onMove={moveDrag}
            onDrop={() => endDrag(true)}
            onGripUp={() => endDrag(false)}
            onCancel={cancelDrag}
            skipClick={skipClick}
            dropOk={(index) => !!dragging && dropLegal(dragging, { side: "home", index })}
          />
          <section className="order-last min-h-0 glass rounded-2xl p-3 lg:order-none lg:overflow-y-auto">
            <h2 className="sticky top-0 z-10 -mx-3 mb-2 bg-[#121a2b] px-3 pb-2 text-sm font-bold tracking-wide text-[#d5e8ff]">
              Pool · {skaters.length + goalies.length}
            </h2>
            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className="glass-row mb-2 w-full rounded-xl px-3 py-3 text-left"
            >
              <span className="display text-2xl text-[#ffe36b]">Custom player</span>
              <p className="text-sm text-[#b7c9da]">Choose ratings, perks, and tendencies.</p>
            </button>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {[...extra, ...[...goalies, ...skaters].filter((card) => !extra.some((made) => made.id === card.id)).sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name))].map((card) => (
                <PoolCard
                  key={card.id}
                  card={card}
                  used={used.has(card.id)}
                  color={sideOf(card.id) ? teamColor(sideOf(card.id)!) : undefined}
                  dim={(picked?.index === 3) !== (card.kind === "goalie")}
                  onClick={() => assign(card)}
                />
              ))}
            </div>
          </section>
          <SidePanel
            title="Away"
            tint="#ff8fb8"
            rows={away}
            habits={habits.away}
            picked={picked}
            dragging={dragging}
            over={over}
            onPick={(index) => setPicked({ side: "away", index })}
            onClear={(index) => clearSlot({ side: "away", index })}
            onGrip={(index, event) => beginDrag({ side: "away", index }, event)}
            onArm={(index, event) => armDrag({ side: "away", index }, event)}
            onMove={moveDrag}
            onDrop={() => endDrag(true)}
            onGripUp={() => endDrag(false)}
            onCancel={cancelDrag}
            skipClick={skipClick}
            dropOk={(index) => !!dragging && dropLegal(dragging, { side: "away", index })}
          />
        </div>
      </div>
      {customOpen ? (
        <CustomSheet onClose={() => setCustomOpen(false)} onAdd={addCustom} />
      ) : null}
    </div>
  );
}

function rowsAfter(index: number) {
  return index >= 6 ? 6 : index + 1;
}

function SidePanel({
  title,
  tint,
  rows,
  habits,
  picked,
  dragging,
  over,
  onPick,
  onClear,
  onGrip,
  onArm,
  onMove,
  onDrop,
  onGripUp,
  onCancel,
  skipClick,
  dropOk,
}: {
  title: string;
  tint: string;
  rows: (PlayerCard | null)[];
  habits: TeamHabits;
  picked: Slot | null;
  dragging: Slot | null;
  over: Slot | null;
  onPick: (index: number) => void;
  onClear: (index: number) => void;
  onGrip: (index: number, event: React.PointerEvent<HTMLButtonElement>) => void;
  onArm: (index: number, event: React.PointerEvent<HTMLButtonElement>) => void;
  onMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onDrop: () => void;
  onGripUp: () => void;
  onCancel: () => void;
  skipClick: React.MutableRefObject<boolean>;
  dropOk: (index: number) => boolean;
}) {
  const cards = rows.filter((c): c is PlayerCard => !!c);
  const shape = useMemo(() => teamShape(rows), [rows]);
  const grades = useMemo(() => teamGrades(rows), [rows]);
  const sideName = title === "Home" ? "home" : "away";
  return (
    <section className="flex min-h-0 flex-col glass rounded-2xl p-3 lg:overflow-y-auto">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-black" style={{ color: tint }}>
          {title}
        </h2>
        <p className="text-sm text-[#d5e8ff]">{styleName(shape, habits)}</p>
      </div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[#8fb0c8]">TEAM</p>
          <p className="text-2xl font-black leading-none text-[#ffe36b]">{cards.length ? grades.overall : "–"}</p>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2">
          <Meter label="Off" value={grades.offense} />
          <Meter label="Def" value={grades.defense} />
          <Meter label="IQ" value={grades.iq} />
        </div>
      </div>
      <p className="mb-2 text-xs text-[#9eb6cc]">Drag a name to swap spots or send them to the bench. {habitLine(habits)}</p>
      <div className="mb-2 grid grid-cols-4 gap-2">
        <Meter label="Push" value={shape.push} />
        <Meter label="Share" value={shape.share} />
        <Meter label="Width" value={shape.width} />
        <Meter label="Heat" value={shape.heat} />
      </div>
      <div className="grid gap-1.5">
        {rows.map((card, index) => {
          const active = picked?.side === sideName && picked.index === index;
          const hot = !!over && over.side === sideName && over.index === index && !!dragging && !(dragging.side === sideName && dragging.index === index);
          const blocked = hot && !dropOk(index);
          return (
            <div
              key={SLOT_NAMES[index]}
              data-slot={`${sideName}:${index}`}
              className={`flex gap-1.5 rounded-xl border ${blocked ? "border-[#ffb4c4] bg-[#2a1520]" : hot || active ? "border-[#ffe36b] bg-[#1a2233]" : "border-white/10 bg-[#10192a]"} ${dragging?.side === sideName && dragging.index === index ? "opacity-45" : ""}`}
            >
              <button
                type="button"
                aria-label={card ? `Drag ${card.name}` : SLOT_NAMES[index]}
                disabled={!card}
                onPointerDown={(event) => onGrip(index, event)}
                onPointerMove={onMove}
                onPointerUp={onGripUp}
                onPointerCancel={onCancel}
                className="flex w-7 shrink-0 touch-none items-center justify-center text-[#8fb0c8] disabled:text-[#3a4c60]"
              >
                <GripVertical size={16} />
              </button>
              <button
                type="button"
                onPointerDown={(event) => onArm(index, event)}
                onPointerMove={onMove}
                onPointerUp={onDrop}
                onPointerCancel={onCancel}
                onClick={() => {
                  if (skipClick.current) {
                    skipClick.current = false;
                    return;
                  }
                  onPick(index);
                }}
                className="min-w-0 flex-1 py-1.5 pr-2 text-left"
              >
                <p className="text-[11px] font-semibold tracking-wide text-[#8fb0c8]">
                  {SLOT_NAMES[index]}
                  {card && card.kind === "skater" ? ` · ${fitHint(card).replace("Fits ", "")}` : ""}
                </p>
                {card ? <CardLine card={card} color={teamColor(sideName)} /> : <p className="text-sm text-[#6e8498]">Empty slot</p>}
              </button>
              {card ? (
                <button type="button" onClick={() => onClear(index)} className="rounded-xl px-2.5 text-xs text-[#ffb4c4]">
                  Out
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CardLine({ card, color }: { card: PlayerCard; color: string }) {
  const perks = card.perks.map((p) => SHORT_PERK[p]).join(", ");
  return (
    <div className="mt-0.5 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="w-7 text-base font-black leading-none text-[#ffe36b]">{card.overall}</span>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate font-semibold text-white">{card.name}</span>
        {perks ? <span className="ml-auto shrink-0 text-[10px] text-[#8fd4ff]">{perks}</span> : null}
      </div>
      <p className="text-[11px] leading-4 text-[#b7c9da]">{card.kind === "skater" ? skaterParts(card) : goalieParts(card)}</p>
    </div>
  );
}

function PoolCard({
  card,
  used,
  dim,
  color,
  onClick,
}: {
  card: PlayerCard;
  used: boolean;
  dim: boolean;
  color?: string;
  onClick: () => void;
}) {
  const ratings = card.kind === "skater" ? skaterParts(card) : goalieParts(card);
  return (
    <div className={`glass-row rounded-xl p-3 ${used ? "opacity-40" : ""} ${dim && !used ? "opacity-35" : ""}`}>
      <button type="button" onClick={onClick} disabled={dim && !used} className="flex w-full items-center gap-2 text-left disabled:cursor-default">
        <span className="text-2xl font-black text-[#ffe36b]">{card.overall}</span>
        <span className="h-4 w-4 rounded-full" style={{ background: color ?? `hsl(${card.hue} 88% 62%)` }} />
        <span className="display truncate text-xl text-white">{card.name}</span>
      </button>
      <p className="mt-1 text-sm leading-5 text-[#b7c9da]">{ratings}</p>
      <p className="mt-1 text-sm text-[#8fd4ff]">{card.kind === "goalie" ? "Goalie" : styleBits(card)}</p>
      <div className="mt-2">
        <PerkIcons perks={card.perks} size={22} />
      </div>
    </div>
  );
}

function skaterParts(card: SkaterCard) {
  const r = card.ratings;
  return `Spd ${r.speed}  Agi ${r.agility}  Sht ${r.shot}  Atk ${r.attack}  Def ${r.defense}  Hnd ${r.handling}  Tgh ${r.toughness}`;
}

function goalieParts(card: GoalieCard) {
  const r = card.ratings;
  return `Spd ${r.speed}  Agi ${r.agility}  IQ ${r.iq}  Reb ${r.rebound}  Comp ${r.composure}  Poke ${r.poke}`;
}

function styleBits(card: SkaterCard) {
  return `${end("Def", "Agg", card.styles.aggressive)} · ${end("Create", "Shoot", card.styles.shooter)} · ${end("Direct", "Wide", card.styles.wide)} · ${end("Smooth", "Physical", card.styles.physical)}`;
}

function end(lo: string, hi: string, n: number) {
  if (n < 40) return lo;
  if (n > 60) return hi;
  return "Mix";
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] text-[#9eb6cc]">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10">
        <div className="h-1.5 rounded-full bg-[#7ee7ff]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function parseSlot(raw: string | null): Slot | null {
  if (!raw) return null;
  const [side, indexRaw] = raw.split(":");
  const index = Number(indexRaw);
  if ((side !== "home" && side !== "away") || Number.isNaN(index)) return null;
  return { side, index };
}

function CustomSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (card: PlayerCard) => void }) {
  const [kind, setKind] = useState<"skater" | "goalie">("skater");
  const [name, setName] = useState("");
  const [skater, setSkater] = useState<SkaterRatings>({ ...SKATER_BASE });
  const [goalie, setGoalie] = useState<GoalieRatings>({ ...GOALIE_BASE });
  const [styles, setStyles] = useState<Styles>({ ...EVEN_STYLES });
  const [perks, setPerks] = useState<Perk[]>([]);
  const [hue, setHue] = useState(200);
  const overall = kind === "skater" ? overallSkater(skater) : overallGoalie(goalie);
  const stats =
    kind === "skater"
      ? ([["speed", "Speed"], ["agility", "Agility"], ["shot", "Shot"], ["attack", "Attack"], ["defense", "Defense"], ["handling", "Handling"], ["toughness", "Toughness"]] as const)
      : ([["speed", "Speed"], ["agility", "Agility"], ["iq", "IQ"], ["rebound", "Rebound"], ["composure", "Composure"], ["poke", "Poke"]] as const);

  function togglePerk(perk: Perk) {
    setPerks((current) => {
      if (current.includes(perk)) return current.filter((item) => item !== perk);
      if (current.length >= 3) return current;
      return [...current, perk];
    });
  }

  function add() {
    const label = name.trim() || "Custom";
    if (kind === "skater") {
      onAdd({ id: "pending", name: label, kind: "skater", ratings: skater, overall: overallSkater(skater), styles, perks, hue, visor: 0, antenna: 0 });
      return;
    }
    onAdd({ id: "pending", name: label, kind: "goalie", ratings: goalie, overall: overallGoalie(goalie), styles, perks, hue, visor: 0, antenna: 0 });
  }

  return (
    <div className="creator-sheet">
      <div className="mx-auto flex min-h-full max-w-xl items-start px-4 py-6">
        <div className="creator-panel w-full rounded-2xl border border-white/10 p-4 text-[#e7f3ff]">
          <p className="display text-sm tracking-[0.16em] text-[#8fd4ff]">Free play</p>
          <h2 className="display text-4xl leading-none text-white">Custom player</h2>
          <label className="mt-4 block text-sm text-[#b7c9da]">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Custom"
              className="mt-1 w-full rounded-xl border border-white/15 bg-[#0c1424] px-3 py-2 text-white"
            />
          </label>
          <div className="mt-3 flex gap-2">
            {(["skater", "goalie"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                className={`rounded-full px-3 py-1 text-sm font-bold ${kind === option ? "bg-[#ffe36b] text-[#1a1404]" : "border border-white/20 text-[#d5e8ff]"}`}
              >
                {option === "skater" ? "Skater" : "Goalie"}
              </button>
            ))}
            <span className="ml-auto font-black" style={{ color: overallColor(overall) }}>
              {overall} OVR
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {stats.map(([key, label]) => {
              const value = kind === "skater" ? skater[key as keyof SkaterRatings] : goalie[key as keyof GoalieRatings];
              return (
                <label key={key} className="text-sm text-[#b7c9da]">
                  <span className="flex justify-between">
                    {label}
                    <span style={{ color: ratingColor(value) }}>{value}</span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={11}
                    value={value}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (kind === "skater") setSkater((current) => ({ ...current, [key]: next }));
                      else setGoalie((current) => ({ ...current, [key]: next }));
                    }}
                    className="w-full"
                  />
                </label>
              );
            })}
          </div>
          <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-[#8fb0c8]">TENDENCIES</p>
          <div className="mt-2 grid gap-2">
            {STYLE_AXIS.map((axis) => (
              <label key={axis.key} className="text-sm text-[#b7c9da]">
                <span className="flex justify-between">
                  <span>
                    {axis.lo} / {axis.hi}
                  </span>
                  <span>{end(axis.lo, axis.hi, styles[axis.key])}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={styles[axis.key]}
                  onChange={(event) => setStyles((current) => ({ ...current, [axis.key]: Number(event.target.value) }))}
                  className="w-full"
                />
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-[#8fb0c8]">PERKS · {perks.length}/3</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PERKS.map((perk) => {
              const on = perks.includes(perk);
              return (
                <button
                  key={perk}
                  type="button"
                  onClick={() => togglePerk(perk)}
                  className={`rounded-full border px-3 py-1 text-sm font-bold ${on ? "border-[#ffe36b] bg-[#2a2412] text-[#ffe36b]" : "border-white/20 text-[#d5e8ff]"}`}
                >
                  {PERK_LABEL[perk]}
                </button>
              );
            })}
          </div>
          <label className="mt-4 block text-sm text-[#b7c9da]">
            <span className="flex justify-between">
              Color
              <PlayerMark name={name || "Custom"} hue={hue} size={22} overall={overall} />
            </span>
            <input type="range" min={0} max={359} value={hue} onChange={(event) => setHue(Number(event.target.value))} className="mt-1 w-full" />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[#d5e8ff]">
              Cancel
            </button>
            <button type="button" onClick={add} className="rounded-full bg-[#ffe36b] px-4 py-2 text-sm font-bold text-[#1a1404]">
              Add player
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
