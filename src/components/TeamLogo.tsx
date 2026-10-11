import { hueGap, kitPaint, slotInk, type Kit } from "@/game/roster";

const MARKS = ["shield", "disc", "hex", "diamond", "pennant", "plate"] as const;

export function TeamLogo({ kit, size = 40 }: { kit: Kit; size?: number }) {
  const mark = MARKS[((kit.mark ?? Math.abs(Math.round(kit.primary + kit.secondary))) % MARKS.length + MARKS.length) % MARKS.length];
  const primary = kitPaint(kit, "primary", 74, 46);
  const secondary = kitPaint(kit, "secondary", 68, 58);
  const accentInk = slotInk(kit, "accent");
  const secondaryInk = slotInk(kit, "secondary");
  const washed =
    accentInk !== null && secondaryInk !== null
      ? Math.abs(accentInk - secondaryInk) < 14
      : accentInk === null && secondaryInk === null && hueGap(kit.accent, kit.secondary) < 14;
  const accent = washed ? kitPaint(kit, "primary", 92, 78) : kitPaint(kit, "accent", 86, 64);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      {mark === "shield" ? <path d="M32 3 L56 14 V34 C56 48 32 61 32 61 C32 61 8 48 8 34 V14 Z" fill={primary} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" /> : null}
      {mark === "disc" ? <circle cx="32" cy="32" r="28" fill={primary} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" /> : null}
      {mark === "hex" ? <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill={primary} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" /> : null}
      {mark === "diamond" ? <polygon points="32,2 60,32 32,62 4,32" fill={primary} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" /> : null}
      {mark === "pennant" ? <path d="M10 6 H40 L32 32 L40 58 H10 Z" fill={primary} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" /> : null}
      {mark === "plate" ? <rect x="6" y="10" width="52" height="44" rx="10" fill={primary} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" /> : null}
      {mark === "shield" ? <path d="M32 14 L46 22 V34 C46 43 32 52 32 52 C32 52 18 43 18 34 V22 Z" fill={secondary} /> : null}
      {mark === "disc" ? <circle cx="32" cy="32" r="16" fill={secondary} /> : null}
      {mark === "hex" ? <polygon points="32,16 46,24 46,40 32,48 18,40 18,24" fill={secondary} /> : null}
      {mark === "diamond" ? <polygon points="32,16 48,32 32,48 16,32" fill={secondary} /> : null}
      {mark === "pennant" ? <path d="M16 16 H34 L28 32 L34 48 H16 Z" fill={secondary} /> : null}
      {mark === "plate" ? <rect x="14" y="18" width="36" height="28" rx="6" fill={secondary} /> : null}
      {mark === "pennant" ? <circle cx="24" cy="32" r="5" fill={accent} /> : <path d="M32 24 L38 34 L32 31 L26 34 Z" fill={accent} />}
      {mark === "disc" || mark === "plate" ? <rect x="22" y="30" width="20" height="4" rx="2" fill={accent} /> : null}
    </svg>
  );
}
