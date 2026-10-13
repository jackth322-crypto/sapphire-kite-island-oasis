import { useState } from "react";
import { TeamLeaders, statLine } from "@/components/MatchViews";
import { PlayerMark } from "@/components/PlayerMark";
import { TeamLogo } from "@/components/TeamLogo";
import {
  clubById,
  clubGrades,
  clubPrestige,
  formatPct,
  leaderboard,
  leagueName,
  playerById,
  savePct,
  shotPct,
  standings,
  type LeaderRow,
  type Save,
  type SeasonForm,
} from "@/game/league";

type Board = "leaders" | "career" | "teams";
type Kind = "skater" | "goalie";

export function StatsBook({ save, onOpen }: { save: Save; onOpen: (id: string) => void }) {
  const [board, setBoard] = useState<Board>("leaders");
  const [tier, setTier] = useState<number | null>(userTier(save));
  const [kind, setKind] = useState<Kind>("skater");
  const [pool, setPool] = useState<"active" | "all">("active");
  const [sort, setSort] = useState("goals");
  const [clubId, setClubId] = useState<string | null>(null);
  const rows = leaderboard(save, { kind, scope: board === "career" ? "career" : "season", tier, pool });
  const key = board === "leaders" ? (kind === "skater" ? "goals" : "ga") : sort;
  const activeSort = board === "leaders" ? sort || key : sort;
  const ordered = [...rows].sort((a, b) => compare(a, b, activeSort, kind));

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["leaders", "Leaders"],
            ["career", "All-time"],
            ["teams", "Teams"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setBoard(id);
              setClubId(null);
              setSort(id === "leaders" || id === "career" ? (kind === "goalie" ? "ga" : "goals") : sort);
            }}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${board === id ? "bg-[#ffe36b] text-[#1a1404]" : "border border-white/15 text-[#d5e8ff]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto">
        <Chip on={tier === null} onClick={() => setTier(null)}>
          Universe
        </Chip>
        {Array.from({ length: 8 }, (_, index) => (
          <Chip key={index} on={tier === index} onClick={() => setTier(index)}>
            {leagueName(index).replace(" League", "")}
          </Chip>
        ))}
      </div>
      {board === "teams" ? (
        clubId ? (
          <TeamDossier save={save} clubId={clubId} onBack={() => setClubId(null)} onOpen={onOpen} />
        ) : (
          <TeamList save={save} tier={tier} onOpen={setClubId} />
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip on={kind === "skater"} onClick={() => { setKind("skater"); setSort("goals"); }}>
              Skaters
            </Chip>
            <Chip on={kind === "goalie"} onClick={() => { setKind("goalie"); setSort("ga"); }}>
              Goalies
            </Chip>
            {board === "career" ? (
              <>
                <Chip on={pool === "active"} onClick={() => setPool("active")}>
                  Active
                </Chip>
                <Chip on={pool === "all"} onClick={() => setPool("all")}>
                  All players
                </Chip>
              </>
            ) : (
              <p className="text-[11px] text-[#8fb0c8]">{save.phase === "sign" ? "No season has been played yet." : "This season"}</p>
            )}
          </div>
          <LeaderTable save={save} kind={kind} rows={ordered} sort={activeSort} onSort={setSort} onOpen={onOpen} />
        </>
      )}
    </div>
  );
}

