/**
 * Spiel-Ökonomie der Loco Chicken App.
 *
 * Dieses Modul ist bewusst frei von DOM- und Browser-APIs, damit es
 * sowohl im Browser als auch unter Node (Tests) laufen kann.
 */

import { PROTEIN } from './brand.js';

/*
 * Wirtschaftliche Auslegung
 * -------------------------
 * Die Werte sind bewusst streng gewählt: Ein Gutschein soll ein Grund zum
 * Wiederkommen sein, kein Automatismus. Wer fast täglich spielt, erreicht den
 * günstigsten Gutschein nach rund zwei bis drei Wochen.
 *
 * Drei Bremsen wirken zusammen:
 *   1. hoher Umrechnungskurs (Punkte -> Coins)
 *   2. Tagesobergrenze für erspielte Coins (verhindert Dauergrinden)
 *   3. nur ein offener Gutschein gleichzeitig (verhindert Horten)
 *
 * Zusätzlich hat jede Belohnung außer dem Dip einen Mindestbestellwert –
 * damit steht hinter jedem eingelösten Gutschein immer Umsatz.
 *
 * Alle Stellschrauben stehen hier zentral und lassen sich ohne weitere
 * Codeänderungen nachjustieren.
 */

/** Umrechnungskurs: erspielte Punkte -> Loco Coins. */
export const POINTS_PER_COIN = 4000;

/** Höchstzahl an Coins, die pro Kalendertag erspielt werden kann. */
export const DAILY_COIN_CAP = 10;

/** Täglicher Login-Bonus in Coins (zählt nicht gegen die Obergrenze). */
export const DAILY_BONUS_COINS = 2;

/** So viele nicht eingelöste Gutscheine darf ein Gast gleichzeitig halten. */
export const MAX_ACTIVE_COUPONS = 1;

/** Gültigkeitsdauer eines eingelösten Gutscheins in Tagen. */
export const COUPON_VALID_DAYS = 14;

/**
 * Ränge nach Bestleistung. Reiner Status – Ränge kosten nichts und geben
 * nichts. Sie sind die Fortschrittsanzeige für alle, die noch weit von einem
 * Gutschein entfernt sind.
 */
export const RANKS = [
  { id: 'huelfe', title: 'Küchenhilfe', from: 0 },
  { id: 'azubi', title: 'Fritteusen-Azubi', from: 5000 },
  { id: 'frycook', title: 'Fry Cook', from: 15000 },
  { id: 'chef', title: 'Chef de Fritteuse', from: 30000 },
  { id: 'legende', title: 'Loco Legende', from: 60000 },
];

/** Aktueller Rang und – falls vorhanden – der nächste. */
export function rankFor(highScore) {
  const index = RANKS.reduce(
    (best, rank, position) => (highScore >= rank.from ? position : best),
    0,
  );
  return { current: RANKS[index], next: RANKS[index + 1] ?? null };
}

/**
 * Belohnungskatalog – ausschließlich Produkte, die es wirklich gibt.
 * Namen und Angaben stammen aus brand.js. `id` wird in ausgestellten
 * Gutscheinen gespeichert und darf sich nicht mehr ändern.
 */
export const REWARDS = [
  {
    id: 'dip',
    title: 'Dip nach Wahl',
    subtitle: 'White Truffle Mayo, Harissa Mayo oder Rosemary Ketchup',
    cost: 150,
    minOrder: 0,
    icon: './assets/rewards/dip.svg',
  },
  {
    id: 'fries',
    title: 'Crispy Fries',
    subtitle: 'Eine Portion Fries gratis',
    cost: 300,
    minOrder: 10,
    icon: './assets/rewards/fries.svg',
  },
  {
    id: 'filets',
    title: 'Crunchy Filets',
    subtitle: 'Halal Filets mit Signature Flavour deiner Wahl',
    cost: 550,
    minOrder: 15,
    icon: './assets/rewards/tenders.svg',
  },
  {
    id: 'shaker',
    title: 'Loco × ESN Shaker',
    subtitle: 'Der Shaker aus der Protein-Kooperation',
    cost: 700,
    minOrder: 15,
    icon: './assets/rewards/shaker.svg',
    protein: true,
  },
  {
    id: 'burger',
    title: 'Chili Cheese Burger für 1 €',
    subtitle: 'Crispy Chicken, Cheese, Chili',
    cost: 900,
    minOrder: 15,
    icon: './assets/rewards/burger.svg',
  },
  {
    id: 'whey',
    title: 'Designer Whey Chicken Waffle',
    subtitle: `Portion mit ${PROTEIN.whey.proteinPerServing} g Protein und ${PROTEIN.whey.kcalPerServing} kcal`,
    cost: 1100,
    minOrder: 15,
    icon: './assets/rewards/whey.svg',
    protein: true,
  },
  {
    id: 'bucket',
    title: '20 % auf den Shake Bucket',
    subtitle: 'Wings und Filets, 2 Flavours, Side und Dip',
    cost: 1500,
    minOrder: 25,
    icon: './assets/rewards/bucket.svg',
  },
];

