import { useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { PlayerPage } from "@/components/PlayerPage";
import { BracketBoard, FixtureBoard, HubPanel, RatingBars, TeamLeaders, statLine } from "@/components/MatchViews";
import { StatsBook, TeamRating } from "@/components/StatsBook";
import { TeamLogo } from "@/components/TeamLogo";
import {
  autoDraft,
  clubById,
  clubGrades,
  beginSeason,
  canSign,
  continuePhase,
  currentMatch,
  firstOpenSlot,
  freeAgents,
  knockoutFor,
  leagueName,
  matchupFor,
  maxYears,
  payroll,
  playerById,
  quote,
  releasePlayer,
  room,
  rosterProblem,
  rungLabel,
  signPlayer,
  simCurrent,
  slotName,
  standings,
  startNextSeason,
  swapSlots,
  userClub,
  type Save,
} from "@/game/league";
import type { Matchup } from "@/game/roster";
import { leanOf } from "@/game/roster";

type Tab = "hub" | "table" | "games" | "squad" | "stats";

export function LeagueOffice({
  save,
  onChange,
  onPlay,
  onMenu,
}: {
  save: Save;
  onChange: (save: Save) => void;
  onPlay: (match: Matchup) => void;
  onMenu: () => void;
}) {
  const me = userClub(save);
  const market = save.phase === "sign" || save.phase === "market";
  const [tab, setTab] = useState<Tab>(market ? "squad" : "hub");
  const [tier, setTier] = useState(me.tier);
  const [years, setYears] = useState(2);
  const [slot, setSlot] = useState(0);
  const [notice, setNotice] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [scoutId, setScoutId] = useState<string | null>(null);
  const [signError, setSignError] = useState("");
  const [lineupNote, setLineupNote] = useState("");
  const [sortBy, setSortBy] = useState("overall");
  const [lean, setLean] = useState<"all" | "attack" | "defense" | "mix">("all");
  const [afford, setAfford] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);
  const overRef = useRef<number | null>(null);
  const armed = useRef<{ index: number; x: number; y: number } | null>(null);
  const skipClick = useRef(false);
  const match = currentMatch(save);
  const problem = rosterProblem(save, me.id);

  function play() {
    if (!match) return;
    const built = matchupFor(save, match.opponentId);
    if (built) onPlay(built);
  }

  function sign(playerId: string) {
    const player = playerById(save, playerId);
    if (!player) return "No such player";
    const slotFits = !me.roster[slot] && (slot === 3) === (player.kind === "goalie");
    const target = slotFits ? slot : firstOpenSlot(save, playerId);
    if (target < 0) {
      const message = player.kind === "goalie" ? "No open goalie slot" : "No open skater slot";
      setNotice(message);
      return message;
    }
    const term = Math.min(years, maxYears(player));
    const error = canSign(save, playerId, target, term);
    if (error) {
      setNotice(error);
      return error;
    }
    setNotice("");
    onChange(signPlayer(save, playerId, target, term));
    return "";
  }

  function dropLegal(from: number, to: number) {
    const leaving = me.roster[from] ? playerById(save, me.roster[from]) : null;
    const sitting = me.roster[to] ? playerById(save, me.roster[to]) : null;
    const fits = (player: { kind: string } | null, index: number) => !player || (index === 3 ? player.kind === "goalie" : player.kind === "skater");
    return fits(leaving, to) && fits(sitting, from);
  }

  function beginDrag(index: number, event: React.PointerEvent<HTMLButtonElement>) {
    if (!me.roster[index]) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragFrom.current = index;
    overRef.current = index;
    setDragging(index);
    setOver(index);
    setLineupNote("");
  }

  function armDrag(index: number, event: React.PointerEvent<HTMLButtonElement>) {
    if (!me.roster[index] || event.pointerType !== "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    armed.current = { index, x: event.clientX, y: event.clientY };
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const arm = armed.current;
    if (arm && dragFrom.current === null) {
      if (Math.hypot(event.clientX - arm.x, event.clientY - arm.y) < 6) return;
      dragFrom.current = arm.index;
      overRef.current = arm.index;
      setDragging(arm.index);
      setOver(arm.index);
      setLineupNote("");
      armed.current = null;
    }
    if (dragFrom.current === null) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const row = hit?.closest("[data-slot]");
    const next = row ? Number(row.getAttribute("data-slot")) : null;
    if (next === null || Number.isNaN(next)) return;
    overRef.current = next;
    setOver(next);
  }

  function endDrag(fromName = false) {
    const from = dragFrom.current;
    const to = overRef.current;
    if (fromName && from !== null) skipClick.current = true;
    dragFrom.current = null;
    overRef.current = null;
    armed.current = null;
    setDragging(null);
    setOver(null);
    if (from === null || to === null || to === from) return;
    if (!dropLegal(from, to)) {
      setLineupNote("Goalies stay in the net.");
      return;
    }
    const next = swapSlots(save, from, to);
    if (next === save) {
      setLineupNote("Goalies stay in the net.");
      return;
    }
    setLineupNote("");
    setSlot(to);
    onChange(next);
  }

  function cancelDrag() {
    dragFrom.current = null;
    overRef.current = null;
    armed.current = null;
    setDragging(null);
    setOver(null);
  }

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col px-3 py-3 sm:px-4">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <TeamLogo kit={me.kit} size={52} />
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em]" style={{ color: `hsl(${me.kit.primary} 88% 68%)` }}>
              {me.tag} · YEAR {save.season} · {leagueName(me.tier).toUpperCase()}
            </p>
            <h1 className="text-2xl font-black text-white">{me.name}</h1>
            <p className="text-xs text-[#8fb0c8]">{rungLabel(me.tier)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] tracking-wide text-[#8fb0c8]">BUDGET {me.budget} cr</p>
          <p className="text-sm text-[#d5e8ff]">
            Payroll {payroll(save, me.id)} · Room {room(save, me.id)}
          </p>
          <button type="button" onClick={onMenu} className="mt-1 text-xs font-semibold text-[#8fb0c8] underline-offset-4 hover:underline">
            Main menu
          </button>
        </div>
      </header>

      <nav className="mt-3 flex shrink-0 gap-2">
        {(["hub", "table", "games", "squad", "stats"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setTier(me.tier);
            }}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${tab === id ? "bg-[#ffe36b] text-[#1a1404]" : "border border-white/15 text-[#d5e8ff]"}`}
          >
            {id === "hub" ? "Hub" : id === "table" ? "Table" : id === "games" ? "Games" : id === "stats" ? "Stats" : market ? "Market" : "Squad"}
          </button>
        ))}
      </nav>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-6">
        {tab === "hub" ? (
          <HubPanel
            save={save}
            match={match}
            problem={problem}
            market={market}
            onPlay={play}
            onSim={() => onChange(simCurrent(save))}
            onContinue={() => onChange(continuePhase(save))}
            onBegin={() => onChange(save.phase === "sign" ? beginSeason(save) : startNextSeason(save))}
          />
        ) : null}

        {tab === "table" ? (
          <div>
            <TierSwitch tier={tier} onPick={setTier} />
            <Table
              save={save}
              tier={tier}
              me={me.id}
              picked={scoutId}
              onPick={(id) => setScoutId((current) => (current === id ? null : id))}
            />
            {scoutId ? <ClubSheet save={save} clubId={scoutId} onOpen={(id) => { setSignError(""); setOpenId(id); }} /> : null}
          </div>
        ) : null}

        {tab === "games" ? (
          <div className="grid gap-3">
            <TierSwitch tier={tier} onPick={setTier} />
            <BracketBoard title="League tournament" matches={knockoutFor(save, "playoff", tier)} save={save} />
            {knockoutFor(save, "relegation", tier).length ? (
              <BracketBoard title="Relegation" matches={knockoutFor(save, "relegation", tier)} save={save} />
            ) : null}
            <BracketBoard title="Universe" matches={knockoutFor(save, "universe")} save={save} />
            <FixtureBoard save={save} tier={tier} me={me.id} />
          </div>
        ) : null}

        {tab === "squad" ? (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-white/10 bg-[#0c1424] p-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#d5e8ff]">Roster</h2>
                  <p className="text-[11px] text-[#8fb0c8]">Drag a player to change spot or send them to the bench. Tap the name for the card.</p>
                  <RosterGrade save={save} clubId={me.id} />
                </div>
                {market ? (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => onChange(autoDraft(save, years))}
                      className="rounded-full border border-[#ffe36b]/50 px-3 py-1 text-xs font-bold text-[#ffe36b]"
                    >
                      Auto draft
                    </button>
                    <button
                      type="button"
                      disabled={!!problem}
                      onClick={() => onChange(save.phase === "sign" ? beginSeason(save) : startNextSeason(save))}
                      className="rounded-full bg-[#ffe36b] px-3 py-1 text-xs font-bold text-[#1a1404] disabled:opacity-40"
                    >
                      {save.phase === "sign" ? "Begin season" : "Start next season"}
                    </button>
                  </div>
                ) : null}
              </div>
              {market ? (
                <p className="mb-2 text-xs text-[#9eb6cc]">
                  {problem ? <span className="text-[#ffb4c4]">{problem}. </span> : null}
                  {me.budgetNote}
                </p>
              ) : null}
              {me.roster.map((id, index) => {
                const player = id ? playerById(save, id) : null;
                const deal = player ? save.contracts.find((c) => c.playerId === player.id) : null;
                const hot = over === index && dragging !== null && dragging !== index;
                const blocked = hot && dragging !== null && !dropLegal(dragging, index);
                return (
                  <div key={slotName(index)}>
                    {index === 4 ? <p className="mb-1.5 mt-3 text-[11px] font-semibold tracking-[0.14em] text-[#8fb0c8]">BENCH</p> : null}
                    <div
                      data-slot={index}
                      className={`mb-1.5 flex items-stretch gap-1 rounded-xl border ${
                        blocked ? "border-[#ffb4c4] bg-[#2a1520]" : hot || slot === index ? "border-[#ffe36b] bg-[#1a2233]" : "border-white/10 bg-[#10192a]"
                      } ${dragging === index ? "opacity-45" : ""}`}
                    >
                      <button
                        type="button"
                        aria-label={player ? `Drag ${player.name}` : slotName(index)}
                        disabled={!player}
                        onPointerDown={(event) => beginDrag(index, event)}
                        onPointerMove={moveDrag}
                        onPointerUp={() => endDrag(false)}
                        onPointerCancel={cancelDrag}
                        className="flex w-[5.4rem] shrink-0 touch-none cursor-grab items-center gap-0.5 pl-1 text-left text-[11px] font-semibold whitespace-nowrap text-[#8fb0c8] active:cursor-grabbing disabled:text-[#3a4c60]"
                      >
                        <GripVertical size={16} />
                        {slotName(index)}
                      </button>
                      <button
                        type="button"
                        onPointerDown={(event) => armDrag(index, event)}
                        onPointerMove={moveDrag}
                        onPointerUp={() => endDrag(true)}
                        onPointerCancel={cancelDrag}
                        onClick={() => {
                          if (skipClick.current) {
                            skipClick.current = false;
                            return;
                          }
                          setSlot(index);
                          setSignError("");
                          if (id) setOpenId(id);
                        }}
                        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-2 pr-2.5 text-left"
                      >
                        {player ? (
                          <>
                            <span className="w-7 font-black text-[#ffe36b]">{player.overall}</span>
                            <span className="min-w-0 flex-1 truncate text-sm text-white">{player.name}</span>
                            <span className="shrink-0 text-[11px] text-[#9eb6cc]">
                              {deal ? `${deal.wage} cr · ${deal.seasonsLeft}y` : ""} · yr {player.seasonsPlayed + 1}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-[#6e8498]">Empty</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
              {lineupNote ? <p className="mt-1 text-xs text-[#ffb4c4]">{lineupNote}</p> : null}
              {market && me.roster[slot] ? (
                <button
                  type="button"
                  onClick={() => onChange(releasePlayer(save, me.roster[slot]))}
                  className="mt-1 text-sm font-semibold text-[#ffb4c4]"
                >
                  Release {playerById(save, me.roster[slot])?.name}
                </button>
              ) : null}
            </section>
            {market ? (
              <section className="rounded-2xl border border-white/10 bg-[#0c1424] p-3">
                <div className="mb-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-[#d5e8ff]">Free agents</h2>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setYears(term)}
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${years === term ? "bg-[#ffe36b] text-[#1a1404]" : "border border-white/15 text-[#d5e8ff]"}`}
                        >
                          {term}y
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-[#8fb0c8]">Tap a player for the chart. Bars are each rating, out of 11. Auto draft fills open spots, then spends what's left.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className="rounded-full border border-white/15 bg-[#10192a] px-2 py-1 text-[11px] font-semibold text-[#d5e8ff]"
                    >
                      {["overall", "speed", "agility", "shot", "attack", "defense", "handling", "toughness", "iq", "rebound", "composure", "poke"].map((key) => (
                        <option key={key} value={key}>
                          {key === "overall" ? "Overall" : key[0].toUpperCase() + key.slice(1)}
                        </option>
                      ))}
                    </select>
                    {(["all", "attack", "defense", "mix"] as const).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLean(id)}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${lean === id ? "bg-white/15 text-white" : "text-[#8fb0c8]"}`}
                      >
                        {id === "all" ? "All leans" : id[0].toUpperCase() + id.slice(1)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAfford((value) => !value)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${afford ? "bg-[#ffe36b] text-[#1a1404]" : "text-[#8fb0c8]"}`}
                    >
                      Affordable
                    </button>
                  </div>
                </div>
                {notice ? <p className="mb-2 text-xs text-[#ffb4c4]">{notice}</p> : null}
                <div className="grid gap-1.5">
                  {freeAgents(save)
                    .filter((player) => lean === "all" || leanOf(player.styles) === lean)
                    .filter((player) => {
                      if (!afford) return true;
                      const offer = quote(save, player.id);
                      return !!offer && offer.wage <= room(save, me.id);
                    })
                    .sort((a, b) => rate(b, sortBy) - rate(a, sortBy) || a.name.localeCompare(b.name))
                    .map((player) => {
                    const offer = quote(save, player.id);
                    const priced = offer ? offer.wage : 0;
                    const fits = !!offer && priced <= room(save, me.id);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => {
                          setSignError("");
                          setOpenId(player.id);
                        }}
                        className="rounded-xl border border-white/10 bg-[#10192a] px-2.5 py-2 text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-7 font-black text-[#ffe36b]">{player.overall}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-white">
                              {player.name}
                              <span className="text-[#8fb0c8]"> · {player.kind === "goalie" ? "G" : "S"}</span>
                            </span>
                            <span className="block truncate text-[11px] text-[#9eb6cc]">
                              {player.seasonsPlayed ? `${player.seasonsPlayed} seasons` : "Rookie"}
                              {offer ? ` · ${offer.wage} cr` : ""}
                              {offer?.bidder ? ` · ${offer.bidder} bidding` : " · no other bids"}
                              {!fits ? " · over budget" : ""}
                            </span>
                          </span>
                        </span>
                        <RatingBars kind={player.kind} ratings={player.ratings} />
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : (
              <p className="text-sm text-[#9eb6cc]">The market opens after the universe tournament. You can still reorder the lineup.</p>
            )}
          </div>
        ) : null}
        {tab === "stats" ? <StatsBook save={save} onOpen={(id) => { setSignError(""); setOpenId(id); }} /> : null}
      </div>
      {openId ? (
        <PlayerPage
          save={save}
          playerId={openId}
          market={market}
          years={years}
          signError={signError}
          onYears={setYears}
          onClose={() => setOpenId(null)}
          onSign={() => {
            const error = sign(openId);
            setSignError(error);
            if (!error) setOpenId(null);
          }}
          onRelease={() => {
            onChange(releasePlayer(save, openId));
            setOpenId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Table({ save, tier, me, picked, onPick }: { save: Save; tier: number; me: string; picked: string | null; onPick: (id: string) => void }) {
  const rows = standings(save, tier);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="grid grid-cols-[1.6rem_minmax(0,1fr)_2.4rem_1.7rem_1.7rem_2.3rem] gap-2 bg-[#10192a] px-3 py-2 text-[11px] font-semibold tracking-wide text-[#8fb0c8]">
        <span>#</span>
        <span>Club</span>
        <span>OVR</span>
        <span>W</span>
        <span>L</span>
        <span>GD</span>
      </div>
      {rows.map((club, index) => {
        const grades = clubGrades(save, club.id);
        return (
          <button
            key={club.id}
            type="button"
            onClick={() => onPick(club.id)}
            className={`grid w-full grid-cols-[1.6rem_minmax(0,1fr)_2.4rem_1.7rem_1.7rem_2.3rem] items-center gap-2 px-3 py-2 text-left text-sm ${club.id === picked ? "bg-[#243044]" : club.id === me ? "bg-[#1a2233]" : index % 2 ? "bg-[#0c1424]" : "bg-[#0a101c]"}`}
          >
            <span className="text-[#8fb0c8]">{index + 1}</span>
            <span className="flex min-w-0 items-center gap-2 text-white">
              <TeamLogo kit={club.kit} size={22} />
              <span className="min-w-0">
                <span className="block truncate">{club.name}</span>
                <span className="block truncate text-[10px] text-[#8fb0c8]">
                  {grades ? `${grades.offense} off · ${grades.defense} def · ${grades.iq} iq` : "No roster"}
                </span>
              </span>
            </span>
            <span className="font-black text-[#ffe36b]">{grades ? grades.overall : "—"}</span>
            <span className="text-[#d5e8ff]">{club.wins}</span>
            <span className="text-[#d5e8ff]">{club.losses}</span>
            <span className="text-[#d5e8ff]">{club.gd}</span>
          </button>
        );
      })}
    </div>
  );
}

function ClubSheet({ save, clubId, onOpen }: { save: Save; clubId: string; onOpen: (id: string) => void }) {
  const club = clubById(save, clubId);
  if (!club) return null;
  const grades = clubGrades(save, club.id);
  return (
    <section className="mt-3 rounded-2xl border border-white/10 bg-[#0c1424] p-3">
      <div className="mb-3 flex items-center gap-2">
        <TeamLogo kit={club.kit} size={36} />
        <div>
          <h3 className="text-sm font-bold text-white">{club.name}</h3>
          <p className="text-[11px] text-[#8fb0c8]">{club.tag} · tap a player for the full card</p>
        </div>
      </div>
      {grades ? <TeamRating overall={grades.overall} offense={grades.offense} defense={grades.defense} iq={grades.iq} /> : <p className="text-xs text-[#8fb0c8]">No rating until the roster is filled.</p>}
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-[#8fb0c8]">LEADERS</p>
        <TeamLeaders save={save} clubId={club.id} onOpen={onOpen} />
      </div>
      <div className="mt-3 grid gap-1.5">
        {club.roster.map((id, index) => {
          const player = id ? playerById(save, id) : null;
          if (!player) {
            return (
              <p key={slotName(index)} className="px-2 py-1 text-sm text-[#6e8498]">
                {slotName(index)} · Empty
              </p>
            );
          }
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => onOpen(player.id)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#10192a] px-2.5 py-2 text-left"
            >
              <span className="w-16 shrink-0 text-[11px] font-semibold text-[#8fb0c8]">{slotName(index)}</span>
              <span className="w-7 font-black text-[#ffe36b]">{player.overall}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-white">{player.name}</span>
              <span className="shrink-0 text-[11px] text-[#9eb6cc]">{statLine(player)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RosterGrade({ save, clubId }: { save: Save; clubId: string }) {
  const grades = clubGrades(save, clubId);
  if (!grades) return <p className="mt-1 text-[11px] text-[#8fb0c8]">Overall shows once someone is on the roster.</p>;
  return (
    <p className="mt-1 text-[11px] text-[#8fb0c8]">
      <span className="font-black text-[#ffe36b]">{grades.overall}</span> overall · {grades.offense} off · {grades.defense} def · {grades.iq} iq
    </p>
  );
}

function TierSwitch({ tier, onPick }: { tier: number; onPick: (tier: number) => void }) {
  return (
    <div className="mb-2 flex gap-1 overflow-x-auto">
      {Array.from({ length: 8 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tier === i ? "bg-white/15 text-white" : "text-[#8fb0c8]"}`}
        >
          {leagueName(i).replace(" League", "")}
        </button>
      ))}
    </div>
  );
}

function rate(player: { overall: number; ratings: object }, key: string) {
  if (key === "overall") return player.overall;
  const value = (player.ratings as Record<string, number>)[key];
  return typeof value === "number" ? value : -1;
}