function LeaderTable({
  save,
  kind,
  rows,
  sort,
  onSort,
  onOpen,
}: {
  save: Save;
  kind: Kind;
  rows: LeaderRow[];
  sort: string;
  onSort: (key: string) => void;
  onOpen: (id: string) => void;
}) {
  const columns = kind === "skater"
    ? [
        ["goals", "G"],
        ["assists", "A"],
        ["shots", "S"],
        ["shot", "SH%"],
        ["rushes", "RSH"],
        ["blasts", "BL"],
      ]
    : [
        ["saves", "SV"],
        ["ga", "GA"],
        ["save", "SV%"],
        ["pokes", "PK"],
        ["wins", "W"],
        ["shutouts", "SO"],
      ];
  if (!rows.length) return <p className="text-sm text-[#9eb6cc]">Nobody has a line here yet.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-max min-w-full text-left text-sm whitespace-nowrap text-[#d5e8ff]">
        <thead className="bg-[#10192a] text-[11px] tracking-wide text-[#8fb0c8]">
          <tr>
            <th className="px-3 py-2 font-semibold">Player</th>
            {columns.map(([key, label]) => (
              <th key={key} className="px-2 py-2 font-semibold">
                <button type="button" onClick={() => onSort(key)} className={sort === key ? "text-white" : ""}>
                  {label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const player = playerById(save, row.id);
            const kit = save.clubs.find((club) => club.name === row.club)?.kit ?? null;
            return (
            <tr key={row.id} className="border-t border-white/5 odd:bg-[#0c1424]">
              <td className="px-3 py-2">
                <button type="button" onClick={() => onOpen(row.id)} className="flex items-center gap-2 text-left">
                  <PlayerMark name={row.name} kit={kit} hue={player?.hue} size={26} />
                  <span>
                    <span className="block font-semibold text-white">{row.name}{row.retired ? " · ret" : ""}</span>
                    <span className="block text-[11px] text-[#8fb0c8]">{row.club} · {row.form.games} GP</span>
                  </span>
                </button>
              </td>
              {columns.map(([key]) => (
                <td key={key} className="px-2 py-2">{cell(row.form, key)}</td>
              ))}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TeamList({ save, tier, onOpen }: { save: Save; tier: number | null; onOpen: (id: string) => void }) {
  const clubs = (tier === null ? save.clubs : save.clubs.filter((club) => club.tier === tier)).slice().sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name));
  return (
    <div className="grid gap-1.5">
      {clubs.map((club) => {
        const live = save.phase !== "sign" && save.phase !== "market";
        const blasts = club.history.reduce((sum, year) => sum + year.blastoffs, 0) + (live ? club.blastoffs : 0);
        const gf = club.history.reduce((sum, year) => sum + year.gf, 0) + (live ? club.gf : 0);
        const grades = clubGrades(save, club.id);
        return (
          <button key={club.id} type="button" onClick={() => onOpen(club.id)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0c1424] px-3 py-2 text-left">
            <TeamLogo kit={club.kit} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-white">{club.name}</span>
              <span className="block text-[11px] text-[#8fb0c8]">
                {leagueName(club.tier)}
                {grades ? ` · ${grades.offense} off · ${grades.defense} def · ${grades.iq} iq` : ""}
              </span>
              <span className="block text-[11px] text-[#9eb6cc]">{gf} GF · {blasts} blastoffs</span>
            </span>
            <span className="text-right">
              <span className="block text-[10px] font-semibold tracking-wide text-[#8fb0c8]">OVR · PST</span>
              <span className="block text-xl font-black leading-none text-[#ffe36b]">
                {grades ? grades.overall : "—"}
                <span className="ml-1 text-sm text-[#d7c6ff]">{clubPrestige(save, club.id)}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TeamDossier({ save, clubId, onBack, onOpen }: { save: Save; clubId: string; onBack: () => void; onOpen: (id: string) => void }) {
  const club = clubById(save, clubId);
  if (!club) return null;
  const grades = clubGrades(save, club.id);
  const live = save.phase !== "sign" && save.phase !== "market";
  const place = live ? standings(save, club.tier).findIndex((row) => row.id === club.id) + 1 : 0;
  const history = [...club.history].reverse();
  return (
    <section className="glass rounded-2xl p-3">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-[#8fd4ff]">
        All teams
      </button>
      <div className="mt-2 flex items-center gap-3">
        <TeamLogo kit={club.kit} size={48} />
        <div>
          <h2 className="text-xl font-black text-white">{club.name}</h2>
          <p className="text-xs text-[#8fb0c8]">{club.tag} · {leagueName(club.tier)}</p>
        </div>
      </div>
      {grades ? (
        <div className="mt-3">
          <TeamRating overall={grades.overall} offense={grades.offense} defense={grades.defense} iq={grades.iq} prestige={clubPrestige(save, club.id)} />
        </div>
      ) : (
        <p className="mt-3 text-xs text-[#8fb0c8]">No rating until the roster is filled.</p>
      )}
      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-[#8fb0c8]">LEADERS</p>
        <TeamLeaders save={save} clubId={club.id} onOpen={onOpen} />
      </div>
      <div className="mt-3 grid gap-2">
        {live ? (
          <YearCard
            year={String(save.season)}
            league={leagueName(club.tier).replace(" League", "")}
            record={`${club.wins}-${club.losses}`}
            finish={place ? String(place) : "—"}
            gf={club.gf}
            ga={club.ga}
            blastoffs={club.blastoffs}
            playoff="In progress"
            universe="—"
            offense={grades?.offense ?? 0}
            defense={grades?.defense ?? 0}
            iq={grades?.iq ?? 0}
            overall={grades?.overall ?? 0}
          />
        ) : null}
        {history.map((year) => (
          <YearCard
            key={`${year.year}-${year.tier}`}
            year={String(year.year)}
            league={leagueName(year.tier).replace(" League", "")}
            record={`${year.wins}-${year.losses}`}
            finish={String(year.finish)}
            gf={year.gf}
            ga={year.ga}
            blastoffs={year.blastoffs}
            playoff={year.playoff}
            universe={year.universe}
            offense={year.offense}
            defense={year.defense}
            iq={year.iq}
            overall={Math.round((year.offense + year.defense + year.iq) / 3)}
          />
        ))}
      </div>
      <div className="mt-3 grid gap-1">
        {club.roster.map((id) => {
          const player = id ? playerById(save, id) : null;
          if (!player) return null;
          return (
            <button key={id} type="button" onClick={() => onOpen(player.id)} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-sm text-white hover:bg-white/5">
              <PlayerMark name={player.name} kit={club.kit} size={24} />
              <span className="min-w-0 flex-1 truncate">{player.name}</span>
              <span className="shrink-0 text-[11px] text-[#9eb6cc]">{statLine(player)}</span>
              <span className="w-7 text-right font-black text-[#ffe36b]">{player.overall}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function YearCard({
  year,
  league,
  record,
  finish,
  gf,
  ga,
  blastoffs,
  playoff,
  universe,
  offense,
  defense,
  iq,
  overall,
}: {
  year: string;
  league: string;
  record: string;
  finish: string;
  gf: number;
  ga: number;
  blastoffs: number;
  playoff: string;
  universe: string;
  offense: number;
  defense: number;
  iq: number;
  overall: number;
}) {
  const cells = [
    ["Record", record],
    ["Finish", finish],
    ["GF", String(gf)],
    ["GA", String(ga)],
    ["Blastoffs", String(blastoffs)],
    ["Tournament", playoff],
    ["Universe", universe],
    ["OVR", String(overall)],
    ["Off", String(offense)],
    ["Def", String(defense)],
    ["IQ", String(iq)],
  ];
  return (
    <article className="rounded-xl border border-white/10 bg-[#10192a] px-3 py-2">
      <p className="text-sm font-bold text-white">
        Year {year} <span className="font-semibold text-[#8fb0c8]">· {league}</span>
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-5">
        {cells.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] tracking-wide text-[#8fb0c8]">{label}</dt>
            <dd className="text-sm text-[#d5e8ff]">{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function TeamRating({ overall, offense, defense, iq, prestige }: { overall: number; offense: number; defense: number; iq: number; prestige?: number }) {
  return (
    <div className="flex items-end gap-3">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.14em] text-[#8fb0c8]">OVR</p>
        <p className="text-2xl font-black leading-none text-[#ffe36b]">{overall}</p>
      </div>
      {typeof prestige === "number" ? (
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#8fb0c8]">PST</p>
          <p className="text-2xl font-black leading-none text-[#d7c6ff]">{prestige}</p>
        </div>
      ) : null}
      <div className="grid flex-1 grid-cols-3 gap-2">
        <Meter label="Off" value={offense} />
        <Meter label="Def" value={defense} />
        <Meter label="IQ" value={iq} />
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] text-[#8fb0c8]">{label} {value}</p>
      <div className="mt-1 h-1.5 rounded-full bg-white/10">
        <div className="h-1.5 rounded-full bg-[#8fd4ff]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${on ? "bg-white/15 text-white" : "text-[#8fb0c8]"}`}>
      {children}
    </button>
  );
}

function cell(form: SeasonForm, key: string) {
  if (key === "shot") return formatPct(shotPct(form));
  if (key === "save") return formatPct(savePct(form));
  return String(form[key as keyof SeasonForm] ?? "");
}

function compare(a: LeaderRow, b: LeaderRow, key: string, kind: Kind) {
  const av = valueOf(a.form, key);
  const bv = valueOf(b.form, key);
  const low = key === "ga";
  if (av !== bv) return low ? av - bv : bv - av;
  if (kind === "skater" && a.form.goals !== b.form.goals) return b.form.goals - a.form.goals;
  return a.name.localeCompare(b.name);
}

function valueOf(form: SeasonForm, key: string) {
  if (key === "shot") return shotPct(form) ?? -1;
  if (key === "save") return savePct(form) ?? -1;
  const raw = form[key as keyof SeasonForm];
  return typeof raw === "number" ? raw : 0;
}

function userTier(save: Save) {
  return save.clubs.find((club) => club.id === save.userClubId)?.tier ?? 0;
}
