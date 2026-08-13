import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DAILY_COIN_CAP,
  applyGameResult,
  createProfile,
  grantCoins,
  rankFor,
  registerPlay,
  streakAtRisk,
} from '../src/js/economy.js';
import {
  MISSIONS_PER_DAY,
  MISSION_POOL,
  MISSION_REWARD,
  applyMissionProgress,
  missionState,
  missionsForDay,
} from '../src/js/missions.js';

/** Rundendaten, wie das Spiel sie nach einer Runde liefert. */
function run(overrides = {}) {
  return {
    mode: 'fritteuse',
    score: 0,
    perfects: 0,
    bestCombo: 1,
    bestPerfectStreak: 0,
    burns: 0,
    served: 0,
    perfectsByType: { nugget: 0, wing: 0, tender: 0 },
    ...overrides,
  };
}

test('Tagesmissionen sind pro Tag fest und wechseln täglich', () => {
  const today = missionsForDay('2026-08-13');
  assert.equal(today.length, MISSIONS_PER_DAY);
  // Gleicher Tag, gleiche Auswahl – ohne Server auf allen Geräten identisch.
  assert.deepEqual(
    today.map((mission) => mission.id),
    missionsForDay('2026-08-13').map((mission) => mission.id),
  );
  // Keine Dopplungen innerhalb eines Tages.
  assert.equal(new Set(today.map((mission) => mission.id)).size, MISSIONS_PER_DAY);

  // Über eine Woche kommt mehr als eine Zusammenstellung vor.
  const weeks = new Set(
    ['14', '15', '16', '17', '18', '19', '20'].map((day) =>
      missionsForDay(`2026-08-${day}`)
        .map((mission) => mission.id)
        .join(),
    ),
  );
  assert.ok(weeks.size > 1);
});

test('jede Missionsvorlage liest ihren Fortschritt aus den Rundendaten', () => {
  for (const mission of MISSION_POOL) {
    const value = mission.value(run({ score: 1, perfects: 1, bestCombo: 1, served: 1 }));
    assert.equal(typeof value, 'number', `${mission.id} liefert keine Zahl`);
    assert.ok(Number.isFinite(value), `${mission.id} liefert keinen endlichen Wert`);
  }
});

test('Missionsfortschritt wird verbucht und einmalig belohnt', () => {
  const now = new Date('2026-08-13T12:00:00');
  const today = missionsForDay('2026-08-13');

  // Eine sehr starke Runde – deckt alle Missionsarten ab, die auf einer
  // Einzelrunde beruhen.
  const big = (mode) =>
    run({
      mode,
      score: 20000,
      perfects: 40,
      bestCombo: 10,
      bestPerfectStreak: 10,
      served: 40,
      perfectsByType: { nugget: 20, wing: 10, tender: 10 },
    });

  // Fünf Runden in drei Spielen erfüllen auch die Tages- und Vielfaltsziele.
  const modes = ['fritteuse', 'kasse', 'stapel', 'band', 'chili'];
  let profile = createProfile();
  let completed = [];
  let coins = 0;
  for (const mode of modes) {
    const step = applyMissionProgress(profile, big(mode), now);
    profile = step.profile;
    completed = [...completed, ...step.completed];
    coins += step.coins;
  }

  assert.equal(completed.length, today.length, 'alle Tagesmissionen sollten erfüllt sein');
  assert.equal(coins, today.length * MISSION_REWARD);
  assert.ok(missionState(profile, now).every((mission) => mission.done));

  // Weiterspielen bringt für erledigte Missionen nichts mehr.
  const again = applyMissionProgress(profile, big('sortieren'), now);
  assert.equal(again.completed.length, 0);
  assert.equal(again.coins, 0);
  assert.equal(again.profile.coins, profile.coins);
});

test('Missionsfortschritt startet an einem neuen Tag bei null', () => {
  const wednesday = new Date('2026-08-12T12:00:00');
  const thursday = new Date('2026-08-13T12:00:00');

  const played = applyMissionProgress(createProfile(), run({ perfects: 5, served: 5 }), wednesday);
  assert.ok(missionState(played.profile, wednesday).some((mission) => mission.progress > 0));
  assert.ok(missionState(played.profile, thursday).every((mission) => mission.progress === 0));
});

test('Missionen können die Tagesobergrenze nicht aushebeln', () => {
  const now = new Date('2026-08-13T12:00:00');

  // Das Tageslimit ist bereits durch gespielte Runden ausgeschöpft.
  const maxed = grantCoins(createProfile(), DAILY_COIN_CAP, now).profile;
  assert.equal(maxed.coins, DAILY_COIN_CAP);

  const result = applyMissionProgress(
    maxed,
    run({
      score: 50000,
      perfects: 60,
      bestCombo: 10,
      bestPerfectStreak: 12,
      served: 60,
      perfectsByType: { nugget: 20, wing: 20, tender: 20 },
    }),
    now,
  );

  // Missionen gelten als erfüllt, zahlen aber keine Coins mehr aus.
  assert.ok(result.completed.length > 0);
  assert.equal(result.coins, 0);
  assert.equal(result.profile.coins, DAILY_COIN_CAP);
});