/** Liefert die Belohnung zu einer id oder `undefined`. */
export function findReward(id) {
  return REWARDS.find((reward) => reward.id === id);
}

/**
 * Rechnet einen Spiel-Score in Coins um.
 * Es wird immer abgerundet, negative Scores ergeben 0 Coins.
 */
export function coinsForScore(score) {
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.floor(score / POINTS_PER_COIN);
}

/** Datum als `YYYY-MM-DD` in lokaler Zeit (Basis für den Tagesbonus). */
export function dayKey(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Ist der Tagesbonus für `date` noch abholbar? */
export function canClaimDailyBonus(profile, date = new Date()) {
  return profile.lastBonusDay !== dayKey(date);
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Erzeugt einen Gutscheincode im Format `LOCO-XXXX-XXXX`.
 * `random` ist injizierbar, damit Tests deterministisch bleiben.
 */
export function generateCouponCode(random = Math.random) {
  const block = () =>
    Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join('');
  return `LOCO-${block()}-${block()}`;
}

/** Leeres Startprofil eines neuen Spielers. */
export function createProfile() {
  return {
    coins: 0,
    highScore: 0,
    gamesPlayed: 0,
    lastBonusDay: null,
    coinDay: null,
    coinsToday: 0,
    streak: 0,
    bestStreak: 0,
    lastPlayDay: null,
    missionDay: null,
    missions: {},
    lastMode: null,
    modeScores: {},
    scores: [],
    coupons: [],
  };
}

/** Kalendertag als Zahl, um Abstände zwischen Tagen zu rechnen. */
function dayNumber(date) {
  return Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);
}

/**
 * Verbucht, dass heute gespielt wurde, und pflegt die Tagesserie.
 * Die Serie ist bewusst reiner Status: Sie zahlt keine Coins aus, sondern
 * gibt einen Grund, morgen wiederzukommen.
 */
export function registerPlay(profile, now = new Date()) {
  const today = dayKey(now);
  if (profile.lastPlayDay === today) return profile;

  const gapInDays = profile.lastPlayDay
    ? dayNumber(now) - dayNumber(new Date(`${profile.lastPlayDay}T12:00:00`))
    : null;
  const streak = gapInDays === 1 ? profile.streak + 1 : 1;

  return {
    ...profile,
    streak,
    bestStreak: Math.max(profile.bestStreak ?? 0, streak),
    lastPlayDay: today,
  };
}

/** Ist die Serie noch am Leben, wenn heute nicht mehr gespielt wird? */
export function streakAtRisk(profile, now = new Date()) {
  return profile.streak > 0 && profile.lastPlayDay !== dayKey(now);
}

/**
 * Schreibt Coins gut und respektiert dabei die Tagesobergrenze.
 * Jede erspielbare Quelle (Runden, Missionen) läuft hier durch – dadurch
 * kann keine neue Belohnungsmechanik die Obergrenze aushebeln.
 */
export function grantCoins(profile, amount, now = new Date()) {
  const today = dayKey(now);
  const usedToday = profile.coinDay === today ? profile.coinsToday : 0;
  const granted = Math.max(0, Math.min(amount, DAILY_COIN_CAP - usedToday));

  return {
    profile: {
      ...profile,
      coins: profile.coins + granted,
      coinDay: today,
      coinsToday: usedToday + granted,
    },
    granted,
    cappedAway: Math.max(0, amount - granted),
  };
}

/** Wie viele Coins heute noch erspielt werden können. */
export function remainingDailyCoins(profile, now = new Date()) {
  const usedToday = profile.coinDay === dayKey(now) ? profile.coinsToday : 0;
  return Math.max(0, DAILY_COIN_CAP - usedToday);
}

/**
 * Verbucht ein beendetes Spiel.
 * Gibt ein neues Profil sowie die Auswertung der Runde zurück.
 */
export function applyGameResult(profile, score, now = new Date(), mode = null) {
  // Was die Runde wert wäre, und was die Tagesobergrenze davon übrig lässt.
  const gross = coinsForScore(score);
  const { profile: paid, granted, cappedAway } = grantCoins(profile, gross, now);

  const isNewRecord = score > profile.highScore;
  const rankBefore = rankFor(profile.highScore).current;
  const scores = [...profile.scores, { score, date: now.toISOString() }]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const highScore = Math.max(profile.highScore, score);

  // Bestwert je Modus, damit sich alle acht Spiele einzeln lohnen.
  const modeScores = { ...(profile.modeScores ?? {}) };
  const isModeRecord = mode ? score > (modeScores[mode] ?? 0) : false;
  if (mode && isModeRecord) modeScores[mode] = score;

  const withRun = registerPlay(
    {
      ...paid,
      highScore,
      gamesPlayed: profile.gamesPlayed + 1,
      lastMode: mode ?? profile.lastMode,
      modeScores,
      scores,
    },
    now,
  );

  const rankAfter = rankFor(highScore).current;

  return {
    profile: withRun,
    earned: granted,
    gross,
    cappedAway,
    isNewRecord,
    isModeRecord,
    rankUp: rankAfter.id !== rankBefore.id ? rankAfter : null,
    streak: withRun.streak,
  };
}

/**
 * Holt den Tagesbonus ab.
 * Ist er bereits abgeholt, bleibt das Profil unverändert (`claimed: false`).
 */
export function claimDailyBonus(profile, now = new Date()) {
  if (!canClaimDailyBonus(profile, now)) {
    return { profile, claimed: false, amount: 0 };
  }
  return {
    profile: {
      ...profile,
      coins: profile.coins + DAILY_BONUS_COINS,
      lastBonusDay: dayKey(now),
    },
    claimed: true,
    amount: DAILY_BONUS_COINS,
  };
}

/**
 * Löst eine Belohnung ein.
 * Schlägt fehl, wenn die Belohnung unbekannt ist oder die Coins nicht reichen.
 */
export function redeemReward(profile, rewardId, { now = new Date(), random = Math.random } = {}) {
  const reward = findReward(rewardId);
  if (!reward) {
    return { profile, ok: false, error: 'unknown-reward' };
  }
  if (profile.coins < reward.cost) {
    return { profile, ok: false, error: 'insufficient-coins' };
  }
  if (activeCoupons(profile, now).length >= MAX_ACTIVE_COUPONS) {
    return { profile, ok: false, error: 'coupon-limit' };
  }

  const expiresAt = new Date(now.getTime() + COUPON_VALID_DAYS * 24 * 60 * 60 * 1000);
  const coupon = {
    code: generateCouponCode(random),
    rewardId: reward.id,
    title: reward.title,
    cost: reward.cost,
    minOrder: reward.minOrder ?? 0,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    redeemed: false,
  };

  return {
    profile: {
      ...profile,
      coins: profile.coins - reward.cost,
      coupons: [coupon, ...profile.coupons],
    },
    ok: true,
    coupon,
  };
}

/** Markiert einen Gutschein als im Restaurant eingelöst (entwertet). */
export function markCouponUsed(profile, code) {
  const exists = profile.coupons.some((coupon) => coupon.code === code && !coupon.redeemed);
  if (!exists) return { profile, ok: false };

  return {
    profile: {
      ...profile,
      coupons: profile.coupons.map((coupon) =>
        coupon.code === code ? { ...coupon, redeemed: true } : coupon,
      ),
    },
    ok: true,
  };
}

/** Ist der Gutschein abgelaufen? */
export function isCouponExpired(coupon, now = new Date()) {
  return new Date(coupon.expiresAt).getTime() < now.getTime();
}

/** Aktive, noch nicht entwertete und nicht abgelaufene Gutscheine. */
export function activeCoupons(profile, now = new Date()) {
  return profile.coupons.filter((coupon) => !coupon.redeemed && !isCouponExpired(coupon, now));
}
