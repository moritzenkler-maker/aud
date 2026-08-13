/** App-Shell: Navigation, Zustand und Anbindung des Spiels an das Profil. */

import LocoFryer from './game.js';
import { loadProfile, saveProfile, resetProfile } from './storage.js';
import { isMuted, toggleMute, sfx } from './audio.js';
import {
  REWARDS,
  DAILY_BONUS_COINS,
  DAILY_COIN_CAP,
  MAX_ACTIVE_COUPONS,
  POINTS_PER_COIN,
  applyGameResult,
  canClaimDailyBonus,
  claimDailyBonus,
  isCouponExpired,
  markCouponUsed,
  redeemReward,
  remainingDailyCoins,
} from './economy.js';

const $ = (selector) => document.querySelector(selector);

/** Marken-Coin als Inline-Grafik statt Emoji. */
const COIN_ICON = '<img class="coin-icon" src="./assets/coin.svg" alt="Loco Coins" />';

const SCREENS = {
  home: $('#screen-home'),
  play: $('#screen-game'),
  over: $('#screen-over'),
  rewards: $('#screen-rewards'),
};

let profile = loadProfile();
let game = null;
let toastTimer = null;
let resetTimer = null;
let overlayMode = 'pause';

/* ------------------------------------------------------------ Hilfsmittel */

function persist() {
  saveProfile(profile);
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.hidden = true;
  }, 2600);
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------ Navigation */

function showScreen(name) {
  for (const [key, element] of Object.entries(SCREENS)) {
    element.classList.toggle('screen--active', key === name);
  }
  document.body.classList.toggle('is-playing', name === 'play');

  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('tab--active', tab.dataset.screen === name);
  }

  if (name !== 'play' && game) {
    game.stop();
  }
  if (name === 'home') renderHome();
  if (name === 'rewards') renderRewards();
  // Ein scharfgeschalteter Reset gilt nur, solange der Screen sichtbar bleibt.
  if (name !== 'rewards') disarmReset();
  window.scrollTo({ top: 0 });
}

/* --------------------------------------------------------------- Rendering */

function renderHome() {
  $('#home-coins').textContent = profile.coins.toLocaleString('de-DE');
  $('#home-highscore').textContent = profile.highScore.toLocaleString('de-DE');
  $('#home-games').textContent = profile.gamesPlayed;
  $('#home-coupons').textContent = profile.coupons.filter((coupon) => !coupon.redeemed).length;

  const remaining = remainingDailyCoins(profile);
  $('#wallet-daily').textContent =
    remaining > 0
      ? `Heute noch ${remaining} von ${DAILY_COIN_CAP} Coins erspielbar`
      : 'Tageslimit erreicht – morgen gibt es wieder Coins';

  const bonusButton = $('#bonus-button');
  const claimable = canClaimDailyBonus(profile);
  bonusButton.disabled = !claimable;
  $('#bonus-title').textContent = claimable ? 'Tagesbonus abholen' : 'Tagesbonus abgeholt';
  $('#bonus-subtitle').textContent = claimable
    ? `+${DAILY_BONUS_COINS} Coins – jeden Tag neu`
    : 'Komm morgen wieder für den nächsten Bonus.';

  const list = $('#score-list');
  list.innerHTML = '';
  if (profile.scores.length === 0) {
    list.innerHTML = '<li class="scorelist__empty">Noch keine Runde gespielt.</li>';
    return;
  }
  profile.scores.slice(0, 5).forEach((entry, index) => {
    const item = document.createElement('li');
    item.innerHTML = `<span><span class="scorelist__rank">#${index + 1}</span>${entry.score.toLocaleString(
      'de-DE',
    )} Punkte</span><span class="coupon__meta">${formatDate(entry.date)}</span>`;
    list.appendChild(item);
  });
}

function renderRewards() {
  $('#rewards-coins').textContent = profile.coins.toLocaleString('de-DE');

  const container = $('#rewards-list');
  container.innerHTML = '';
  for (const reward of REWARDS) {
    const affordable = profile.coins >= reward.cost;
    const card = document.createElement('article');
    card.className = `reward${affordable ? '' : ' reward--locked'}`;
    card.innerHTML = `
      <div class="reward__icon"><img src="${reward.icon}" alt="" width="34" height="34" /></div>
      <div class="reward__body">
        <p class="reward__title">${reward.title}</p>
        <p class="reward__subtitle">${reward.subtitle}</p>
        <p class="reward__terms">${
          reward.minOrder > 0 ? `ab ${reward.minOrder} € Bestellwert` : 'zu jeder Bestellung'
        }</p>
      </div>
      <button class="reward__action" type="button" data-reward="${reward.id}" ${
        affordable ? '' : 'disabled'
      }>${reward.cost}${COIN_ICON}</button>
    `;
    container.appendChild(card);
  }

  renderCoupons();
}

