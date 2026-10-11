import { TeamLogo } from "@/components/TeamLogo";
import {
  careerTotals,
  clubForPlayer,
  contractFor,
  formatPct,
  leagueName,
  maxYears,
  playerById,
  quote,
  savePct,
  shotPct,
  type Save,
} from "@/game/league";
import { PERK_LABEL, kitColor, type GoalieRatings, type SkaterRatings } from "@/game/roster";

export function PlayerPage({
  save,
  playerId,
  market,
  years,
  signError,
  onYears,
  onClose,
  onSign,
  onRelease,
}: {
  save: Save;
  playerId: string;
  market: boolean;
  years: number;
  signError: string;
  onYears: (years: number) => void;
  onClose: () => void;
  onSign: () => void;
  onRelease: () => void;
}) {
  const player = playerById(save, playerId);
  if (!player) return null;
  const club = clubForPlayer(save, player.id);
  const deal = contractFor(save, player.id);
  const totals = careerTotals(player);
  const mine = club?.id === save.userClubId;
  const offer = !deal && market ? quote(save, player.id) : null;
  const cap = maxYears(player);
  const term = Math.min(years, cap);
  const ratings = player.kind === "skater" ? skaterRatings(player.ratings) : goalieRatings(player.ratings);
  const history = [...player.history].reverse();
  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-[#070b18] px-3 py-4">
      <div className="mx-auto w-full max-w-2xl">
        <button type="button" onClick={onClose} className="mb-3 text-sm font-semibold text-[#8fd4ff]">
          Back
        </button>
        <div className="rounded-2xl border border-white/10 bg-[#0c1424] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#8fd4ff]">
                {player.kind === "goalie" ? "GOALIE" : "SKATER"} · YEAR {player.seasonsPlayed + 1}
              </p>
              <h2 className="text-3xl font-black text-white">{player.name}</h2>
              {player.retired ? <p className="text-xs font-semibold tracking-wide text-[#ffb4c4]">RETIRED</p> : null}
              <p className="mt-1 text-sm text-[#9eb6cc]">
                {club ? club.name : "Free agent"}
                {deal ? ` · ${deal.wage} cr · ${deal.seasonsLeft} season${deal.seasonsLeft === 1 ? "" : "s"} left` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-[#ffe36b]">{player.overall}</p>
              {club ? <TeamLogo kit={club.kit} size={48} /> : null}
            </div>
          </div>
          {player.awards.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {player.awards.map((award) => (
                <li key={`${award.year}-${award.title}`} className="rounded-full border border-[#ffe36b]/40 bg-[#2a2412] px-2.5 py-1 text-[11px] font-semibold text-[#ffe36b]">
                  Year {award.year} · {leagueName(award.tier)} · {award.title}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
            <Radar rows={ratings} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {ratings.map((stat) => (
                <div key={stat.label}>
                  <div className="mb-1 flex justify-between text-[11px] text-[#9eb6cc]">
                    <span>{stat.label}</span>
                    <span>{stat.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div className="h-1.5 rounded-full" style={{ width: `${(stat.value / 11) * 100}%`, background: kitColor(player.hue, 70, 62) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-[#8fd4ff]">
            {player.perks.length ? player.perks.map((perk) => PERK_LABEL[perk]).join(" · ") : "No perk"}
            {" · "}
            {styleLine(player)}
          </p>
          {market ? (
            <div className="mt-4">
              {!deal && offer ? (
                <>
                  <p className="text-sm text-[#d5e8ff]">
                    {offer.wage} cr a season
                    {offer.bidder ? `. ${offer.bidder} is bidding, so you pay one more.` : ". No other club is bidding."}
                  </p>
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3].map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        disabled={choice > cap}
                        onClick={() => onYears(choice)}
                        className={`rounded-full px-2.5 py-1 text-xs font-bold disabled:opacity-30 ${term === choice ? "bg-[#ffe36b] text-[#1a1404]" : "border border-white/15 text-[#d5e8ff]"}`}
                      >
                        {choice}y
                      </button>
                    ))}
                  </div>
                  {signError ? <p className="mt-2 text-xs text-[#ffb4c4]">{signError}</p> : null}
                  <button type="button" onClick={onSign} className="mt-3 rounded-full bg-[#ffe36b] px-4 py-2 text-sm font-bold text-[#1a1404]">
                    Sign for {term} season{term === 1 ? "" : "s"}
                  </button>
                </>
              ) : null}
              {mine ? (
                <button type="button" onClick={onRelease} className="rounded-full border border-[#ffb4c4]/40 px-4 py-2 text-sm font-semibold text-[#ffb4c4]">
                  Release
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <section className="mt-3 rounded-2xl border border-white/10 bg-[#0c1424] p-4">
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

function summary(kind: "skater" | "goalie", line: { games: number; goals: number; assists: number; shots: number; rushes: number; blasts: number; wins: number; ga: number; saves: number; pokes: number; shutouts: number }) {
  if (!line.games) return "No games on record.";
  if (kind === "goalie") return `${line.games} GP · ${line.wins} wins · ${line.saves} saves · ${line.ga} GA · ${formatPct(savePct(line))} · ${line.pokes} pokes · ${line.shutouts} shutouts`;
  return `${line.games} GP · ${line.goals} goals · ${line.assists} assists · ${line.shots} shots · ${formatPct(shotPct(line))} · ${line.rushes} rushes · ${line.blasts} blasts`;
}

function skaterRatings(ratings: SkaterRatings) {
  return [
    ["Speed", ratings.speed],
    ["Agility", ratings.agility],
    ["Shot", ratings.shot],
    ["Attack", ratings.attack],
    ["Defense", ratings.defense],
    ["Handling", ratings.handling],
    ["Toughness", ratings.toughness],
  ].map(([label, value]) => ({ label: String(label), value: Number(value) }));
}

function goalieRatings(ratings: GoalieRatings) {
  return [
    ["Speed", ratings.speed],
    ["Agility", ratings.agility],
    ["IQ", ratings.iq],
    ["Rebound", ratings.rebound],
    ["Composure", ratings.composure],
    ["Poke", ratings.poke],
  ].map(([label, value]) => ({ label: String(label), value: Number(value) }));
}

function Radar({ rows }: { rows: { label: string; value: number }[] }) {
  const n = rows.length;
  const cx = 100;
  const cy = 96;
  const radius = 62;
  const point = (index: number, scale: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / n;
    return [cx + Math.cos(angle) * radius * scale, cy + Math.sin(angle) * radius * scale];
  };
  const poly = (scale: number) => rows.map((_, index) => point(index, scale).join(",")).join(" ");
  const shape = rows.map((row, index) => point(index, row.value / 11).join(",")).join(" ");
  return (
    <svg viewBox="0 0 200 192" className="mx-auto h-44 w-full max-w-[220px]" aria-hidden="true">
      {[0.35, 0.7, 1].map((ring) => (
        <polygon key={ring} points={poly(ring)} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
      ))}
      {rows.map((row, index) => {
        const [x, y] = point(index, 1);
        const [lx, ly] = point(index, 1.28);
        return (
          <g key={row.label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#9eb6cc" fontSize="9">
              {short(row.label)}
            </text>
          </g>
        );
      })}
      <polygon points={shape} fill="rgba(255,227,107,0.35)" stroke="#ffe36b" strokeWidth="1.5" />
    </svg>
  );
}

function short(label: string) {
  if (label === "Speed") return "Spd";
  if (label === "Agility") return "Agi";
  if (label === "Attack") return "Atk";
  if (label === "Defense") return "Def";
  if (label === "Handling") return "Hnd";
  if (label === "Toughness") return "Tgh";
  if (label === "Rebound") return "Reb";
  if (label === "Composure") return "Cmp";
  return label;
}
function styleLine(player: { styles: { aggressive: number; shooter: number; wide: number; physical: number } }) {
  const end = (lo: string, hi: string, n: number) => (n < 40 ? lo : n > 60 ? hi : "Mix");
  const s = player.styles;
  return `${end("Def", "Agg", s.aggressive)} · ${end("Create", "Shoot", s.shooter)} · ${end("Direct", "Wide", s.wide)} · ${end("Smooth", "Physical", s.physical)}`;
}
