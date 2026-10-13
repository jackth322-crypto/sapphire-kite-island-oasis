import { useRef, useState, type PointerEvent } from "react";
import { TeamLogo } from "@/components/TeamLogo";
import type { CareerSlot, SlotId } from "@/game/league";
import { hueGap, kitPaint, type Kit, type KitSlot } from "@/game/roster";

const INKS = [
  { label: "Black", light: 8 },
  { label: "Gray", light: 48 },
  { label: "White", light: 94 },
];
const MARKS = ["Shield", "Disc", "Hex", "Diamond", "Pennant", "Plate"];
const WHEEL = "conic-gradient(from 0deg, #ff2d2d, #ffb000, #ffe14a, #7dff5a, #2ee6c7, #2aa7ff, #4d5bff, #b14dff, #ff3d8a, #ff2d2d)";

export function MainMenu({
  slots,
  onFree,
  onContinue,
  onNew,
  onDelete,
}: {
  slots: CareerSlot[];
  onFree: () => void;
  onContinue: (id: SlotId) => void;
  onNew: (id: SlotId) => void;
  onDelete: (id: SlotId) => void;
}) {
  const [arm, setArm] = useState<SlotId | null>(null);
  return (
    <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col justify-center gap-6 overflow-y-auto px-6 py-6">
      <div>
        <p className="display text-sm tracking-[0.28em] text-[#8fd4ff]">Planetary league</p>
        <h1 className="display mt-2 text-6xl leading-none text-white sm:text-7xl">Space Hockey</h1>
        <p className="mt-3 max-w-xl text-lg leading-7 text-[#d5e8ff]">
          Free play is one match. A career keeps up to three clubs.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Door title="Free play" body="Pick any robots and drop the puck. Nothing is saved." onClick={onFree} />
        <div className="grid gap-2">
          {slots.map((slot) => (
            <div key={slot.id} className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
              <div className="min-w-0">
                <p className="display truncate text-2xl leading-none text-white">{slot.occupied ? slot.name : `Slot ${slot.id}`}</p>
                <p className="mt-1 truncate text-sm text-[#c5d7e8]">
                  {slot.occupied ? `${slot.league} · Year ${slot.season} · ${slot.phase}` : "Empty"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {slot.occupied ? (
                  <>
                    <button type="button" onClick={() => onContinue(slot.id)} className="rounded-full bg-[#ffe36b] px-3 py-1.5 text-sm font-bold text-[#1a1404]">
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (arm !== slot.id) {
                          setArm(slot.id);
                          return;
                        }
                        setArm(null);
                        onDelete(slot.id);
                      }}
                      className="rounded-full border border-white/20 px-3 py-1.5 text-sm font-semibold text-[#d5e8ff]"
                    >
                      {arm === slot.id ? "Confirm" : "Delete"}
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => onNew(slot.id)} className="rounded-full border border-white/20 px-3 py-1.5 text-sm font-semibold text-[#e7f4ff]">
                    New career
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
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
    <div className="creator-sheet px-4 py-6">
      <div className="creator-panel mx-auto flex w-full max-w-xl flex-col gap-4 rounded-3xl border border-white/15 p-5">
        <div>
          <p className="display text-sm tracking-[0.22em] text-[#8fd4ff]">New club</p>
          <h1 className="display mt-2 text-5xl text-white">Name the side</h1>
        </div>
        <label className="grid gap-1 text-base font-semibold text-white">
          Team name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={22}
            className="rounded-xl border border-[#31415f] px-3 py-2 text-lg text-white outline-none"
            style={{ background: "#1c2740" }}
          />
        </label>
        <label className="grid gap-1 text-base font-semibold text-white">
          Short tag
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value.toUpperCase())}
            maxLength={4}
            className="w-28 rounded-xl border border-[#31415f] px-3 py-2 text-lg tracking-widest text-white outline-none"
            style={{ background: "#1c2740" }}
          />
        </label>
        <div className="flex items-center gap-4 rounded-2xl border border-white/15 px-4 py-3" style={{ background: "#1c2740" }}>
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
      <p className="text-sm text-[#9eb6cc]">Drag a wheel. Black, gray, and white sit under each one.</p>
      <div className={`grid gap-3 ${tones === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        <HueWheel label="Primary" hue={kit.primary} ink={kit.neutral?.primary} onHue={(primary) => paintSlot("primary", primary)} onInk={(ink) => paintSlot("primary", { ink })} />
        <HueWheel label="Secondary" hue={kit.secondary} ink={kit.neutral?.secondary} onHue={(secondary) => paintSlot("secondary", secondary)} onInk={(ink) => paintSlot("secondary", { ink })} />
        {tones === 3 ? <HueWheel label="Accent" hue={kit.accent} ink={kit.neutral?.accent} onHue={(accent) => paintSlot("accent", accent)} onInk={(ink) => paintSlot("accent", { ink })} /> : null}
      </div>
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
    </div>
  );
}

function HueWheel({
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
  const drag = useRef(false);
  const chip = typeof ink === "number" ? `hsl(220 ${ink < 12 || ink > 92 ? 0 : 7}% ${ink}%)` : `hsl(${hue} 78% 52%)`;
  const rad = ((hue % 360) * Math.PI) / 180;
  function pick(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    if (Math.hypot(x, y) < rect.width * 0.28) return;
    const angle = (Math.atan2(x, -y) * 180) / Math.PI;
    onHue(Math.round((angle + 360) % 360));
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative h-28 w-28 touch-none rounded-full"
        style={{ background: WHEEL }}
        role="slider"
        aria-label={`${label} color`}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(hue)}
        onPointerDown={(event) => {
          drag.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (drag.current) pick(event);
        }}
        onPointerUp={() => {
          drag.current = false;
        }}
        onPointerCancel={() => {
          drag.current = false;
        }}
      >
        <span className="absolute inset-[22%] rounded-full border-[3px] border-[#121820]" style={{ background: chip }} />
        <span
          className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-[#121820] bg-white"
          style={{
            left: `calc(50% + ${Math.sin(rad) * 42}px - 8px)`,
            top: `calc(50% - ${Math.cos(rad) * 42}px - 8px)`,
            opacity: ink === undefined ? 1 : 0.35,
          }}
        />
      </div>
      <p className="text-sm font-bold text-white">{label}</p>
      <div className="flex gap-1">
        {INKS.map((swatch) => (
          <button
            key={swatch.label}
            type="button"
            onClick={() => onInk(swatch.light)}
            className="rounded-full px-2 py-1 text-[11px] font-bold"
            style={{
              background: kitPaint({ primary: 0, secondary: 0, accent: 0, neutral: { primary: swatch.light } }, "primary"),
              color: swatch.light > 70 ? "#1a1404" : "#f4f7ff",
              boxShadow: ink === swatch.light ? "0 0 0 2px #ffe36b" : "0 0 0 1px rgba(255,255,255,0.2)",
            }}
          >
            {swatch.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Door({ title, body, onClick, accent }: { title: string; body: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass rounded-2xl p-6 text-left ${accent ? "ring-2 ring-[#ffe36b]" : ""}`}
    >
      <p className="display text-3xl text-white">{title}</p>
      <p className="mt-2 text-lg leading-6 text-[#c5d7e8]">{body}</p>
    </button>
  );
}
