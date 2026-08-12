import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COUPON_VALID_DAYS,
  DAILY_BONUS_COINS,
  activeCoupons,
  applyGameResult,
  canClaimDailyBonus,
  claimDailyBonus,
  coinsForScore,
  createProfile,
  generateCouponCode,
  isCouponExpired,
  markCouponUsed,
  redeemReward,
} from '../src/js/economy.js';

test('coinsForScore rundet ab und ignoriert ungültige Werte', () => {
  assert.equal(coinsForScore(0), 0);
  assert.equal(coinsForScore(9), 0);
  assert.equal(coinsForScore(10), 1);
  assert.equal(coinsForScore(1234), 123);
  assert.equal(coinsForScore(-50), 0);
  assert.equal(coinsForScore(Number.NaN), 0);
});

test('applyGameResult schreibt Coins gut und erkennt den Rekord', () => {
  const start = createProfile();

  const first = applyGameResult(start, 250);
  assert.equal(first.earned, 25);
  assert.equal(first.isNewRecord, true);
  assert.equal(first.profile.coins, 25);
  assert.equal(first.profile.highScore, 250);
  assert.equal(first.profile.gamesPlayed, 1);
  // Ursprüngliches Profil bleibt unverändert.
  assert.equal(start.coins, 0);

  const second = applyGameResult(first.profile, 100);
  assert.equal(second.isNewRecord, false);
  assert.equal(second.profile.highScore, 250);
  assert.equal(second.profile.coins, 35);
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
  const poor = { ...createProfile(), coins: 100 };
  const failed = redeemReward(poor, 'dip');
  assert.equal(failed.ok, false);
  assert.equal(failed.error, 'insufficient-coins');
  assert.equal(failed.profile.coins, 100);

  const unknown = redeemReward({ ...createProfile(), coins: 9999 }, 'gibt-es-nicht');
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error, 'unknown-reward');

  const now = new Date('2026-08-12T12:00:00Z');
  const rich = { ...createProfile(), coins: 500 };
  const success = redeemReward(rich, 'dip', { now });
  assert.equal(success.ok, true);
  assert.equal(success.profile.coins, 350);
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