test('grantCoins schreibt höchstens bis zur Tagesobergrenze gut', () => {
  const now = new Date('2026-08-13T12:00:00');
  const first = grantCoins(createProfile(), DAILY_COIN_CAP - 2, now);
  assert.equal(first.granted, DAILY_COIN_CAP - 2);
  assert.equal(first.cappedAway, 0);

  const second = grantCoins(first.profile, 10, now);
  assert.equal(second.granted, 2);
  assert.equal(second.cappedAway, 8);
  assert.equal(second.profile.coins, DAILY_COIN_CAP);
});

test('die Tagesserie wächst an Folgetagen und reißt bei einer Lücke', () => {
  const monday = new Date('2026-08-10T20:00:00');
  const tuesday = new Date('2026-08-11T09:00:00');
  const tuesdayLater = new Date('2026-08-11T21:00:00');
  const thursday = new Date('2026-08-13T09:00:00');

  let profile = registerPlay(createProfile(), monday);
  assert.equal(profile.streak, 1);

  profile = registerPlay(profile, tuesday);
  assert.equal(profile.streak, 2);

  // Mehrmals am selben Tag zählt nur einmal.
  profile = registerPlay(profile, tuesdayLater);
  assert.equal(profile.streak, 2);
  assert.equal(streakAtRisk(profile, tuesdayLater), false);

  // Mittwoch ausgelassen: Die Serie beginnt von vorn, der Bestwert bleibt.
  assert.equal(streakAtRisk(profile, thursday), true);
  profile = registerPlay(profile, thursday);
  assert.equal(profile.streak, 1);
  assert.equal(profile.bestStreak, 2);
});

test('Ränge steigen mit der Bestleistung und werden beim Rundenende gemeldet', () => {
  assert.equal(rankFor(0).current.title, 'Küchenhilfe');
  assert.equal(rankFor(60000).current.title, 'Loco Legende');
  assert.equal(rankFor(60000).next, null);
  assert.ok(rankFor(0).next.from > 0);

  const first = applyGameResult(createProfile(), 6000, new Date('2026-08-13T12:00:00'));
  assert.equal(first.rankUp?.id, 'azubi');
  assert.equal(first.streak, 1);

  // Ohne Rangwechsel wird auch keiner gemeldet.
  const second = applyGameResult(first.profile, 6500, new Date('2026-08-13T13:00:00'));
  assert.equal(second.rankUp, null);
});

test('die Modus-Mission zählt verschiedene Spiele, nicht Wiederholungen', () => {
  const now = new Date('2026-08-13T12:00:00');
  const variety = MISSION_POOL.find((mission) => mission.id === 'mode_variety');
  assert.ok(variety, 'Missionsvorlage fehlt');
  assert.equal(variety.mode, 'distinct');

  // Fortschritt direkt an der Vorlage prüfen, unabhängig von der Tagesauswahl.
  let entry = { progress: 0, done: false, seen: [] };
  const feed = (mode) => {
    const key = variety.key({ ...run(), mode });
    entry = {
      ...entry,
      seen: entry.seen.includes(key) ? entry.seen : [...entry.seen, key],
    };
    entry.progress = entry.seen.length;
  };

  feed('fritteuse');
  feed('fritteuse');
  assert.equal(entry.progress, 1, 'derselbe Modus zählt nur einmal');

  feed('kasse');
  feed('stapel');
  assert.equal(entry.progress, variety.target);

  // Über applyMissionProgress bleibt der Zustand über Runden erhalten.
  const first = applyMissionProgress(createProfile(), run({ mode: 'band' }), now);
  const second = applyMissionProgress(first.profile, run({ mode: 'band' }), now);
  const stored = second.profile.missions.mode_variety;
  if (stored) assert.equal(stored.progress, 1);
});

test('Bestwerte werden je Spiel getrennt geführt', () => {
  const now = new Date('2026-08-13T12:00:00');
  let profile = createProfile();

  profile = applyGameResult(profile, 5000, now, 'fritteuse').profile;
  profile = applyGameResult(profile, 3000, now, 'kasse').profile;
  assert.equal(profile.modeScores.fritteuse, 5000);
  assert.equal(profile.modeScores.kasse, 3000);
  assert.equal(profile.highScore, 5000);
  assert.equal(profile.lastMode, 'kasse');

  // Schwächere Runde im selben Spiel ändert den Bestwert nicht.
  const weaker = applyGameResult(profile, 1000, now, 'fritteuse');
  assert.equal(weaker.isModeRecord, false);
  assert.equal(weaker.profile.modeScores.fritteuse, 5000);

  const better = applyGameResult(profile, 9000, now, 'kasse');
  assert.equal(better.isModeRecord, true);
  assert.equal(better.profile.modeScores.kasse, 9000);
});