function renderCoupons() {
  const container = $('#coupon-list');
  container.innerHTML = '';

  if (profile.coupons.length === 0) {
    container.innerHTML = '<p class="scorelist__empty">Noch keine Gutscheine eingelöst.</p>';
    return;
  }

  for (const coupon of profile.coupons) {
    const expired = isCouponExpired(coupon);
    const inactive = coupon.redeemed || expired;
    const card = document.createElement('article');
    card.className = `coupon${inactive ? ' coupon--used' : ''}`;

    let status = `gültig bis ${formatDate(coupon.expiresAt)}`;
    if (coupon.redeemed) status = 'eingelöst';
    else if (expired) status = 'abgelaufen';

    card.innerHTML = `
      <div class="coupon__head">
        <span class="coupon__title">${coupon.title}</span>
        <span class="coupon__meta">${status}</span>
      </div>
      <p class="coupon__code">${coupon.code}</p>
      <p class="coupon__meta">${
        coupon.minOrder > 0 ? `Ab ${coupon.minOrder} € Bestellwert. ` : ''
      }Code an der Kasse vorzeigen.</p>
      ${
        inactive
          ? ''
          : `<button class="coupon__use" type="button" data-coupon="${coupon.code}">Im Restaurant eingelöst</button>`
      }
    `;
    container.appendChild(card);
  }
}

/* -------------------------------------------------------------------- Spiel */

function ensureGame() {
  if (!game) {
    game = new LocoFryer($('#game-canvas'), {
      onUpdate: updateHud,
      onGameOver: handleGameOver,
    });

    // Prüfzugang für automatisierte Tests, nur mit ?debug in der Adresse.
    if (new URLSearchParams(window.location.search).has('debug')) {
      window.locoFryer = game;
    }
  }
  return game;
}

function updateHud(state) {
  $('#hud-score').textContent = state.score.toLocaleString('de-DE');
  $('#hud-combo').textContent = `x${state.combo}`;
  $('#hud-strikes').innerHTML = Array.from({ length: 3 }, (unused, index) =>
    index < state.strikes ? '<i class="strike strike--used"></i>' : '<i class="strike"></i>',
  ).join('');
}

function showOverlay(mode, { title, text, primary }) {
  overlayMode = mode;
  $('#overlay-title').textContent = title;
  $('#overlay-text').textContent = text;
  $('#overlay-resume').textContent = primary;
  $('#game-overlay').hidden = false;
}

function startGame() {
  showScreen('play');
  const instance = ensureGame();
  // Layout steht erst nach dem Screen-Wechsel fest.
  requestAnimationFrame(() => instance.onResize());

  // Erst orientieren, dann losfrittieren – der Timing-Druck beginnt bewusst
  // nicht in dem Moment, in dem der Bildschirm wechselt.
  showOverlay('start', {
    title: 'Bereit?',
    text: 'Tippe ein Teil genau dann, wenn sein Ring golden leuchtet. Dreimal verbrannt und die Schicht ist vorbei.',
    primary: 'Losfrittieren',
  });
}

function beginRound() {
  $('#game-overlay').hidden = true;
  ensureGame().start();
}

function handleGameOver({ score, perfects }) {
  const result = applyGameResult(profile, score, new Date());
  profile = result.profile;
  persist();

  $('#result-score').textContent = score.toLocaleString('de-DE');
  $('#result-perfects').textContent = perfects;
  $('#result-coins').innerHTML = `+${result.earned}${COIN_ICON}`;
  $('#result-balance').innerHTML = `${profile.coins.toLocaleString('de-DE')}${COIN_ICON}`;
  $('#result-badge').hidden = !result.isNewRecord;

  // Erklären, warum es weniger Coins gab als die Punkte hergeben würden.
  const note = $('#result-note');
  if (result.cappedAway > 0) {
    note.textContent = `Tageslimit erreicht: ${result.cappedAway} Coins konnten heute nicht mehr gutgeschrieben werden.`;
    note.hidden = false;
  } else if (result.earned === 0) {
    const missing = POINTS_PER_COIN - (score % POINTS_PER_COIN);
    note.textContent = `Noch ${missing.toLocaleString('de-DE')} Punkte bis zum nächsten Coin.`;
    note.hidden = false;
  } else {
    note.hidden = true;
  }

  showScreen('over');
}

