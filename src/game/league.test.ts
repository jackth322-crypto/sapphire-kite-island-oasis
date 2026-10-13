import assert from "node:assert/strict";
import test from "node:test";
import {
  autoDraft,
  beginSeason,
  canSign,
  continuePhase,
  careerTotals,
  createCareer,
  clubPrestige,
  currentMatch,
  firstOpenSlot,
  freeAgents,
  maxYears,
  payroll,
  playerById,
  quote,
  releasePlayer,
  rosterProblem,
  signPlayer,
  simCurrent,
  standings,
  startNextSeason,
  userClub,
  wornHues,
} from "./league.ts";

test("away colors give way when the primaries match", () => {
  const worn = wornHues(
    { primary: 10, secondary: 200, accent: 300 },
    { primary: 18, secondary: 140, accent: 250 },
  );
  assert.equal(worn.homeHue, 10);
  assert.equal(worn.awayHue, 140);
  assert.equal(worn.awayStrip, "secondary");
  const fallback = wornHues(
    { primary: 10, secondary: 40, accent: 70 },
    { primary: 16, secondary: 24, accent: 220 },
  );
  assert.equal(fallback.awayHue, 220);
  assert.equal(fallback.awayStrip, "accent");
});

test("a career can finish a season and open the next", () => {
  let save = createCareer({ name: "Glass Orbits", tag: "GLS", kit: { primary: 188, secondary: 24, accent: 48 } }, 7);
  const opening = save.season;
  assert.ok(opening >= 9);
  assert.equal(save.clubs.length, 80);
  for (let tier = 0; tier < 8; tier++) assert.equal(save.clubs.filter((c) => c.tier === tier).length, 10);
  const veteran = save.players.find((player) => player.seasonsPlayed > 2);
  assert.ok(veteran);
  assert.equal(veteran.history.length, veteran.seasonsPlayed);
  assert.ok(veteran.history.every((line) => line.games >= 7 && line.year < opening));
  assert.ok(save.clubs.every((club) => hueSpread(club.kit.primary, club.kit.secondary) >= 20));
  assert.ok(meanOverall(save, 7) > meanOverall(save, 0) + 12, "crown should open well above dust");

  const drafted = autoDraft(save, 2);
  assert.equal(rosterProblem(drafted, userClub(drafted).id), null);
  assert.ok(payroll(drafted, userClub(drafted).id) <= userClub(drafted).budget);

  const skaters = freeAgents(save)
    .filter((p) => p.kind === "skater")
    .sort((a, b) => a.overall - b.overall);
  const goalies = freeAgents(save)
    .filter((p) => p.kind === "goalie")
    .sort((a, b) => a.overall - b.overall);
  for (const player of [...skaters.slice(0, 6), goalies[0]]) {
    const slot = firstOpenSlot(save, player.id);
    const years = Math.min(2, maxYears(player));
    assert.equal(canSign(save, player.id, slot, years), null, `${player.name} ${player.overall}`);
    save = signPlayer(save, player.id, slot, years);
  }
  assert.equal(rosterProblem(save, userClub(save).id), null);
  save = beginSeason(save);
  assert.equal(save.phase, "season");
  assert.equal(save.fixtures.filter((f) => f.tier === 0).length, 45);
  const preview = simCurrent(save);
  const boxed = preview.fixtures.find((fixture) => fixture.box && (fixture.homeId === preview.userClubId || fixture.awayId === preview.userClubId));
  assert.ok(boxed?.box);
  const goals = boxed.box.home.reduce((sum, line) => sum + line.goals, 0) + boxed.box.away.reduce((sum, line) => sum + line.goals, 0);
  assert.equal(goals, (boxed.hg ?? 0) + (boxed.ag ?? 0));

  const seen = new Map<string, Set<string>>();
  for (const fixture of save.fixtures.filter((f) => f.tier === 0)) {
    for (const id of [fixture.homeId, fixture.awayId]) {
      const set = seen.get(id) ?? new Set<string>();
      const opp = id === fixture.homeId ? fixture.awayId : fixture.homeId;
      assert.equal(set.has(opp), false);
      set.add(opp);
      seen.set(id, set);
    }
  }
  for (const set of seen.values()) assert.equal(set.size, 9);

  let guard = 0;
  while (save.phase !== "market" && guard < 40) {
    guard += 1;
    save = currentMatch(save) ? simCurrent(save) : continuePhase(save);
  }
  assert.equal(save.phase, "market");
  for (let tier = 0; tier < 8; tier++) assert.equal(standings(save, tier).length, 10);
  for (const club of save.clubs) {
    const line = club.history.find((item) => item.year === opening);
    assert.ok(line, club.name);
    if (club.user) assert.equal(club.history.length, 1);
    else assert.ok(club.history.length > 1, `${club.name} should keep its record`);
  }
  for (let tier = 0; tier < 7; tier++) {
    const played = save.clubs.filter((club) => club.history.some((line) => line.year === opening && line.tier === tier));
    const champ = played.find((club) => club.history.some((line) => line.year === opening && line.tier === tier && line.playoff === "Champion"));
    const champLine = champ?.history.find((line) => line.year === opening && line.tier === tier);
    const doubled = champLine?.finish === 1;
    for (const club of played) {
      const line = club.history.find((item) => item.year === opening && item.tier === tier)!;
      const up = line.finish === 1 || line.playoff === "Champion" || (doubled && line.playoff === "Finalist");
      if (up) assert.equal(club.tier, tier + 1, `${club.name} should rise from ${tier}`);
      if (line.finish >= 9) assert.equal(club.tier, tier === 0 ? 0 : tier - 1, `${club.name} should drop from ${tier}`);
    }
  }
  for (const club of save.clubs) {
    const line = club.history.find((item) => item.year === opening && item.tier === 7 && item.finish >= 9);
    if (line) assert.equal(club.tier, 6, `${club.name} should drop from the Crown`);
  }
  assert.ok(save.clubs.some((club) => club.budgetNote.includes("awards")));
  for (let tier = 0; tier < 8; tier++) {
    const titles = save.players.filter((player) => player.awards.some((award) => award.year === opening && award.tier === tier && award.title === "Scoring title"));
    const masks = save.players.filter((player) => player.awards.some((award) => award.year === opening && award.tier === tier && award.title === "Best goalie"));
    assert.equal(titles.length, 1, `scoring ${tier}`);
    assert.equal(masks.length, 1, `goalie ${tier}`);
  }
  const skaterLine = save.players.find((player) => player.kind === "skater" && player.history.some((line) => line.year === opening && line.shots > 0));
  assert.ok(skaterLine);
  const line = skaterLine.history.find((item) => item.year === opening)!;
  assert.ok(line.shots >= Math.max(0, line.goals - line.rushes));

  let safety = 0;
  while (rosterProblem(save, userClub(save).id) && safety < 12) {
    safety += 1;
    const problem = rosterProblem(save, userClub(save).id) ?? "";
    if (problem.includes("Payroll")) {
      const worst = userClub(save)
        .roster.map((id) => playerById(save, id))
        .filter((p) => p && p.kind === "skater")
        .sort((a, b) => a!.overall - b!.overall)[0];
      assert.ok(worst);
      save = releasePlayer(save, worst!.id);
      continue;
    }
    const slot = userClub(save).roster.findIndex((id) => !id);
    const kind = slot === 3 ? "goalie" : "skater";
    const pick = freeAgents(save)
      .filter((p) => p.kind === kind)
      .sort((a, b) => a.overall - b.overall)[0];
    assert.ok(pick, problem);
    const years = Math.min(1, maxYears(pick));
    assert.equal(canSign(save, pick.id, slot, years), null, problem);
    save = signPlayer(save, pick.id, slot, years);
  }
  assert.equal(rosterProblem(save, userClub(save).id), null);
  save = startNextSeason(save);
  assert.equal(save.season, opening + 1);
  assert.equal(save.phase, "season");
  assert.ok(meanOverall(save, 7) > meanOverall(save, 0) + 8, "crown should stay ahead of dust");
  assert.equal(save.clubs.filter((c) => c.tier === userClub(save).tier).length, 10);
  const played = save.players.find((player) => player.season.games > 0 || player.history.some((line) => line.year === opening));
  assert.ok(played);
});

