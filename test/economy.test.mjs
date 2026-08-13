import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COUPON_VALID_DAYS,
  DAILY_BONUS_COINS,
  DAILY_COIN_CAP,
  MAX_ACTIVE_COUPONS,
  POINTS_PER_COIN,
  activeCoupons,
  applyGameResult,
  canClaimDailyBonus,
  claimDailyBonus,
  coinsForScore,
  createProfile,
  findReward,
  generateCouponCode,
  isCouponExpired,
  markCouponUsed,
  redeemReward,
  remainingDailyCoins,
} from '../src/js/economy.js';

test('coinsForScore rundet ab und ignoriert ungültige Werte', () => {
  assert.equal(coinsForScore(0), 0);
  assert.equal(coinsForScore(POINTS_PER_COIN - 1), 0);
  assert.equal(coinsForScore(POINTS_PER_COIN), 1);
  assert.equal(coinsForScore(POINTS_PER_COIN * 3.5), 3);
  assert.equal(coinsForScore(-50), 0);
  assert.equal(coinsForScore(Number.NaN), 0);
});

test('applyGameResult schreibt Coins gut und erkennt den Rekord', () => {
  const start = createProfile();
  const score = POINTS_PER_COIN * 5;

  const first = applyGameResult(start, score);
  assert.equal(first.earned, 5);
  assert.equal(first.isNewRecord, true);
  assert.equal(first.profile.coins, 5);
  assert.equal(first.profile.highScore, score);
  assert.equal(first.profile.gamesPlayed, 1);
  // Ursprüngliches Profil bleibt unverändert.
  assert.equal(start.coins, 0);

  const second = applyGameResult(first.profile, POINTS_PER_COIN * 2);
  assert.equal(second.isNewRecord, false);
  assert.equal(second.profile.highScore, score);
  assert.equal(second.profile.coins, 7);
});

test('die Tagesobergrenze deckelt erspielte Coins und setzt sich täglich zurück', () => {
  const monday = new Date('2026-08-10T10:00:00');
  const mondayLater = new Date('2026-08-10T20:00:00');
  const tuesday = new Date('2026-08-11T10:00:00');

  const start = createProfile();
  assert.equal(remainingDailyCoins(start, monday), DAILY_COIN_CAP);

  // Eine übergroße Runde bringt höchstens das Tageslimit.
  const huge = applyGameResult(start, POINTS_PER_COIN * (DAILY_COIN_CAP + 8), monday);
  assert.equal(huge.gross, DAILY_COIN_CAP + 8);
  assert.equal(huge.earned, DAILY_COIN_CAP);
  assert.equal(huge.cappedAway, 8);
  assert.equal(huge.profile.coins, DAILY_COIN_CAP);
  assert.equal(remainingDailyCoins(huge.profile, monday), 0);

  // Weiterspielen am selben Tag bringt keine Coins mehr.
  const again = applyGameResult(huge.profile, POINTS_PER_COIN * 4, mondayLater);
  assert.equal(again.earned, 0);
  assert.equal(again.cappedAway, 4);
  assert.equal(again.profile.coins, DAILY_COIN_CAP);
  // Punkte und Rekorde zählen trotzdem weiter.
  assert.equal(again.profile.gamesPlayed, 2);

  // Am nächsten Tag steht das volle Kontingent wieder bereit.
  assert.equal(remainingDailyCoins(again.profile, tuesday), DAILY_COIN_CAP);
  const nextDay = applyGameResult(again.profile, POINTS_PER_COIN * 3, tuesday);
  assert.equal(nextDay.earned, 3);
  assert.equal(nextDay.profile.coins, DAILY_COIN_CAP + 3);
});

test('Bestenliste ist sortiert und auf zehn Einträge begrenzt', () => {
  let profile = createProfile();
  for (let i = 1; i <= 12; i += 1) {
    profile = applyGameResult(profile, i * 10).profile;
  }
  assert.equal(profile.scores.length, 10);
  assert.equal(profile.scores[0].score, 120);
  assert.deepEqual(
    profile.scores.map((entry) => entry.score),
    [...profile.scores.map((entry) => entry.score)].sort((a, b) => b - a),
  );
});

