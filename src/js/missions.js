/**
 * Tagesmissionen.
 *
 * Drei Aufgaben pro Tag, für alle Gäste dieselben – das macht sie
 * besprechbar ("hast du die Serie-Mission heute geschafft?") und gibt jedem
 * Tag ein eigenes Ziel, unabhängig vom Punktestand.
 *
 * Wirtschaftlich sind sie folgenlos: Die Belohnung läuft über `grantCoins`
 * und damit gegen dieselbe Tagesobergrenze wie erspielte Coins. Missionen
 * verschieben also nur, *wie* man das Tageskontingent erreicht – sie erhöhen
 * es nicht.
 *
 * Wie economy.js frei von Browser-APIs, damit es unter Node testbar bleibt.
 */

import { dayKey, grantCoins } from './economy.js';

/** Coins je erfüllter Mission (innerhalb der Tagesobergrenze). */
export const MISSION_REWARD = 3;

/** Anzahl der Missionen pro Tag. */
export const MISSIONS_PER_DAY = 3;

/**
 * Missionsvorlagen.
 * `mode: 'best'` wertet die beste Einzelrunde, `mode: 'sum'` summiert den Tag.
 * `value(run)` liest den Fortschritt aus den Rundendaten.
 */
export const MISSION_POOL = [
  {
    id: 'perfect_run',
    title: '12 perfekte Züge in einer Runde',
    target: 12,
    mode: 'best',
    value: (run) => run.perfects,
  },
  {
    id: 'combo_max',
    title: 'Combo x8 erreichen',
    target: 8,
    mode: 'best',
    value: (run) => run.bestCombo,
  },
  {
    id: 'score_run',
    title: '8.000 Punkte in einer Runde',
    target: 8000,
    mode: 'best',
    value: (run) => run.score,
  },
  {
    id: 'streak_perfect',
    title: '6 perfekte Züge in Folge',
    target: 6,
    mode: 'best',
    value: (run) => run.bestPerfectStreak,
  },
  {
    id: 'perfect_total',
    title: '40 perfekte Züge über den Tag',
    target: 40,
    mode: 'sum',
    value: (run) => run.perfects,
  },
  {
    id: 'clean_run',
    title: '15 Teile servieren, ohne etwas zu verbrennen',
    target: 15,
    mode: 'best',
    value: (run) => (run.burns === 0 ? run.served : 0),
  },
  {
    id: 'wing_perfect',
    title: '6 Keulen perfekt ziehen',
    target: 6,
    mode: 'sum',
    value: (run) => run.perfectsByType?.wing ?? 0,
  },
];

/** Kleiner, stabiler Hash – gleiche Eingabe ergibt immer dieselbe Zahl. */
function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Zufallsfolge aus einem Startwert (deterministisch). */
function seeded(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Die drei Missionen eines Tages. Aus dem Datum abgeleitet, deshalb ohne
 * Server für alle Geräte identisch und über den Tag stabil.
 */
export function missionsForDay(day) {
  const random = seeded(hash(day));
  const pool = [...MISSION_POOL];

  // Fisher-Yates mit festem Startwert
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, MISSIONS_PER_DAY);
}

/** Setzt den Missionsfortschritt zurück, sobald ein neuer Tag beginnt. */
export function ensureMissionDay(profile, now = new Date()) {
  const today = dayKey(now);
  if (profile.missionDay === today) return profile;
  return { ...profile, missionDay: today, missions: {} };
}

/** Missionen des Tages inklusive Fortschritt für die Anzeige. */
export function missionState(profile, now = new Date()) {
  const today = dayKey(now);
  const stored = profile.missionDay === today ? profile.missions ?? {} : {};

  return missionsForDay(today).map((mission) => {
    const progress = Math.min(stored[mission.id]?.progress ?? 0, mission.target);
    return {
      id: mission.id,
      title: mission.title,
      target: mission.target,
      progress,
      done: Boolean(stored[mission.id]?.done),
      reward: MISSION_REWARD,
    };
  });
}

/**
 * Verrechnet eine gespielte Runde mit den Tagesmissionen.
 *
 * @param {object} profile
 * @param {{score:number, perfects:number, bestCombo:number,
 *          bestPerfectStreak:number, burns:number, served:number,
 *          perfectsByType:object}} run
 * @returns {{profile: object, completed: object[], coins: number}}
 */
export function applyMissionProgress(profile, run, now = new Date()) {
  const today = dayKey(now);
  let working = ensureMissionDay(profile, now);
  const stored = { ...(working.missions ?? {}) };
  const completed = [];

  for (const mission of missionsForDay(today)) {
    const entry = stored[mission.id] ?? { progress: 0, done: false };
    if (entry.done) continue;

    const runValue = mission.value(run) ?? 0;
    const progress = mission.mode === 'sum' ? entry.progress + runValue : Math.max(entry.progress, runValue);
    const done = progress >= mission.target;

    stored[mission.id] = { progress, done };
    if (done) completed.push({ id: mission.id, title: mission.title, reward: MISSION_REWARD });
  }

  working = { ...working, missionDay: today, missions: stored };

  // Belohnung über grantCoins – damit greift die Tagesobergrenze auch hier.
  let coins = 0;
  if (completed.length > 0) {
    const result = grantCoins(working, completed.length * MISSION_REWARD, now);
    working = result.profile;
    coins = result.granted;
  }

  return { profile: working, completed, coins };
}