test("prestige follows the league, and a quote stays near the asking price", () => {
  const save = createCareer({ name: "Glass Orbits", tag: "GLS", kit: { primary: 188, secondary: 24, accent: 48 } }, 11);
  const dust = clubPrestige(save, save.userClubId);
  const crown = save.clubs.filter((club) => club.tier === 7).map((club) => clubPrestige(save, club.id));
  assert.ok(crown.every((score) => score > dust + 25));
  assert.equal(userClub(save).history.length, 0);
  assert.ok(dust <= 8, `user prestige ${dust}`);
  for (let tier = 0; tier < 8; tier++) {
    const mates = save.clubs.filter((club) => club.tier === tier && !club.user).map((club) => clubPrestige(save, club.id));
    const spread = Math.max(...mates) - Math.min(...mates);
    assert.ok(spread >= 6, `tier ${tier} prestige spread ${spread}`);
    if (tier === 0) assert.ok(dust <= Math.min(...mates));
  }
  const me = userClub(save);
  for (const player of freeAgents(save)) {
    const offer = quote(save, player.id);
    assert.ok(offer);
    assert.ok(Math.abs(offer.adjust) <= 0.18001);
    const base = Math.max(4, Math.round(offer.demand * (1 + offer.adjust)));
    assert.equal(offer.wage, Math.max(4, Math.round(base * offer.factor)));
    const one = quote(save, player.id, 1);
    const five = quote(save, player.id, 5);
    assert.ok(one && five);
    assert.ok(one.wage >= offer.wage);
    assert.ok(player.potential);
    for (const key of Object.keys(player.ratings)) {
      const now = (player.ratings as Record<string, number>)[key];
      const cap = (player.potential as Record<string, number>)[key];
      assert.ok(cap >= now);
    }
  }
  const player = freeAgents(save)[0];
  const original = player.planet;
  player.planet = me.planet;
  const home = quote(save, player.id)!.wage;
  player.planet = "Nowhere";
  const away = quote(save, player.id)!.wage;
  player.planet = original;
  assert.ok(home <= away);
  for (const club of save.clubs) {
    if (club.user) continue;
    const at = (index: number) => playerById(save, club.roster[index]);
    const starters = [0, 1, 2].map(at);
    const subs = [4, 5, 6].map(at);
    assert.ok(starters.every((player) => player?.kind === "skater"));
    assert.ok(subs.every((player) => player?.kind === "skater"));
    const sAvg = starters.reduce((sum, player) => sum + player!.overall, 0) / 3;
    const bAvg = subs.reduce((sum, player) => sum + player!.overall, 0) / 3;
    assert.ok(sAvg >= bAvg + 6, `${club.name} starters ${sAvg.toFixed(1)} subs ${bAvg.toFixed(1)}`);
    assert.ok(sAvg - bAvg < 32, `${club.name} bench fell off too far`);
    assert.ok(Math.min(...starters.map((player) => player!.overall)) >= Math.max(...subs.map((player) => player!.overall)));
  }
});

