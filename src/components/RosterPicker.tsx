import { useMemo, useState } from "react";
import {
  PERK_LABEL,
  dealRandom,
  fitHint,
  habitLine,
  makePool,
  rollHabits,
  styleName,
  teamColor,
  teamShape,
  type GoalieCard,
  type Matchup,
  type Perk,
  type PlayerCard,
  type SkaterCard,
  type TeamHabits,
} from "@/game/roster";

type SideName = "home" | "away";
type Slot = { side: SideName; index: number };

const SLOT_NAMES = ["Attack", "Mid", "Defense", "Goalie", "Sub", "Sub", "Sub"];

const SHORT_PERK: Record<Perk, string> = {
  bank: "Bank",
  sticky: "Sticky",
  afterburner: "Burner",
  clean: "Clean",
  glue: "Glue",
  heavy: "Heavy",
  pickup: "Pickup",
};

export function RosterPicker({ onPlay }: { onPlay: (match: Matchup) => void }) {
  const [{ skaters, goalies }] = useState(() => makePool(7));
  const [habits] = useState(() => ({ home: rollHabits(4), away: rollHabits(19) }));
  const [home, setHome] = useState<(PlayerCard | null)[]>(() => Array(7).fill(null));
  const [away, setAway] = useState<(PlayerCard | null)[]>(() => Array(7).fill(null));
  const [picked, setPicked] = useState<Slot | null>({ side: "home", index: 0 });

  const used = new Set([...home, ...away].flatMap((c) => (c ? [c.id] : [])));
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

  function applyDeal(stars: boolean) {
    const dealt = dealRandom(skaters, goalies, stars);
    setHome([...dealt.home.ice, ...dealt.home.bench]);
    setAway([...dealt.away.ice, ...dealt.away.bench]);
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
        <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-[#8fd4ff]">PLANETARY LEAGUE</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Space Hockey</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Ghost onClick={() => applyDeal(false)}>Random</Ghost>
            <Ghost onClick={() => applyDeal(true)}>Stars vs weak</Ghost>
            <button
              type="button"
              disabled={!ready}
              onClick={play}
              className="rounded-full bg-[#ffe36b] px-4 py-2 text-sm font-bold text-[#1a1404] disabled:opacity-40"
            >
              Drop the puck
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)_minmax(0,1fr)] lg:overflow-hidden">
          <SidePanel
            title="Home"
            tint="#7ee7ff"
            rows={home}
            habits={habits.home}
            picked={picked}
            onPick={(index) => setPicked({ side: "home", index })}
            onClear={(index) => clearSlot({ side: "home", index })}
          />
          <section className="order-last min-h-0 rounded-2xl border border-white/10 bg-[#0c1424] p-3 lg:order-none lg:overflow-y-auto">
            <h2 className="sticky top-0 z-10 -mx-3 mb-2 bg-[#0c1424] px-3 pb-2 text-sm font-bold tracking-wide text-[#d5e8ff]">
              Pool
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {goalies.map((card) => (
                <PoolCard
                  key={card.id}
                  card={card}
                  used={used.has(card.id)}
                  color={sideOf(card.id) ? teamColor(sideOf(card.id)!) : undefined}
                  dim={picked?.index !== 3}
                  onClick={() => assign(card)}
                />
              ))}
              {skaters.map((card) => (
                <PoolCard
                  key={card.id}
                  card={card}
                  used={used.has(card.id)}
                  color={sideOf(card.id) ? teamColor(sideOf(card.id)!) : undefined}
                  dim={picked?.index === 3}
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
            onPick={(index) => setPicked({ side: "away", index })}
            onClear={(index) => clearSlot({ side: "away", index })}
          />
        </div>
      </div>
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
  onPick,
  onClear,
}: {
  title: string;
  tint: string;
  rows: (PlayerCard | null)[];
  habits: TeamHabits;
  picked: Slot | null;
  onPick: (index: number) => void;
  onClear: (index: number) => void;
}) {
  const cards = rows.filter((c): c is PlayerCard => !!c);
  const shape = useMemo(() => teamShape(cards), [cards]);
  const sideName = title === "Home" ? "home" : "away";
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0c1424] p-3 lg:overflow-y-auto">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-black" style={{ color: tint }}>
          {title}
        </h2>
        <p className="text-sm text-[#d5e8ff]">{styleName(shape, habits)}</p>
      </div>
      <div className="mb-2 grid grid-cols-4 gap-2">
        <Meter label="Push" value={shape.push} />
        <Meter label="Share" value={shape.share} />
        <Meter label="Width" value={shape.width} />
        <Meter label="Heat" value={shape.heat} />
      </div>
      <p className="mb-2 text-xs text-[#9eb6cc]">{habitLine(habits)}</p>
      <div className="grid gap-1.5">
        {rows.map((card, index) => {
          const active = picked?.side === sideName && picked.index === index;
          return (
            <div key={SLOT_NAMES[index] + index} className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onPick(index)}
                className={`min-w-0 flex-1 rounded-xl border px-2.5 py-1.5 text-left ${active ? "border-[#ffe36b] bg-[#1a2233]" : "border-white/10 bg-[#10192a]"}`}
              >
                <p className="text-[11px] font-semibold tracking-wide text-[#8fb0c8]">
                  {SLOT_NAMES[index]}
                  {card && card.kind === "skater" ? ` · ${fitHint(card).replace("Fits ", "")}` : ""}
                </p>
                {card ? <CardLine card={card} color={teamColor(sideName)} /> : <p className="text-sm text-[#6e8498]">Empty slot</p>}
              </button>
              {card ? (
                <button type="button" onClick={() => onClear(index)} className="rounded-xl border border-white/10 px-2.5 text-xs text-[#ffb4c4]">
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
      <p className="truncate text-[11px] text-[#b7c9da]">{card.kind === "skater" ? skaterParts(card) : goalieParts(card)}</p>
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
    <button
      type="button"
      onClick={onClick}
      disabled={dim && !used}
      className={`rounded-xl border border-white/10 bg-[#10192a] p-3 text-left disabled:opacity-35 ${used ? "opacity-40" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl font-black text-[#ffe36b]">{card.overall}</span>
        <span className="h-4 w-4 rounded-full" style={{ background: color ?? `hsl(${card.hue} 88% 62%)` }} />
        <span className="font-semibold text-white">{card.name}</span>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-[#b7c9da]">{ratings}</p>
      <p className="mt-1 text-[11px] leading-4 text-[#8fd4ff]">
        {card.kind === "goalie" ? "Goalie" : styleBits(card)}
        {card.perks.length ? ` · ${card.perks.map((p) => PERK_LABEL[p]).join(", ")}` : ""}
      </p>
    </button>
  );
}

function skaterParts(card: SkaterCard) {
  const r = card.ratings;
  return `Spd ${r.speed}  Agi ${r.agility}  Sht ${r.shot}  Atk ${r.attack}  Def ${r.defense}  Bl ${r.blastArea}/${r.blastPower}`;
}

function goalieParts(card: GoalieCard) {
  const r = card.ratings;
  return `Spd ${r.speed}  Agi ${r.agility}  IQ ${r.iq}  Reb ${r.rebound}  Comp ${r.composure}`;
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

function Ghost({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[#e7f4ff]">
      {children}
    </button>
  );
}
