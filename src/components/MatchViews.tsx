import { useState } from "react";
import { PlayerMark, ratingColor, skillGlow } from "@/components/PlayerMark";
import { TeamLogo } from "@/components/TeamLogo";
import {
  clubById,
  clubGrades,
  clubPrestige,
  clubLeaders,
  fixturesFor,
  formatPct,
  knockSeed,
  knockoutFor,
  leagueName,
  playerById,
  savePct,
  shotPct,
  standings,
  type BoxScore,
  type MatchSheet,
  type Save,
  type SeasonForm,
} from "@/game/league";
import type { GoalieRatings, Matchup, PlayerCard, SkaterRatings } from "@/game/roster";
import { kitPaint } from "@/game/roster";

export { ratingColor, skillGlow };

export function RatingBars({ kind, ratings, compact = false }: { kind: "skater" | "goalie"; ratings: SkaterRatings | GoalieRatings; compact?: boolean }) {
  const keys = kind === "goalie"
    ? [["speed", "SP"], ["agility", "AG"], ["iq", "IQ"], ["rebound", "RB"], ["composure", "CM"], ["poke", "PK"]]
    : [["speed", "SP"], ["agility", "AG"], ["shot", "SH"], ["attack", "AT"], ["defense", "DF"], ["handling", "HN"], ["toughness", "TG"]];
  return (
    <span className={`flex items-end ${compact ? "mt-1.5 gap-1" : "mt-2 gap-1.5"}`}>
      {keys.map(([key, label]) => {
        const value = (ratings as unknown as Record<string, number>)[key] ?? 0;
        const color = ratingColor(value);
        return (
          <span key={key} className={`flex flex-col items-center ${compact ? "w-6 gap-0.5" : "w-8 gap-1"}`} title={`${label} ${value}`}>
            <span className={`font-black leading-none ${compact ? "text-[11px]" : "text-sm"}`} style={{ color }}>{value}</span>
            <span className={`flex items-end overflow-hidden rounded-full bg-black/40 ${compact ? "h-8 w-2" : "h-16 w-3"}`}>
              <span className="block w-full rounded-full" style={{ height: `${(value / 11) * 100}%`, background: color }} />
            </span>
            <span className={`font-bold tracking-wide text-[#b7d4e8] ${compact ? "text-[9px]" : "text-[11px]"}`}>{label}</span>
          </span>
        );
      })}
    </span>
  );
}

export function TeamLeaders({ save, clubId, onOpen }: { save: Save; clubId: string; onOpen: (id: string) => void }) {
  const leaders = clubLeaders(save, clubId);
  if (!leaders.length) return <p className="text-[11px] text-[#8fb0c8]">No games on the books yet.</p>;
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {leaders.map((row) => (
        <button key={row.key} type="button" onClick={() => onOpen(row.playerId)} className="rounded-xl border border-white/10 bg-[#10192a] px-2.5 py-1.5 text-left">
          <span className="block text-[10px] font-semibold tracking-wide text-[#8fb0c8]">{row.label}</span>
          <span className="mt-1 flex items-center gap-1.5">
            <PlayerMark name={row.name} kit={clubById(save, clubId)?.kit} size={22} />
            <span className="min-w-0 truncate text-sm font-semibold text-white">{row.name}</span>
          </span>
          <span className="text-sm font-black text-[#ffe36b]">{row.value}</span>
        </button>
      ))}
    </div>
  );
}

export function statLine(player: { kind: string; season: SeasonForm; history: SeasonForm[] }) {
  const form = player.season.games > 0 ? player.season : [...player.history].reverse().find((line) => line.games > 0);
  if (!form || form.games <= 0) return "No games";
  if (player.kind === "goalie") return `${form.saves} SV · ${form.ga} GA · ${formatPct(savePct(form))}`;
  return `${form.goals} G · ${form.assists} A · ${form.shots} S · ${formatPct(shotPct(form))}`;
}

