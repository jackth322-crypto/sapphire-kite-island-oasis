import { kitColor, kitPaint, type Kit } from "@/game/roster";

const STAT_BANDS = [
  { upTo: 3, color: "#8d95a3", glow: "rgba(0, 0, 0, 0.75)" },
  { upTo: 5, color: "#4eb4e0", glow: "rgba(78, 180, 224, 0.5)" },
  { upTo: 7, color: "#6ed99a", glow: "rgba(110, 217, 154, 0.5)" },
  { upTo: 9, color: "#ffe36b", glow: "rgba(255, 227, 107, 0.55)" },
  { upTo: 11, color: "#c9a6ff", glow: "rgba(176, 120, 255, 0.65)" },
];

function bandFor(value: number) {
  const v = Math.max(1, Math.min(11, Math.round(value)));
  return STAT_BANDS.find((band) => v <= band.upTo) ?? STAT_BANDS[STAT_BANDS.length - 1];
}

export function ratingColor(value: number) {
  return bandFor(value).color;
}

export function overallColor(overall: number) {
  return ratingColor(1 + Math.max(0, Math.min(1, (overall - 40) / 56)) * 10);
}

export function skillGlow(overall: number) {
  const t = Math.max(0, Math.min(1, (overall - 40) / 56));
  const band = bandFor(1 + t * 10);
  const blur = t < 0.12 ? 14 : 12 + t * 12;
  return `0 0 ${blur}px ${band.glow}`;
}

export function PlayerMark({
  name,
  kit,
  hue = 210,
  size = 26,
  overall,
}: {
  name: string;
  kit?: Kit | null;
  hue?: number;
  size?: number;
  overall?: number;
}) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  const fill = kit ? kitPaint(kit, "primary", 62, 42) : kitColor(hue, 42, 24);
  const ink = kit ? kitPaint(kit, "accent", 78, 64) : kitColor(hue, 70, 74);
  const ring = kit ? kitPaint(kit, "secondary", 64, 52) : "rgba(255,255,255,0.28)";
  const glow = typeof overall === "number" ? skillGlow(overall) : "";
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-black leading-none"
      style={{
        width: size,
        height: size,
        background: fill,
        color: ink,
        boxShadow: glow ? `${glow}, inset 0 0 0 2px ${ring}` : `inset 0 0 0 2px ${ring}`,
        fontSize: Math.max(11, Math.round(size * 0.46)),
      }}
    >
      {letter}
    </span>
  );
}
