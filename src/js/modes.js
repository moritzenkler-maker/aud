/**
 * Katalog der Spielmodi.
 *
 * Acht eigenständige Spiele mit jeweils eigener Mechanik – gemeinsam ist
 * ihnen nur der Rahmen (drei Fehler beenden die Runde, Combo bis x8, Punkte
 * gibt es für saubere Züge, nicht für Spielzeit).
 *
 * Diese Datei enthält bewusst nur Daten und keine Spiel-Logik: Sie ist
 * dadurch ohne Browser ladbar und in Tests prüfbar. Die Zuordnung von
 * `engine` zur jeweiligen Klasse passiert in game.js.
 *
 * `id` wird im Profil gespeichert (Bestwerte je Modus) und darf sich nicht
 * mehr ändern.
 */

export const DEFAULT_MODE = 'fritteuse';

export const MODES = [
  {
    id: 'fritteuse',
    title: 'Fritteuse',
    subtitle: 'Zieh im goldenen Moment, kurz bevor es verbrennt',
    skill: 'Timing',
    engine: 'fryer',
    icon: 'nugget',
    config: {
      columns: 2,
      rows: 3,
      cookTime: { start: 3.0, end: 1.4 },
      spawn: { start: 1.4, end: 0.6 },
      perfectWindow: { start: 0.14, end: 0.05 },
      goodFrom: 0.55,
      perfectPoints: 100,
      goodPoints: 5,
      rampItems: 45,
    },
  },
  {
    id: 'bestellung',
    title: 'Bestellung',
    subtitle: 'Merk dir die Reihenfolge und tippe sie nach',
    skill: 'Gedächtnis',
    engine: 'order',
    icon: 'wing',
    config: { perfectPoints: 40 },
  },
  {
    id: 'sortieren',
    title: 'Sortieren',
    subtitle: 'Chicken nach links, Beilagen nach rechts',
    skill: 'Tempo',
    engine: 'sorting',
    icon: 'fries',
    config: { perfectPoints: 60, rampItems: 40 },
  },
  {
    id: 'chili',
    title: 'Chili-Alarm',
    subtitle: 'Greif das Chicken, lass die Chilis liegen',
    skill: 'Reaktion',
    engine: 'chili',
    icon: 'chili',
    config: { perfectPoints: 70, rampItems: 40 },
  },
  {
    id: 'stapel',
    title: 'Burger-Stapel',
    subtitle: 'Setz jede Schicht sauber auf den Turm',
    skill: 'Präzision',
    engine: 'stack',
    icon: 'burger',
    config: { perfectPoints: 80, goodPoints: 20 },
  },
  {
    id: 'dip',
    title: 'Dip-Meter',
    subtitle: 'Stopp den Zeiger in der schrumpfenden Zone',
    skill: 'Nerven',
    engine: 'dipmeter',
    icon: 'dip',
    config: { perfectPoints: 90, goodPoints: 20 },
  },
  {
    id: 'kasse',
    title: 'Kasse',
    subtitle: 'Gib das richtige Wechselgeld heraus',
    skill: 'Kopfrechnen',
    engine: 'register',
    icon: 'drink',
    config: { perfectPoints: 85 },
  },
  {
    id: 'band',
    title: 'Fließband',
    subtitle: 'Greif jedes Teil genau an der Marke ab',
    skill: 'Rhythmus',
    engine: 'belt',
    icon: 'tender',
    config: { perfectPoints: 75, goodPoints: 15, rampItems: 40 },
  },
];

/** Liefert den Modus zu einer id, sonst `undefined`. */
export function findMode(id) {
  return MODES.find((mode) => mode.id === id);
}

/** Liefert einen gültigen Modus – notfalls den Standard. */
export function resolveMode(id) {
  return findMode(id) ?? findMode(DEFAULT_MODE);
}