export function HubPanel({
  save,
  match,
  problem,
  market,
  onPlay,
  onSim,
  onContinue,
  onBegin,
}: {
  save: Save;
  match: { label: string; opponentId: string; opponentName: string; userHome: boolean } | null;
  problem: string | null;
  market: boolean;
  onPlay: () => void;
  onSim: () => void;
  onContinue: () => void;
  onBegin: () => void;
}) {
  const me = clubById(save, save.userClubId);
  const opp = match ? clubById(save, match.opponentId) : null;
  const report = save.report;
  const home = report ? clubById(save, report.homeId) : null;
  const away = report ? clubById(save, report.awayId) : null;
  return (
    <div className="grid gap-3">
      {promotionLock(save) ? (
        <section className="rounded-3xl border border-[#ffe36b]/50 bg-[#2a2412] px-4 py-3">
          <p className="text-[11px] font-black tracking-[0.16em] text-[#ffe36b]">PROMOTED</p>
          <p className="mt-1 text-sm text-[#ffe9a8]">{promotionLock(save)}</p>
        </section>
      ) : null}
      {report && home && away ? (
        <section className="overflow-hidden rounded-3xl border border-[#ffe36b]/40 bg-[#10182a]/80 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between bg-[#0c1424] px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-[#8fd4ff]">
            <span>FINAL · {report.label.toUpperCase()}</span>
            {report.box.blastoff ? <span className="text-[#ffe36b]">BLASTOFF</span> : <span>BOX SCORE</span>}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
            <ClubMark club={home} align="left" />
            <p className="text-center text-4xl font-black tracking-tight text-white">
              {report.hg}<span className="px-2 text-[#8fb0c8]">–</span>{report.ag}
            </p>
            <ClubMark club={away} align="right" />
          </div>
          <BoxBoard save={save} homeId={report.homeId} awayId={report.awayId} box={report.box} />
        </section>
      ) : null}
      <section className="overflow-hidden rounded-3xl border border-[#ffe36b]/30 bg-[#14182c]">
        <div className="bg-[#ffe36b] px-4 py-1.5 text-[11px] font-black tracking-[0.18em] text-[#1a1404]">
          {match ? match.label.toUpperCase() : market ? (save.phase === "sign" ? "OPENING MARKET" : "FREE AGENCY") : "LEAGUE OFFICE"}
        </div>
        <div className="p-4">
          {match && me && opp ? (
            <>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <ClubMark club={me} align="left" />
                <div className="text-center">
                  <p className="text-xs font-black tracking-[0.2em] text-[#ffe36b]">VS</p>
                  <p className="mt-1 text-[11px] text-[#8fb0c8]">{match.userHome ? "Home ice" : "Away ice"}</p>
                </div>
                <ClubMark club={opp} align="right" />
              </div>
              <p className="mt-3 text-center text-sm text-[#9eb6cc]">You still skate from the left.</p>
              <div className="mt-4 grid grid-cols-[1.4fr_0.8fr] gap-2">
                <button type="button" onClick={onPlay} className="rounded-2xl bg-[#ffe36b] px-4 py-3 text-base font-black text-[#1a1404]">
                  Drop the puck
                </button>
                <button type="button" onClick={onSim} className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-bold text-[#e7f4ff]">
                  Sim
                </button>
              </div>
            </>
          ) : market ? (
            <>
              <h2 className="display text-4xl text-white">{save.phase === "sign" ? "Build the roster" : "The market is open"}</h2>
              <p className="mt-1 text-sm text-[#9eb6cc]">{problem ?? "The roster fits the purse."}</p>
              <p className="mt-2 text-xs text-[#8fb0c8]">{me?.budgetNote}</p>
              <button type="button" disabled={!!problem} onClick={onBegin} className="mt-4 rounded-2xl bg-[#ffe36b] px-4 py-3 text-sm font-black text-[#1a1404] disabled:opacity-40">
                {save.phase === "sign" ? "Begin season" : "Start next season"}
              </button>
            </>
          ) : (
            <>
              <h2 className="display text-4xl text-white">{idleCopy(save)}</h2>
              <button type="button" onClick={onContinue} className="mt-4 rounded-2xl bg-[#ffe36b] px-4 py-3 text-sm font-black text-[#1a1404]">
                Continue
              </button>
            </>
          )}
        </div>
      </section>
      <RoundStrip save={save} />
      {save.news.length ? (
        <section className="glass rounded-2xl p-4">
          <h2 className="display mb-3 text-xl text-[#8fd4ff]">Wire</h2>
          <ul className="grid gap-2">
            {save.news.slice(0, 6).map((line, index) => (
              <li key={`${index}-${line}`} className="border-l-2 border-[#ffe36b]/70 pl-3 text-sm text-[#d5e8ff]">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <details className="rounded-2xl border border-white/10 bg-[#0c1424] px-4 py-3 text-sm text-[#9eb6cc]">
        <summary className="cursor-pointer font-semibold text-[#d5e8ff]">How the ladder works</summary>
        <p className="mt-2 leading-6">
          Ten clubs in each of eight leagues. You start in the Dust League. Everyone plays everyone once. First place is promoted, and so is the tournament winner. If one club wins both, the tournament finalist is promoted too. The bottom two drop, except there is nowhere below the Dust League and nowhere above the Crown League. Those same two clubs go to the universe tournament. Then free agency opens. A contract lasts at most three seasons. Players retire after ten. The purse is rebuilt from wins, titles, and the league you are about to play in.
        </p>
      </details>
    </div>
  );
}

function ClubMark({ club, align }: { club: { name: string; tag: string; kit: Save["clubs"][number]["kit"] }; align: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <TeamLogo kit={club.kit} size={42} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#8fd4ff]">{club.tag}</p>
        <p className="truncate text-sm font-black text-white">{club.name}</p>
      </div>
    </div>
  );
}

function RoundStrip({ save }: { save: Save }) {
  const me = save.userClubId;
  const tier = clubById(save, me)?.tier ?? 0;
  const played = fixturesFor(save, tier).filter((fixture) => fixture.hg !== null && (fixture.homeId === me || fixture.awayId === me));
  const last = played[played.length - 1];
  if (!last) return null;
  const mates = fixturesFor(save, last.tier).filter((fixture) => fixture.round === last.round && fixture.hg !== null && fixture.id !== last.id);
  if (!mates.length) return null;
  return (
    <section className="glass rounded-2xl p-3">
      <h2 className="display mb-2 text-lg text-[#8fd4ff]">Rest of round {last.round + 1}</h2>
      <div className="grid gap-1">
        {mates.map((fixture) => (
          <FixtureRow key={fixture.id} save={save} homeId={fixture.homeId} awayId={fixture.awayId} hg={fixture.hg} ag={fixture.ag} box={fixture.box} mine={false} />
        ))}
      </div>
    </section>
  );
}

export function FixtureBoard({ save, tier, me }: { save: Save; tier: number; me: string }) {
  const fixtures = fixturesFor(save, tier);
  const rounds = [...new Set(fixtures.map((fixture) => fixture.round))];
  return (
    <section className="glass rounded-2xl p-4">
      <h2 className="display mb-3 text-2xl text-white">{leagueName(tier)}</h2>
      <div className="grid gap-3">
        {rounds.map((round) => (
          <div key={round}>
            <p className="mb-1 text-[10px] font-semibold tracking-[0.14em] text-[#8fb0c8]">ROUND {round + 1}</p>
            {fixtures.filter((fixture) => fixture.round === round).map((fixture) => (
              <FixtureRow key={fixture.id} save={save} homeId={fixture.homeId} awayId={fixture.awayId} hg={fixture.hg} ag={fixture.ag} box={fixture.box} mine={fixture.homeId === me || fixture.awayId === me} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function FixtureRow({
  save,
  homeId,
  awayId,
  hg,
  ag,
  box,
  mine,
}: {
  save: Save;
  homeId: string;
  awayId: string;
  hg: number | null;
  ag: number | null;
  box: BoxScore | null;
  mine: boolean;
}) {
  const [open, setOpen] = useState(false);
  const home = clubById(save, homeId);
  const away = clubById(save, awayId);
  const played = hg !== null && ag !== null;
  return (
    <div className={`mb-1 rounded-xl border ${mine ? "border-[#ffe36b]/40" : "border-white/10"}`}>
      <button type="button" disabled={!played || !box} onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm">
        <span className={`truncate ${mine ? "text-white" : "text-[#d5e8ff]"}`}>
          {home?.tag ?? "—"} vs {away?.tag ?? "—"}
        </span>
        <span className="shrink-0 font-black text-white">{played ? `${hg}–${ag}` : "—"}</span>
      </button>
      {open && box ? <div className="border-t border-white/10 px-2 py-2"><BoxBoard save={save} homeId={homeId} awayId={awayId} box={box} /></div> : null}
    </div>
  );
}

export function BracketBoard({
  title,
  matches,
  save,
  onClub,
}: {
  title: string;
  matches: ReturnType<typeof knockoutFor>;
  save: Save;
  onClub?: (id: string) => void;
}) {
  const rows = matches.filter((match) => match.homeId || match.awayId || match.homeFrom);
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return null;
  const rounds = [...new Set(rows.map((match) => match.round))].sort((a, b) => a - b);
  const picked = rows.find((match) => match.id === open);
  return (
    <section className="glass rounded-2xl p-4">
      <h2 className="display mb-3 text-2xl text-white">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {rounds.map((round) => (
          <div key={round} className="grid min-w-[18rem] content-around gap-3">
            <p className="display text-sm tracking-[0.16em] text-[#8fd4ff]">{roundTitle(rows[0]?.competition ?? "playoff", round)}</p>
            {rows.filter((match) => match.round === round).map((match) => {
              const home = clubById(save, match.homeId);
              const away = clubById(save, match.awayId);
              const played = match.hg !== null && match.ag !== null;
              const homeWin = played && match.hg! > match.ag!;
              return (
                <div key={match.id} className={`glass-row overflow-hidden rounded-xl ${open === match.id ? "ring-2 ring-[#ffe36b]" : ""} ${played ? "" : "opacity-80"}`}>
                  <BracketSide save={save} match={match} side="home" club={home} score={match.hg} win={homeWin} onClub={onClub} />
                  <div className="mx-3 h-px bg-white/10" />
                  <BracketSide save={save} match={match} side="away" club={away} score={match.ag} win={played && !homeWin} onClub={onClub} />
                  {played ? (
                    <button type="button" onClick={() => setOpen(open === match.id ? null : match.id)} className="display w-full border-t border-white/10 px-3 py-1.5 text-left text-xs tracking-[0.14em] text-[#8fd4ff]">
                      {open === match.id ? "Hide box" : "Box score"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {picked?.box && picked.hg !== null ? (
        <div className="mt-3">
          <BoxBoard save={save} homeId={picked.homeId} awayId={picked.awayId} box={picked.box} />
        </div>
      ) : null}
    </section>
  );
}

function BracketSide({
  save,
  match,
  side,
  club,
  score,
  win,
  onClub,
}: {
  save: Save;
  match: ReturnType<typeof knockoutFor>[number];
  side: "home" | "away";
  club: ReturnType<typeof clubById>;
  score: number | null;
  win: boolean;
  onClub?: (id: string) => void;
}) {
  const grades = club ? clubGrades(save, club.id) : null;
  const stripe = club ? kitPaint(club.kit, "primary", 70, 52) : "transparent";
  const seed = knockSeed(save, match, side);
  return (
    <div className="flex items-center gap-2 px-2 py-2" style={{ boxShadow: win ? `inset 4px 0 0 ${stripe}` : undefined }}>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#10192a] text-sm font-black text-[#ffe36b] ring-1 ring-[#ffe36b]/50">
        {seed || "–"}
      </span>
      {club ? <TeamLogo kit={club.kit} size={32} /> : <span className="inline-block h-8 w-8 rounded-full border border-dashed border-white/20" />}
      <button
        type="button"
        disabled={!club}
        onClick={() => club && onClub?.(club.id)}
        className="min-w-0 flex-1 text-left disabled:cursor-default"
      >
        <span className={`block truncate text-lg leading-tight ${win ? "font-black text-white" : "font-semibold text-[#d5e8ff]"}`}>{club?.name ?? "Waiting"}</span>
        {grades ? (
          <span className="mt-0.5 block text-sm text-[#9eb6cc]">
            <span className="font-black text-[#ffe36b]">{grades.overall}</span> OVR
            <span className="mx-1.5 text-white/20">|</span>
            <span className="font-black text-[#d7c6ff]">{clubPrestige(save, club!.id)}</span> PST
          </span>
        ) : (
          <span className="block text-sm text-[#6e8498]">{club ? "No rating" : "Bracket filling"}</span>
        )}
      </button>
      <span className={`w-8 text-right text-3xl font-black leading-none ${win ? "text-[#ffe36b]" : "text-white/80"}`}>{score === null ? "" : score}</span>
    </div>
  );
}

function roundTitle(competition: string, round: number) {
  if (competition === "relegation") return "Relegation";
  if (competition === "universe") return ["Round of 16", "Quarterfinal", "Semifinal", "Final"][round] ?? "Round";
  return ["Quarterfinal", "Semifinal", "Final"][round] ?? "Round";
}

export function BoxBoard({ save, homeId, awayId, box }: { save: Save; homeId: string; awayId: string; box: BoxScore }) {
  return (
    <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2">
      <SideBox save={save} clubId={homeId} lines={box.home} />
      <SideBox save={save} clubId={awayId} lines={box.away} />
    </div>
  );
}

function SideBox({ save, clubId, lines }: { save: Save; clubId: string; lines: BoxScore["home"] }) {
  const club = clubById(save, clubId);
  const roster = (club?.roster ?? []).map((id) => (id ? playerById(save, id) : null)).filter((player) => !!player);
  const rows = roster.length
    ? roster.map((player) => ({ id: player.id, name: player.name, kind: player.kind, line: lines.find((line) => line.id === player.id) }))
    : lines.map((line) => ({ id: line.id, name: line.name, kind: line.kind, line }));
  return (
    <div className="rounded-xl bg-[#10192a] px-2 py-2">
      <p className="mb-1 truncate text-[11px] font-bold tracking-wide text-[#8fd4ff]">{club?.tag ?? "SIDE"}</p>
      {rows.map((row) => (
        <p key={row.id} className="flex justify-between gap-2 py-0.5 text-[12px] text-[#d5e8ff]">
          <span className="truncate">{row.name}</span>
          <span className="shrink-0 text-[#9eb6cc]">
            {row.kind === "goalie"
              ? `${row.line?.saves ?? 0} SV · ${row.line?.ga ?? 0} GA · ${row.line?.pokes ?? 0} PK`
              : `${row.line?.goals ?? 0}G ${row.line?.assists ?? 0}A ${row.line?.shots ?? 0}S`}
          </span>
        </p>
      ))}
    </div>
  );
}

export function FinalWhistle({
  match,
  homeGoals,
  awayGoals,
  sheet,
  exitLabel,
  onExit,
}: {
  match: Matchup;
  homeGoals: number;
  awayGoals: number;
  sheet?: MatchSheet;
  exitLabel: string;
  onExit: () => void;
}) {
  const homeName = match.homeName || match.homeTag || "Home";
  const awayName = match.awayName || match.awayTag || "Away";
  const winner = homeGoals > awayGoals ? homeName : awayName;
  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-[#070b18]/55 p-3 sm:items-center">
      <section className="max-h-[86dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/15 bg-[#0c1424] shadow-2xl">
        <div className="bg-[#ffe36b] px-4 py-2 text-[11px] font-black tracking-[0.18em] text-[#1a1404]">
          {sheet?.blastoff ? "BLASTOFF" : "FINAL"}
        </div>
        <div className="px-4 py-4 text-center">
          <p className="text-sm font-semibold text-[#8fd4ff]">{homeGoals === awayGoals ? "Level at the whistle" : `${winner} wins`}</p>
          <p className="mt-1 text-5xl font-black text-white">
            {homeGoals}<span className="px-2 text-2xl text-[#8fb0c8]">–</span>{awayGoals}
          </p>
          <p className="mt-1 text-xs text-[#8fb0c8]">{homeName} · {awayName}</p>
        </div>
        <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2">
          <WhistleSide title={homeName} cards={[...match.home.ice, ...match.home.bench]} lines={sheet?.lines ?? []} />
          <WhistleSide title={awayName} cards={[...match.away.ice, ...match.away.bench]} lines={sheet?.lines ?? []} />
        </div>
        <div className="px-4 pb-4">
          <button type="button" onClick={onExit} className="w-full rounded-2xl bg-[#ffe36b] py-3 text-sm font-black text-[#1a1404]">
            {exitLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function WhistleSide({ title, cards, lines }: { title: string; cards: PlayerCard[]; lines: MatchSheet["lines"] }) {
  return (
    <div className="rounded-2xl bg-[#10192a] p-2">
      <p className="mb-1 truncate text-[11px] font-bold tracking-wide text-[#8fd4ff]">{title}</p>
      {cards.map((card) => {
        const line = lines.find((row) => row.id === card.id);
        return (
          <p key={card.id} className="flex justify-between gap-2 py-0.5 text-[12px] text-[#d5e8ff]">
            <span className="truncate">{card.name}</span>
            <span className="shrink-0 text-[#9eb6cc]">
              {card.kind === "goalie"
                ? `${line?.saves ?? 0} SV · ${line?.ga ?? 0} GA · ${line?.pokes ?? 0} PK`
                : `${line?.goals ?? 0}G ${line?.assists ?? 0}A ${line?.shots ?? 0}S`}
            </span>
          </p>
        );
      })}
    </div>
  );
}

function promotionLock(save: Save) {
  const me = clubById(save, save.userClubId);
  if (!me || me.tier >= 7) return null;
  if (save.phase === "playoffs" && me.rsTitle) {
    return `You won the ${leagueName(me.tier)}, so you are going up. The tournament sends a second club. If you take that too, the finalist is promoted with you.`;
  }
  if (save.phase === "playoffs") return "The regular-season champion is promoted. Win the tournament and you go up with them.";
  if (save.phase !== "relegation") return null;
  const table = standings(save, me.tier);
  const place = table.findIndex((row) => row.id === me.id);
  if (place >= 8) return me.tier === 0 ? "The bottom two stay. There is nowhere below the Dust League." : `The bottom two drop. You are relegated to the ${leagueName(me.tier - 1)}.`;
  return null;
}

function idleCopy(save: Save) {
  if (save.phase === "playoffs") return "The tournament bracket is up.";
  if (save.phase === "relegation") return "The cellar is being settled.";
  if (save.phase === "universe") return "The universe bracket is up.";
  return "The round is complete.";
}
