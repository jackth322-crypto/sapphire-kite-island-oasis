import { useState } from "react";
import { goalieLean, leanOf, type GoalieRatings, type Perk, type Styles } from "@/game/roster";

const COPY: Record<Perk, { name: string; blurb: string }> = {
  bank: { name: "Bank", blurb: "Shots and passes keep their speed off the glass. A banked rim stays dangerous instead of dying on the boards." },
  sticky: { name: "Sticky", blurb: "Hold the puck longer before it spills. Extra carry time before a slap or a chip has to come off the stick." },
  afterburner: { name: "Afterburner", blurb: "Boost lasts longer and comes back faster. The burn is the long skate, not a short shove." },
  glue: { name: "Glue", blurb: "Checks have to get closer to knock the puck free. The reach on a steal shrinks while this player has it." },
  heavy: { name: "Heavy", blurb: "A heavier body on every check, and a second life. One blastoff does not end the night." },
  pickup: { name: "Pickup", blurb: "A wider reach on a loose puck. They scoop it before the other stick gets there." },
  touch: { name: "Touch", blurb: "A wider window for a second red-ring slap when your own shot comes back still flying." },
};

const TENDENCIES: { key: keyof Styles; lo: string; hi: string; mid: string; blurb: string }[] = [
  { key: "aggressive", lo: "Defense", hi: "Attack", mid: "Mix", blurb: "Attack leans push the puck up the rink. Defense leans sit deeper and protect the middle." },
  { key: "shooter", lo: "Create", hi: "Shoot", mid: "Mix", blurb: "Shooters look for their own chance. Creators look for the extra pass." },
  { key: "wide", lo: "Direct", hi: "Wide", mid: "Mix", blurb: "Wide players stretch the rink. Direct players play through the middle." },
  { key: "physical", lo: "Smooth", hi: "Physical", mid: "Mix", blurb: "Physical players hunt the check. Smooth players stay on the puck." },
];

export function PerkGlyph({ perk, size = 28 }: { perk: Perk; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (perk === "bank") {
    return (
      <svg {...common} aria-hidden>
        <path d="M6 24 V8 h8 a8 8 0 0 1 0 16 H10" />
        <path d="M18 16 h8 M22 12 l4 4 -4 4" />
      </svg>
    );
  }
  if (perk === "sticky") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="16" cy="16" r="6" />
        <path d="M16 4 v4 M16 24 v4 M4 16 h4 M24 16 h4" />
      </svg>
    );
  }
  if (perk === "afterburner") {
    return (
      <svg {...common} aria-hidden>
        <path d="M8 22 c4 -8 4 -8 8 -14 c4 6 4 6 8 14" />
        <path d="M12 22 c2 -4 2 -4 4 -8 c2 4 2 4 4 8" />
      </svg>
    );
  }
  if (perk === "glue") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="16" cy="16" r="5" />
        <path d="M8 8 l3 3 M24 8 l-3 3 M8 24 l3 -3 M24 24 l-3 -3" />
      </svg>
    );
  }
  if (perk === "heavy") {
    return (
      <svg {...common} aria-hidden>
        <path d="M8 14 h16 v8 a4 4 0 0 1 -4 4 h-8 a4 4 0 0 1 -4 -4 z" />
        <path d="M12 14 V10 h8 v4" />
      </svg>
    );
  }
  if (perk === "touch") {
    return (
      <svg {...common} aria-hidden>
        <path d="M7 20c6-2 8-8 6-12" />
        <path d="M16 8 h7 M19 5 l4 3 -4 3" />
        <circle cx="8" cy="21" r="2.2" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden>
      <circle cx="16" cy="16" r="4" />
      <path d="M16 6 a10 10 0 0 1 10 10" />
      <path d="M6 16 a10 10 0 0 1 10 -10" />
    </svg>
  );
}

