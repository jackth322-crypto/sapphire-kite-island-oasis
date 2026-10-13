import { LeanBadge, PerkIcons, TendencyRow } from "@/components/Perks";
import { overallColor, PlayerMark, ratingColor } from "@/components/PlayerMark";
import {
  careerTotals,
  clubForPlayer,
  contractFor,
  firstOpenSlot,
  formatPct,
  leagueName,
  maxYears,
  playerById,
  potentialOverall,
  quote,
  releaseFee,
  savePct,
  seasonProgress,
  shotPct,
  slotAccepts,
  userClub,
  type Save,
} from "@/game/league";
import type { GoalieRatings, SkaterRatings } from "@/game/roster";

export function PlayerPage({
  save,
  playerId,
  market,
  years,
  slot,
  signError,
  onYears,
  onClose,
  onSign,
  onRelease,
  onClub,
}: {
  save: Save;
  playerId: string;
  market: boolean;
  years: number;
  slot?: number;
  signError: string;
  onYears: (years: number) => void;
  onClose: () => void;
  onSign: () => void;
  onRelease: () => void;
  onClub?: (id: string) => void;
}) {
  const player = playerById(save, playerId);
  if (!player) return null;
  const club = clubForPlayer(save, player.id);
  const deal = contractFor(save, player.id);
  const totals = careerTotals(player);
  const mine = club?.id === save.userClubId;
  const cap = maxYears(player);
  const landing = landingSlot(save, player, slot);
  const termCap = landing >= 7 ? Math.min(3, cap) : cap;
  const term = Math.min(years, termCap);
  const offer = !deal && market ? quote(save, player.id, term, landing) : null;
  const ceiling = potentialOverall(player);
  const moved = seasonProgress(player);
  const ratings = player.kind === "skater" ? skaterRatings(player.ratings) : goalieRatings(player.ratings);
  const history = [...player.history].reverse();
  const termNote = term <= 2 ? "Short deal, higher wage" : term >= 4 && ceiling - player.overall >= 4 ? "Long deal, but the ceiling is high" : term >= 4 ? "Long deal, lower wage" : "Standard term";
  const pct = offer ? Math.round(offer.adjust * 100) : 0;
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#070b18] px-3 py-3">
      <button type="button" onClick={onClose} className="display mb-2 shrink-0 text-sm tracking-[0.14em] text-[#8fd4ff]">
        Back
      </button>
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-2">
        <div className="shrink-0 rounded-2xl border border-white/10 p-3" style={{ background: "#10182a" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#8fd4ff]">
                {player.kind === "goalie" ? "GOALIE" : "SKATER"} · YEAR {player.seasonsPlayed + 1}
              </p>
              <h2 className="display truncate text-4xl leading-none text-white">{player.name}</h2>
              {player.retired ? <p className="text-xs font-semibold tracking-wide text-[#ffb4c4]">RETIRED</p> : null}
              <p className="mt-1 text-sm text-[#c5d7e8]">
                {club ? (
                  <button type="button" onClick={() => onClub?.(club.id)} className="font-bold text-[#8fd4ff] underline-offset-2 hover:underline">
                    {club.name}
                  </button>
                ) : (
                  "Free agent"
                )}
                {deal ? ` · ${deal.wage} cr · ${deal.seasonsLeft}y left` : ""}
              </p>
            </div>
            <div className="flex items-start gap-2 text-right">
              <div>
                <p className="text-3xl font-black leading-none" style={{ color: overallColor(player.overall) }}>{player.overall}</p>
                {moved ? (
                  <p className={`text-[11px] font-bold ${moved.delta > 0 ? "text-[#9dffc7]" : moved.delta < 0 ? "text-[#ffb4c4]" : "text-[#8fb0c8]"}`}>
                    {moved.delta > 0 ? `+${moved.delta}` : moved.delta} from last year
                  </p>
                ) : null}
                <p className="text-[11px] text-[#c9b6ff]">pot {ceiling}</p>
                <p className="text-[11px] text-[#8fb0c8]">{player.planet}</p>
              </div>
              <PlayerMark name={player.name} kit={club?.kit} hue={player.hue} size={40} overall={player.overall} />
            </div>
          </div>
          {market && !deal && offer ? (
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-3">
              <div>
                <p className="display text-4xl leading-none text-white">
                  {offer.wage}
                  <span className="ml-1 text-sm tracking-normal text-[#8fb0c8]">cr/yr</span>
                </p>
                <p className={`text-sm font-bold ${pct < 0 ? "text-[#9dffc7]" : pct > 0 ? "text-[#ffb4c4]" : "text-[#d5e8ff]"}`}>
                  {pct > 0 ? "+" : ""}
                  {pct}% · {offer.reason}
                </p>
                <p className="text-xs text-[#8fb0c8]">{termNote}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      disabled={choice > termCap}
                      onClick={() => onYears(choice)}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold disabled:opacity-30 ${term === choice ? "bg-[#ffe36b] text-[#1a1404]" : "border border-white/15 text-[#d5e8ff]"}`}
                    >
                      {choice}y
                    </button>
                  ))}
                </div>
                {signError ? <p className="text-xs text-[#ffb4c4]">{signError}</p> : null}
                <button type="button" onClick={onSign} className="rounded-full bg-[#ffe36b] px-4 py-1.5 text-sm font-bold text-[#1a1404]">
                  Sign for {term} season{term === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          ) : null}
          {market && mine && deal ? (
            <button type="button" onClick={onRelease} className="mt-3 rounded-full border border-[#ffb4c4]/40 px-4 py-1.5 text-sm font-semibold text-[#ffb4c4]">
              {releaseFee(save, player.id) ? `Release · ${releaseFee(save, player.id)} cr buyout` : "Release · no buyout"}
            </button>
          ) : null}
        </div>
        <div className="shrink-0 rounded-2xl border border-white/10 p-3" style={{ background: "#10182a" }}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {ratings.map((stat) => {
              const prior = player.prior ? (player.prior as unknown as Record<string, number>)[stat.key] : null;
              const capRating = (player.potential as unknown as Record<string, number>)[stat.key] ?? stat.value;
              const delta = prior === null ? null : stat.value - prior;
              const color = ratingColor(stat.value);
              return (
                <div key={stat.key}>
                  <div className="mb-0.5 flex justify-between text-[11px] text-[#9eb6cc]">
                    <span>{stat.label}</span>
                    <span>
                      <span style={{ color }}>{stat.value}</span>
                      {delta !== null && delta !== 0 ? (
                        <span className={delta > 0 ? "text-[#9dffc7]" : "text-[#ffb4c4]"}>{delta > 0 ? ` +${delta}` : ` ${delta}`}</span>
                      ) : null}
                      <span className="text-[#6e8498]"> / {capRating}</span>
                    </span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-white/10">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-white/20" style={{ width: `${(capRating / 11) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(stat.value / 11) * 100}%`, background: color }} />
                    {prior !== null ? <span className="absolute top-[-2px] h-2.5 w-0.5 bg-white" style={{ left: `${(prior / 11) * 100}%` }} /> : null}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-[#8fb0c8]">{player.prior ? "White tick is last year. Pale bar is the ceiling." : "Pale bar is the ceiling. Movement shows after a season."}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-white/10 pt-2">
            <span className="display text-xs tracking-[0.14em] text-[#ffe36b]">Awards</span>
            {player.awards.length ? (
              player.awards.map((award) => (
                <span key={`${award.year}-${award.title}`} className="rounded-full border border-[#ffe36b]/40 bg-[#2a2412] px-2 py-0.5 text-[11px] font-semibold text-[#ffe36b]">
                  Year {award.year} · {leagueName(award.tier)} · {award.title}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#8fb0c8]">None yet</span>
            )}
          </div>
          <div className="mt-2 grid gap-2 border-t border-white/10 pt-2 sm:grid-cols-2">
            <div>
              <p className="display mb-1 text-xs tracking-[0.14em] text-[#ffe36b]">Perks</p>
              <PerkIcons perks={player.perks} size={18} />
            </div>
            <div>
              <p className="display mb-1 text-xs tracking-[0.14em] text-[#8fd4ff]">{player.kind === "goalie" ? "Lean" : "Tendencies"}</p>
              {player.kind === "goalie" ? (
                <div>
                  <LeanBadge styles={player.styles} kind="goalie" ratings={player.ratings} />
                  <p className="mt-1 text-[10px] leading-snug text-[#8fb0c8]">Acrobat goalies fly. Mechanical goalies read the rebound and poke.</p>
                </div>
              ) : (
                <TendencyRow styles={player.styles} />
              )}
            </div>
          </div>
        </div>
        <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 p-3" style={{ background: "#10182a" }}>
          <h3 className="text-sm font-bold text-[#d5e8ff]">Career</h3>
          <p className="mt-1 text-sm text-[#b7c9da]">{summary(player.kind, totals)}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-max min-w-full text-left text-sm whitespace-nowrap text-[#d5e8ff]">
              <thead className="text-[11px] tracking-wide text-[#8fb0c8]">
                <tr>
                  <th className="py-1 pr-3 font-semibold">Year</th>
                  <th className="py-1 pr-3 font-semibold">Club</th>
                  <th className="py-1 pr-3 font-semibold">GP</th>
                  {player.kind === "goalie" ? (
                    <>
                      <th className="py-1 pr-3 font-semibold">W</th>
                      <th className="py-1 pr-3 font-semibold">SV</th>
                      <th className="py-1 pr-3 font-semibold">GA</th>
                      <th className="py-1 pr-3 font-semibold">SV%</th>
                      <th className="py-1 pr-3 font-semibold">PK</th>
                      <th className="py-1 pr-3 font-semibold">SO</th>
                    </>
                  ) : (
                    <>
                      <th className="py-1 pr-3 font-semibold">G</th>
                      <th className="py-1 pr-3 font-semibold">A</th>
                      <th className="py-1 pr-3 font-semibold">S</th>
                      <th className="py-1 pr-3 font-semibold">SH%</th>
                      <th className="py-1 pr-3 font-semibold">RSH</th>
                      <th className="py-1 pr-3 font-semibold">BL</th>
                    </>
                  )}
                  <th className="py-1 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {player.season.games > 0 ? (
                  <tr className="text-white">
                    <td className="py-1 pr-3">{save.season}</td>
                    <td className="py-1 pr-3">{club?.name ?? "—"}</td>
                    <td className="py-1 pr-3">{player.season.games}</td>
                    {player.kind === "goalie" ? (
                      <>
                        <td className="py-1 pr-3">{player.season.wins}</td>
                        <td className="py-1 pr-3">{player.season.saves}</td>
                        <td className="py-1 pr-3">{player.season.ga}</td>
                        <td className="py-1 pr-3">{formatPct(savePct(player.season))}</td>
                        <td className="py-1 pr-3">{player.season.pokes}</td>
                        <td className="py-1 pr-3">{player.season.shutouts}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-1 pr-3">{player.season.goals}</td>
                        <td className="py-1 pr-3">{player.season.assists}</td>
                        <td className="py-1 pr-3">{player.season.shots}</td>
                        <td className="py-1 pr-3">{formatPct(shotPct(player.season))}</td>
                        <td className="py-1 pr-3">{player.season.rushes}</td>
                        <td className="py-1 pr-3">{player.season.blasts}</td>
                      </>
                    )}
                    <td className="py-1">This season</td>
                  </tr>
                ) : null}
                {history.map((line) => (
                  <tr key={`${line.year}-${line.club}`} className="text-[#b7c9da]">
                    <td className="py-1 pr-3">{line.year}</td>
                    <td className="py-1 pr-3">
                      {line.club}
                      <span className="block text-[10px] text-[#8fb0c8]">{leagueName(line.tier)}</span>
                    </td>
                    <td className="py-1 pr-3">{line.games}</td>
                    {player.kind === "goalie" ? (
                      <>
                        <td className="py-1 pr-3">{line.wins}</td>
                        <td className="py-1 pr-3">{line.saves}</td>
                        <td className="py-1 pr-3">{line.ga}</td>
                        <td className="py-1 pr-3">{formatPct(savePct(line))}</td>
                        <td className="py-1 pr-3">{line.pokes}</td>
                        <td className="py-1 pr-3">{line.shutouts}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-1 pr-3">{line.goals}</td>
                        <td className="py-1 pr-3">{line.assists}</td>
                        <td className="py-1 pr-3">{line.shots}</td>
                        <td className="py-1 pr-3">{formatPct(shotPct(line))}</td>
                        <td className="py-1 pr-3">{line.rushes}</td>
                        <td className="py-1 pr-3">{line.blasts}</td>
                      </>
                    )}
                    <td className="py-1">{line.note}</td>
                  </tr>
                ))}
                {!history.length && player.season.games === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-2 text-[#8fb0c8]">
                      No seasons yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function landingSlot(save: Save, player: { id: string; kind: string; seasonsPlayed: number }, slot?: number) {
  if (slot === undefined) return -1;
  const club = userClub(save);
  if (club && !club.roster[slot] && slotAccepts(player, slot)) return slot;
  return firstOpenSlot(save, player.id, (slot ?? 0) >= 7);
}

function summary(kind: "skater" | "goalie", line: { games: number; goals: number; assists: number; shots: number; rushes: number; blasts: number; wins: number; ga: number; saves: number; pokes: number; shutouts: number }) {
  if (!line.games) return "No games on record.";
  if (kind === "goalie") return `${line.games} GP · ${line.wins} wins · ${line.saves} saves · ${line.ga} GA · ${formatPct(savePct(line))} · ${line.pokes} pokes · ${line.shutouts} shutouts`;
  return `${line.games} GP · ${line.goals} goals · ${line.assists} assists · ${line.shots} shots · ${formatPct(shotPct(line))} · ${line.rushes} rushes · ${line.blasts} blasts`;
}

function skaterRatings(ratings: SkaterRatings) {
  return (
    [
      ["speed", "Speed", ratings.speed],
      ["agility", "Agility", ratings.agility],
      ["shot", "Shot", ratings.shot],
      ["attack", "Attack", ratings.attack],
      ["defense", "Defense", ratings.defense],
      ["handling", "Handling", ratings.handling],
      ["toughness", "Toughness", ratings.toughness],
    ] as const
  ).map(([key, label, value]) => ({ key, label, value }));
}

function goalieRatings(ratings: GoalieRatings) {
  return (
    [
      ["speed", "Speed", ratings.speed],
      ["agility", "Agility", ratings.agility],
      ["iq", "IQ", ratings.iq],
      ["rebound", "Rebound", ratings.rebound],
      ["composure", "Composure", ratings.composure],
      ["poke", "Poke", ratings.poke],
    ] as const
  ).map(([key, label, value]) => ({ key, label, value }));
}
