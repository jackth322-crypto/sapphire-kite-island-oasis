import { useState } from "react";
import { TeamLogo } from "@/components/TeamLogo";
import { hueGap, kitPaint, type Kit, type KitSlot } from "@/game/roster";

const HUES = [6, 24, 42, 68, 128, 158, 188, 208, 228, 258, 284, 328];
const INKS = [
  { label: "Black", light: 8 },
  { label: "Gray", light: 48 },
  { label: "White", light: 94 },
];
const MARKS = ["Shield", "Disc", "Hex", "Diamond", "Pennant", "Plate"];

export function MainMenu({
  hasSave,
  onFree,
  onContinue,
  onNew,
}: {
  hasSave: boolean;
  onFree: () => void;
  onContinue: () => void;
  onNew: () => void;
}) {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col justify-center gap-8 px-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.28em] text-[#8fd4ff]">PLANETARY LEAGUE</p>
        <h1 className="mt-2 text-5xl font-black tracking-tight text-white">Space Hockey</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#9eb6cc]">
          Free play is one match. A career drops you into a league that has already been going for years.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Door title="Free play" body="Pick any robots and drop the puck. Nothing is saved." onClick={onFree} />
        {hasSave ? (
          <Door title="Continue career" body="Pick up the season where you left it." onClick={onContinue} accent />
        ) : (
          <Door title="New career" body="Name a club, pick the colors, and take the open spot in the Dust League." onClick={onNew} accent />
        )}
      </div>
      {hasSave ? (
        <button type="button" onClick={onNew} className="self-start text-sm font-semibold text-[#8fb0c8] underline-offset-4 hover:underline">
          Start a new career instead
        </button>
      ) : null}
    </div>
  );
}