test('Tagesbonus lässt sich pro Kalendertag genau einmal abholen', () => {
  const monday = new Date('2026-08-10T09:00:00');
  const mondayEvening = new Date('2026-08-10T22:30:00');
  const tuesday = new Date('2026-08-11T07:15:00');

  const first = claimDailyBonus(createProfile(), monday);
  assert.equal(first.claimed, true);
  assert.equal(first.profile.coins, DAILY_BONUS_COINS);

  const again = claimDailyBonus(first.profile, mondayEvening);
  assert.equal(again.claimed, false);
  assert.equal(again.profile.coins, DAILY_BONUS_COINS);
  assert.equal(canClaimDailyBonus(first.profile, mondayEvening), false);

  const nextDay = claimDailyBonus(again.profile, tuesday);
  assert.equal(nextDay.claimed, true);
  assert.equal(nextDay.profile.coins, DAILY_BONUS_COINS * 2);
});

test('redeemReward prüft Guthaben und erzeugt einen gültigen Gutschein', () => {
  const poor = { ...createProfile(), coins: 5 };
  const failed = redeemReward(poor, 'dip');
  assert.equal(failed.ok, false);
  assert.equal(failed.error, 'insufficient-coins');
  assert.equal(failed.profile.coins, 5);

  const unknown = redeemReward({ ...createProfile(), coins: 9999 }, 'gibt-es-nicht');
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error, 'unknown-reward');

  const now = new Date('2026-08-12T12:00:00Z');
  const dipCost = findReward('dip').cost;
  const rich = { ...createProfile(), coins: 500 };
  const success = redeemReward(rich, 'dip', { now });
  assert.equal(success.ok, true);
  assert.equal(success.profile.coins, 500 - dipCost);
  assert.equal(success.profile.coupons.length, 1);
  assert.match(success.coupon.code, /^LOCO-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  const expectedExpiry = new Date(now.getTime() + COUPON_VALID_DAYS * 86400000);
  assert.equal(success.coupon.expiresAt, expectedExpiry.toISOString());
  assert.equal(isCouponExpired(success.coupon, now), false);
  assert.equal(isCouponExpired(success.coupon, new Date('2026-09-01T12:00:00Z')), true);
});

test('generateCouponCode nutzt nur eindeutige Zeichen', () => {
  const code = generateCouponCode(() => 0);
  assert.equal(code, 'LOCO-AAAA-AAAA');
  // Leicht verwechselbare Zeichen (I, O, 0, 1) kommen in den Blöcken nicht vor.
  const blocks = generateCouponCode().slice('LOCO-'.length);
  assert.doesNotMatch(blocks, /[IO01]/);
});

test('es bleibt immer nur ein Gutschein gleichzeitig offen', () => {
  const now = new Date('2026-08-12T12:00:00Z');
  const rich = { ...createProfile(), coins: 5000 };

  const first = redeemReward(rich, 'dip', { now });
  assert.equal(first.ok, true);
  assert.equal(activeCoupons(first.profile, now).length, MAX_ACTIVE_COUPONS);

  // Solange der Gutschein offen ist, geht kein zweiter heraus.
  const blocked = redeemReward(first.profile, 'fries', { now });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, 'coupon-limit');
  assert.equal(blocked.profile.coins, first.profile.coins);

  // Nach dem Entwerten ist der Weg wieder frei.
  const used = markCouponUsed(first.profile, first.coupon.code).profile;
  const second = redeemReward(used, 'fries', { now });
  assert.equal(second.ok, true);
});

test('markCouponUsed entwertet einen Gutschein nur einmal', () => {
  const now = new Date('2026-08-12T12:00:00Z');
  const { profile } = redeemReward({ ...createProfile(), coins: 500 }, 'dip', { now });
  const code = profile.coupons[0].code;

  const used = markCouponUsed(profile, code);
  assert.equal(used.ok, true);
  assert.equal(used.profile.coupons[0].redeemed, true);
  assert.equal(activeCoupons(used.profile, now).length, 0);

  const twice = markCouponUsed(used.profile, code);
  assert.equal(twice.ok, false);

  assert.equal(markCouponUsed(profile, 'LOCO-XXXX-XXXX').ok, false);
});
