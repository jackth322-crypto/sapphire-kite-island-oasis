import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MainMenu, TeamCreator } from "@/components/FrontDoor";
import { LeagueOffice } from "@/components/LeagueOffice";
import { FinalWhistle } from "@/components/MatchViews";
import { RosterPicker } from "@/components/RosterPicker";
import { RinkBackdrop } from "@/components/RinkBackdrop";
import {
  clearCareer,
  createCareer,
  correctPromotion,
  listSlots,
  loadCareer,
  playCurrent,
  saveCareer,
  type MatchSheet,
  type Save,
  type SlotId,
} from "@/game/league";
import { mountSpaceHockey } from "@/game/spaceHockey";
import { armSfx, setBed } from "@/game/sfx";
import type { Matchup } from "@/game/roster";

export const Route = createFileRoute("/")({ component: Home });

type View = "menu" | "free" | "create" | "league" | "rink";

function Home() {
  const [slots, setSlots] = useState(listSlots);
  const slotRef = useRef<SlotId>(1);
  const [save, setSave] = useState<Save | null>(null);
  const [view, setView] = useState<View>("menu");
  const [match, setMatch] = useState<Matchup | null>(null);
  const [leagueMatch, setLeagueMatch] = useState(false);
  const [freeKey, setFreeKey] = useState(0);
  const [finished, setFinished] = useState(false);
  const saveRef = useRef(save);
  saveRef.current = save;
  const applied = useRef(false);

  useEffect(() => armSfx(), []);

  useEffect(() => {
    const live = view === "rink" || (view === "free" && !!match);
    const menu = view === "menu" || view === "create" || view === "league" || (view === "free" && !match);
    setBed(live ? "crowd" : menu ? "menu" : "off");
  }, [view, match]);

  useEffect(() => {
    if (!save) return;
    const fixed = correctPromotion(save);
    if (fixed !== save) commit(fixed);
  }, [save]);

  function commit(next: Save) {
    setSave(next);
    saveCareer(next, slotRef.current);
    setSlots(listSlots());
  }

  function openSlot(id: SlotId) {
    slotRef.current = id;
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#070b18]">
      {view === "rink" || view === "create" || (view === "free" && match) ? null : <RinkBackdrop />}
      {view === "menu" ? (
        <MainMenu
          slots={slots}
          onFree={() => {
            setFreeKey((key) => key + 1);
            setMatch(null);
            setLeagueMatch(false);
            setView("free");
          }}
          onNew={(id) => {
            openSlot(id);
            setView("create");
          }}
          onContinue={(id) => {
            const loaded = loadCareer(id);
            if (!loaded) {
              setSlots(listSlots());
              return;
            }
            openSlot(id);
            setSave(loaded);
            setView("league");
          }}
          onDelete={(id) => {
            clearCareer(id);
            if (slotRef.current === id) setSave(null);
            setSlots(listSlots());
          }}
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
      {view === "free" ? (
        <div className={match ? "hidden" : "h-full"}>
          <RosterPicker key={freeKey} onMenu={() => setView("menu")} onPlay={(next) => setMatch(next)} />
        </div>
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
          onMenu={() => {
            setSlots(listSlots());
            setView("menu");
          }}
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