export function TeamCreator({ onBack, onCreate }: { onBack: () => void; onCreate: (team: { name: string; tag: string; kit: Kit }) => void }) {
  const [name, setName] = useState("Glass Orbits");
  const [tag, setTag] = useState("GLS");
  const [tones, setTones] = useState<2 | 3>(3);
  const [kit, setKit] = useState<Kit>({ primary: 188, secondary: 24, accent: 48 });
  function paint(next: Kit, count = tones) {
    if (count === 2) {
      const neutral = { ...(next.neutral ?? {}) };
      if (typeof neutral.secondary === "number") neutral.accent = neutral.secondary;
      else delete neutral.accent;
      setKit({ ...next, accent: next.secondary, neutral });
      return;
    }
    setKit(next);
  }
  function paintSlot(slot: KitSlot, value: number | { ink: number }) {
    const neutral = { ...(kit.neutral ?? {}) };
    if (typeof value === "number") {
      delete neutral[slot];
      paint({ ...kit, [slot]: value, neutral });
      return;
    }
    neutral[slot] = value.ink;
    paint({ ...kit, neutral });
  }
  const ready = name.trim().length >= 3 && tag.trim().length >= 2;
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col gap-4 overflow-y-auto px-6 py-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.22em] text-[#8fd4ff]">NEW CLUB</p>
        <h1 className="mt-2 text-3xl font-black text-white">Name the side</h1>
      </div>
      <label className="grid gap-1 text-sm text-[#b7c9da]">
        Team name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={22}
          className="rounded-xl border border-white/15 bg-[#10192a] px-3 py-2 text-base text-white outline-none"
        />
      </label>
      <label className="grid gap-1 text-sm text-[#b7c9da]">
        Short tag
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value.toUpperCase())}
          maxLength={4}
          className="w-28 rounded-xl border border-white/15 bg-[#10192a] px-3 py-2 text-base tracking-widest text-white outline-none"
        />
      </label>
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#0c1424] px-4 py-3">
        <TeamLogo kit={kit} size={64} />
        <div>
          <p className="text-lg font-black text-white">{name.trim() || "Home Side"}</p>
          <p className="text-xs tracking-[0.18em] text-[#8fd4ff]">{tag.trim() || "HOME"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {([2, 3] as const).map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => {
              setTones(count);
              if (count === 3 && hueGap(kit.secondary, kit.accent) < 8 && kit.neutral?.accent === undefined && kit.neutral?.secondary === undefined) paint({ ...kit, accent: (kit.secondary + 52) % 360 }, 3);
              else paint(kit, count);
            }}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${tones === count ? "bg-[#ffe36b] text-[#1a1404]" : "border border-white/15 text-[#d5e8ff]"}`}
          >
            {count === 2 ? "Two colors" : "Three colors"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setKit({ ...kit, mark: ((kit.mark ?? 0) + 1) % MARKS.length })}
          className="rounded-full border border-white/15 px-3 py-1 text-sm font-semibold text-[#d5e8ff]"
        >
          Crest: {MARKS[kit.mark ?? 0]}
        </button>
      </div>
      <HueRow label="Primary" hue={kit.primary} ink={kit.neutral?.primary} onHue={(primary) => paintSlot("primary", primary)} onInk={(ink) => paintSlot("primary", { ink })} />
      <HueRow label="Secondary" hue={kit.secondary} ink={kit.neutral?.secondary} onHue={(secondary) => paintSlot("secondary", secondary)} onInk={(ink) => paintSlot("secondary", { ink })} />
      {tones === 3 ? <HueRow label="Accent" hue={kit.accent} ink={kit.neutral?.accent} onHue={(accent) => paintSlot("accent", accent)} onInk={(ink) => paintSlot("accent", { ink })} /> : (
        <p className="text-xs text-[#8fb0c8]">The crest uses primary and secondary only. Add an accent if you want a third.</p>
      )}
      <div className="flex gap-2 pb-4">
        <button type="button" onClick={onBack} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-[#e7f4ff]">
          Back
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => onCreate({ name: name.trim(), tag: tag.trim(), kit })}
          className="rounded-full bg-[#ffe36b] px-4 py-2 text-sm font-bold text-[#1a1404] disabled:opacity-40"
        >
          Take the purse
        </button>
      </div>
    </div>
  );
}

function HueRow({
  label,
  hue,
  ink,
  onHue,
  onInk,
}: {
  label: string;
  hue: number;
  ink?: number;
  onHue: (hue: number) => void;
  onInk: (light: number) => void;
}) {
  const chip = typeof ink === "number" ? `hsl(220 ${ink < 12 || ink > 92 ? 0 : 7}% ${ink}%)` : `hsl(${hue} 78% 56%)`;
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-sm text-[#b7c9da]">
        <span className="h-4 w-4 rounded-full border border-white/30" style={{ background: chip }} />
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {HUES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => onHue(swatch)}
            className={`h-6 w-6 rounded-full ${ink === undefined && hue === swatch ? "ring-2 ring-white" : ""}`}
            style={{ background: `hsl(${swatch} 78% 56%)` }}
            aria-label={`${label} ${swatch}`}
          />
        ))}
        {INKS.map((swatch) => (
          <button
            key={swatch.label}
            type="button"
            onClick={() => onInk(swatch.light)}
            className={`rounded-full border border-white/25 px-2 py-0.5 text-[10px] font-bold ${ink === swatch.light ? "ring-2 ring-white" : ""}`}
            style={{ background: kitPaint({ primary: 0, secondary: 0, accent: 0, neutral: { primary: swatch.light } }, "primary"), color: swatch.light > 70 ? "#1a1404" : "#f4f7ff" }}
          >
            {swatch.label}
          </button>
        ))}
      </div>
      <input className="mt-2 w-full" type="range" min={0} max={359} value={hue} onChange={(e) => onHue(Number(e.target.value))} />
    </div>
  );
}

function Door({ title, body, onClick, accent }: { title: string; body: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left ${accent ? "border-[#ffe36b]/50 bg-[#1a1730]" : "border-white/10 bg-[#0c1424]"}`}
    >
      <p className="text-xl font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-5 text-[#9eb6cc]">{body}</p>
    </button>
  );
}
