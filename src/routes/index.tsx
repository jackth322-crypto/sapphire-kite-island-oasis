import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MainMenu, TeamCreator } from "@/components/FrontDoor";
import { LeagueOffice } from "@/components/LeagueOffice";
import { FinalWhistle } from "@/components/MatchViews";
import { RosterPicker } from "@/components/RosterPicker";
import {
  clearCareer,
  createCareer,
  correctPromotion,
  loadCareer,
  playCurrent,
  saveCareer,
  type MatchSheet,
  type Save,
} from "@/game/league";
import { mountSpaceHockey } from "@/game/spaceHockey";
import type { Matchup } from "@/game/roster";

export const Route = createFileRoute("/")({ component: Home });

type View = "menu" | "free" | "create" | "league" | "rink";

function Home() {
  const [save, setSave] = useState<Save | null>(() => loadCareer());
  const [view, setView] = useState<View>("menu");
  const [match, setMatch] = useState<Matchup | null>(null);
  const [leagueMatch, setLeagueMatch] = useState(false);
  const [finished, setFinished] = useState(false);
  const saveRef = useRef(save);
  saveRef.current = save;
  const applied = useRef(false);

  useEffect(() => {
    if (!save) return;
    const fixed = correctPromotion(save);
    if (fixed !== save) commit(fixed);
  }, [save]);

  function commit(next: Save) {
    setSave(next);
    saveCareer(next);
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#070b18]">
      {view === "menu" ? (
        <MainMenu
          hasSave={!!save}
          onFree={() => {
            setMatch(null);
            setLeagueMatch(false);
            setView("free");
          }}
          onNew={() => setView("create")}
          onContinue={() => save && setView("league")}
        />
      ) : null}
      {view === "create" ? (
        <TeamCreator
          onBack={() => setView("menu")}
          onCreate={(team) => {
            const career = createCareer(team);
            commit(career);
            setView("league");
          }}
        />
      ) : null}
      {view === "free" && !match ? (
        <>
          <button
            type="button"
            onClick={() => setView("menu")}
            className="absolute bottom-4 left-4 z-10 rounded-full border border-white/20 bg-[#070b18]/80 px-3 py-1 text-xs font-semibold text-[#d5e8ff]"
          >
            Menu
          </button>
          <RosterPicker onPlay={(next) => setMatch(next)} />
        </>
      ) : null}
      {view === "free" && match ? (
        <Rink
          match={match}
          exitLabel="Roster"
          onExit={() => setMatch(null)}
        />
      ) : null}
      {view === "league" && save ? (
        <LeagueOffice
          save={save}
          onChange={commit}
          onMenu={() => setView("menu")}
          onPlay={(next) => {
            applied.current = false;
            setFinished(false);
            setLeagueMatch(true);
            setMatch(next);
            setView("rink");
          }}
        />
      ) : null}
      {view === "rink" && match && leagueMatch ? (
        <Rink
          match={match}
          exitLabel={finished ? "Back to league" : "Abandon match"}
          onExit={() => setView("league")}
          onFinish={(userGoals, oppGoals, sheet) => {
            if (applied.current || !saveRef.current) return;
            applied.current = true;
            commit(playCurrent(saveRef.current, userGoals, oppGoals, sheet));
            setFinished(true);
          }}
        />
      ) : null}
      {view === "menu" && save ? (
        <button
          type="button"
          onClick={() => {
            clearCareer();
            setSave(null);
          }}
          className="absolute bottom-4 left-4 text-xs font-semibold text-[#6e8498]"
        >
          Abandon saved career
        </button>
      ) : null}
    </main>
  );
}

function Rink({
  match,
  onExit,
  exitLabel,
  onFinish,
}: {
  match: Matchup;
  onExit: () => void;
  exitLabel: string;
  onFinish?: (homeGoals: number, awayGoals: number, sheet?: MatchSheet) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const [result, setResult] = useState<{ home: number; away: number; sheet?: MatchSheet } | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const game = mountSpaceHockey(canvas, match, (homeGoals, awayGoals, sheet) => {
      setResult({ home: homeGoals, away: awayGoals, sheet });
      finishRef.current?.(homeGoals, awayGoals, sheet);
    });
    return () => game.destroy();
  }, [match]);
  return (
    <>
      <canvas ref={ref} className="block h-full w-full touch-none" aria-label="Space Hockey rink" />
      <button
        type="button"
        onClick={onExit}
        className="absolute left-4 top-3 z-30 rounded-full border border-white/20 bg-[#070b18]/80 px-3 py-1 text-xs font-semibold text-[#d5e8ff]"
      >
        {exitLabel}
      </button>
      {result ? (
        <FinalWhistle
          match={match}
          homeGoals={result.home}
          awayGoals={result.away}
          sheet={result.sheet}
          exitLabel={exitLabel}
          onExit={onExit}
        />
      ) : null}
    </>
  );
}