function pauseGame() {
  if (!game || !game.running || game.paused) return;
  game.pause();
  showOverlay('pause', {
    title: 'Pause',
    text: 'Das Öl bleibt heiß. Weiter, wenn du bereit bist.',
    primary: 'Weiter',
  });
}

function resumeGame() {
  $('#game-overlay').hidden = true;
  game?.resume();
}

function handleOverlayPrimary() {
  if (overlayMode === 'start') beginRound();
  else resumeGame();
}

function quitGame() {
  game?.stop();
  $('#game-overlay').hidden = true;
  showScreen('home');
}

/* -------------------------------------------------------------- Interaktion */

function claimBonus() {
  const result = claimDailyBonus(profile);
  if (!result.claimed) {
    toast('Der Tagesbonus wurde heute schon abgeholt.');
    return;
  }
  profile = result.profile;
  persist();
  sfx.bonus();
  toast(`Tagesbonus: +${result.amount} Coins 🪙`);
  renderHome();
}

function handleRedeem(rewardId) {
  const result = redeemReward(profile, rewardId);
  if (!result.ok) {
    const messages = {
      'insufficient-coins': 'Dafür reichen deine Coins noch nicht.',
      'coupon-limit':
        MAX_ACTIVE_COUPONS === 1
          ? 'Löse erst deinen offenen Gutschein ein.'
          : `Du kannst höchstens ${MAX_ACTIVE_COUPONS} Gutscheine offen haben.`,
    };
    toast(messages[result.error] ?? 'Diese Belohnung gibt es nicht mehr.');
    return;
  }
  profile = result.profile;
  persist();
  sfx.bonus();
  toast(`Gutschein erstellt: ${result.coupon.code}`);
  renderRewards();
}

function handleCouponUsed(code) {
  const result = markCouponUsed(profile, code);
  if (!result.ok) return;
  profile = result.profile;
  persist();
  toast('Gutschein als eingelöst markiert.');
  renderRewards();
}

/**
 * Zurücksetzen in zwei Schritten: Der erste Tipp fragt nach, der zweite löscht.
 * Bewusst ohne `window.confirm`, weil Systemdialoge in eingebetteten Ansichten
 * (Vorschau, In-App-Browser) blockiert werden können.
 */
function handleReset() {
  const button = $('#reset-button');

  if (button.dataset.armed !== 'true') {
    button.dataset.armed = 'true';
    button.textContent = 'Wirklich alles löschen? Nochmal tippen';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(disarmReset, 5000);
    return;
  }

  disarmReset();
  profile = resetProfile();
  toast('Fortschritt zurückgesetzt.');
  renderRewards();
  renderHome();
}

function disarmReset() {
  clearTimeout(resetTimer);
  const button = $('#reset-button');
  button.dataset.armed = 'false';
  button.textContent = 'Fortschritt zurücksetzen';
}

function updateMuteButton() {
  $('#mute-button').textContent = isMuted() ? '🔇' : '🔊';
}

/* ------------------------------------------------------------------- Events */

$('#play-button').addEventListener('click', startGame);
$('#again-button').addEventListener('click', startGame);
$('#to-home-button').addEventListener('click', () => showScreen('home'));
$('#to-rewards-button').addEventListener('click', () => showScreen('rewards'));
$('#bonus-button').addEventListener('click', claimBonus);
$('#reset-button').addEventListener('click', handleReset);

$('#pause-button').addEventListener('click', pauseGame);
$('#overlay-resume').addEventListener('click', handleOverlayPrimary);
$('#overlay-quit').addEventListener('click', quitGame);
$('#quit-button').addEventListener('click', quitGame);

$('#mute-button').addEventListener('click', () => {
  toggleMute();
  updateMuteButton();
  sfx.ui();
});

$('#rewards-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-reward]');
  if (button) handleRedeem(button.dataset.reward);
});

$('#coupon-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-coupon]');
  if (button) handleCouponUsed(button.dataset.coupon);
});

$('#tabbar').addEventListener('click', (event) => {
  const tab = event.target.closest('.tab');
  if (!tab) return;
  if (tab.dataset.screen === 'play') startGame();
  else showScreen(tab.dataset.screen);
});

// Wechselt der Nutzer die App oder den Tab, wird das Spiel pausiert.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});

/* --------------------------------------------------------------------- Start */

updateMuteButton();
renderHome();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* Offline-Support ist optional */
    });
  });
}
