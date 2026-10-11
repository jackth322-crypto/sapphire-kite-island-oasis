import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RosterPicker } from "@/components/RosterPicker";
import { mountSpaceHockey } from "@/game/spaceHockey";
import type { Matchup } from "@/game/roster";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [match, setMatch] = useState<Matchup | null>(null);
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#070b18]">
      {match ? <Rink match={match} onRoster={() => setMatch(null)} /> : <RosterPicker onPlay={setMatch} />}
    </main>
  );
}

function Rink({ match, onRoster }: { match: Matchup; onRoster: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const game = mountSpaceHockey(canvas, match);
    return () => game.destroy();
  }, [match]);
  return (
    <>
      <canvas ref={ref} className="block h-full w-full touch-none" aria-label="Space Hockey rink" />
      <button
        type="button"
        onClick={onRoster}
        className="absolute left-4 top-3 z-10 rounded-full border border-white/20 bg-[#070b18]/80 px-3 py-1 text-xs font-semibold text-[#d5e8ff]"
      >
        Roster
      </button>
    </>
  );
}
