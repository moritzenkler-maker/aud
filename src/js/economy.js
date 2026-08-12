/**
 * Spiel-Ökonomie der Loco Chicken App.
 *
 * Dieses Modul ist bewusst frei von DOM- und Browser-APIs, damit es
 * sowohl im Browser als auch unter Node (Tests) laufen kann.
 */

/** Umrechnungskurs: erspielte Punkte -> Loco Coins. */
export const POINTS_PER_COIN = 10;

/** Täglicher Login-Bonus in Coins. */
export const DAILY_BONUS_COINS = 25;

/** Gültigkeitsdauer eines eingelösten Gutscheins in Tagen. */
export const COUPON_VALID_DAYS = 14;

/** Belohnungskatalog. `id` wird persistiert und darf sich nicht ändern. */
export const REWARDS = [
  {
    id: 'dip',
    title: 'Dip nach Wahl',
    subtitle: 'Truffle Mayo, Harissa Mayo oder Classic – gratis',
    cost: 150,
    icon: './assets/rewards/dip.svg',
  },
  {
    id: 'fries',
    title: 'Loco Fries',
    subtitle: 'Portion Fries gratis zu jedem Menü',
    cost: 300,
    icon: './assets/rewards/fries.svg',
  },
  {
    id: 'tenders',
    title: '4 Chicken Tenders',
    subtitle: 'Gratis Tenders ab 10 € Bestellwert',
    cost: 600,
    icon: './assets/rewards/tenders.svg',
  },
  {
    id: 'burger',
    title: 'Loco Burger für 1 €',
    subtitle: 'Crispy Chicken, Cheese und Pickles',
    cost: 900,
    icon: './assets/rewards/burger.svg',
  },
  {
    id: 'bucket',
    title: '20 % auf den Bucket',
    subtitle: 'Für den großen Hunger mit der Crew',
    cost: 1500,
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
    scores: [],
    coupons: [],
  };
}

/**
 * Verbucht ein beendetes Spiel.
 * Gibt ein neues Profil sowie die Auswertung der Runde zurück.
 */
export function applyGameResult(profile, score, now = new Date()) {
  const earned = coinsForScore(score);
  const isNewRecord = score > profile.highScore;
  const scores = [...profile.scores, { score, date: now.toISOString() }]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return {
    profile: {
      ...profile,
      coins: profile.coins + earned,
      highScore: Math.max(profile.highScore, score),
      gamesPlayed: profile.gamesPlayed + 1,
      scores,
    },
    earned,
    isNewRecord,
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

  const expiresAt = new Date(now.getTime() + COUPON_VALID_DAYS * 24 * 60 * 60 * 1000);
  const coupon = {
    code: generateCouponCode(random),
    rewardId: reward.id,
    title: reward.title,
    cost: reward.cost,
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