export function LeanBadge({
  styles,
  compact = false,
  kind = "skater",
  ratings,
}: {
  styles: Styles;
  compact?: boolean;
  kind?: "skater" | "goalie";
  ratings?: GoalieRatings;
}) {
  const lean = kind === "goalie" && ratings ? goalieLean(ratings) : leanOf(styles);
  const label = lean === "attack" ? "Attack" : lean === "defense" ? "Defense" : lean === "acrobat" ? "Acrobat" : lean === "mechanical" ? "Mechanical" : "Mix";
  const tone =
    lean === "attack" || lean === "acrobat"
      ? "text-[#ffb15a] border-[#ffb15a]/50"
      : lean === "defense" || lean === "mechanical"
        ? "text-[#7ad7ff] border-[#7ad7ff]/50"
        : "text-[#d7c6ff] border-[#d7c6ff]/40";
  const title = lean === "acrobat" ? "Acrobat lean — speed and agility" : lean === "mechanical" ? "Mechanical lean — read, rebound, poke" : `${label} lean`;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border bg-black/35 font-black uppercase tracking-wide ${tone} ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"}`} title={title}>
      <LeanGlyph lean={lean} />
      {label}
    </span>
  );
}

function LeanGlyph({ lean }: { lean: "attack" | "defense" | "mix" | "acrobat" | "mechanical" }) {
  if (lean === "attack" || lean === "acrobat") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path d="M6 1 L10 7 H7.2 V11 H4.8 V7 H2 Z" fill="currentColor" />
      </svg>
    );
  }
  if (lean === "defense" || lean === "mechanical") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <path d="M6 1 L10.5 3 V6.5 C10.5 8.8 8.6 10.4 6 11 C3.4 10.4 1.5 8.8 1.5 6.5 V3 Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M2 3 H8 L6.2 1.4 M10 9 H4 L5.8 10.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PerkIcons({ perks, size = 22, compact = false }: { perks: Perk[]; size?: number; compact?: boolean }) {
  const [open, setOpen] = useState<Perk | null>(null);
  if (!perks.length) return <p className="text-xs text-[#8fb0c8]">No perk</p>;
  const info = open ? COPY[open] : null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {perks.map((perk) => {
        const shown = open === perk;
        return (
          <button
            key={perk}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(shown ? null : perk);
            }}
            className={`flex items-center gap-1 rounded-lg border ${compact ? "px-1.5 py-1" : "px-2 py-1"} ${shown ? "border-[#ffe36b] bg-[#2a2412] text-[#ffe36b]" : "border-white/15 bg-black/30 text-[#d7ecff]"}`}
            aria-expanded={shown}
          >
            <PerkGlyph perk={perk} size={size} />
            {compact ? null : <span className="display text-sm leading-none">{COPY[perk].name}</span>}
            <span className="grid h-4 w-4 place-items-center rounded-full border border-current text-[10px] font-black">i</span>
          </button>
        );
      })}
      {info ? (
        <p className="basis-full rounded-lg border border-[#ffe36b]/40 bg-[#141208] px-2.5 py-1.5 text-xs leading-4 text-[#e7f3ff]">
          <span className="display mr-1 text-sm text-[#ffe36b]">{info.name}.</span>
          {info.blurb}
        </p>
      ) : null}
    </div>
  );
}

export function TendencyRow({ styles }: { styles: Styles }) {
  const [open, setOpen] = useState<keyof Styles | null>(null);
  const info = TENDENCIES.find((row) => row.key === open);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TENDENCIES.map((row) => {
        const value = styles[row.key];
        const name = value < 40 ? row.lo : value > 60 ? row.hi : row.mid;
        const shown = open === row.key;
        return (
          <button
            key={row.key}
            type="button"
            onClick={() => setOpen(shown ? null : row.key)}
            className={`rounded-lg border px-2 py-1 text-xs font-bold ${shown ? "border-[#8fd4ff] bg-[#102033] text-white" : "border-white/15 bg-black/25 text-[#d5e8ff]"}`}
          >
            {name}
            <span className="ml-1 text-[10px] text-[#8fb0c8]">{value}</span>
          </button>
        );
      })}
      {info ? <p className="basis-full rounded-lg border border-[#8fd4ff]/30 bg-[#0c1828] px-2.5 py-1.5 text-xs leading-4 text-[#d5e8ff]">{info.blurb}</p> : null}
    </div>
  );
}