test("a player signed this window can be released without a buyout", () => {
  let save = createCareer({ name: "Glass Orbits", tag: "GLS", kit: { primary: 188, secondary: 24, accent: 48 } }, 3);
  const pick = freeAgents(save)
    .filter((player) => player.kind === "skater")
    .sort((a, b) => a.overall - b.overall)[0];
  const slot = firstOpenSlot(save, pick.id);
  save = signPlayer(save, pick.id, slot, 2);
  const drafted = userClub(save).budget;
  save = releasePlayer(save, pick.id);
  assert.equal(userClub(save).budget, drafted);
  assert.equal(userClub(save).roster.includes(pick.id), false);

  save = signPlayer(save, pick.id, slot, 2);
  save.phase = "market";
  const fresh = userClub(save).budget;
  save = releasePlayer(save, pick.id);
  assert.equal(userClub(save).budget, fresh);

  save = signPlayer(save, pick.id, slot, 2);
  save.phase = "market";
  const deal = save.contracts.find((contract) => contract.playerId === pick.id);
  assert.ok(deal);
  deal.signedInWindow = false;
  const wage = deal.wage;
  const held = userClub(save).budget;
  save = releasePlayer(save, pick.id);
  assert.equal(userClub(save).budget, held - Math.round(wage * 0.5));
  assert.equal(userClub(save).roster.includes(pick.id), false);
});

function meanOverall(save: ReturnType<typeof createCareer>, tier: number) {
  const players = save.clubs
    .filter((club) => club.tier === tier)
    .flatMap((club) => club.roster.map((id) => (id ? playerById(save, id) : null)).filter((player) => !!player));
  return players.reduce((sum, player) => sum + player.overall, 0) / Math.max(1, players.length);
}

function hueSpread(a: number, b: number) {
  const gap = Math.abs(a - b) % 360;
  return Math.min(gap, 360 - gap);
}
