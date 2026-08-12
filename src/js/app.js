/** App-Shell: Navigation, Zustand und Anbindung des Spiels an das Profil. */

import NuggetRush from './game.js';
import { loadProfile, saveProfile, resetProfile } from './storage.js';
import { isMuted, toggleMute, sfx } from './audio.js';
import {
  REWARDS,
  DAILY_BONUS_COINS,
  applyGameResult,
  canClaimDailyBonus,
  claimDailyBonus,
  isCouponExpired,
  markCouponUsed,
  redeemReward,
} from './economy.js';

const $ = (selector) => document.querySelector(selector);

const SCREENS = {
  home: $('#screen-home'),
  play: $('#screen-game'),
  over: $('#screen-over'),
  rewards: $('#screen-rewards'),
};

let profile = loadProfile();
let game = null;
let toastTimer = null;

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
  window.scrollTo({ top: 0 });
}

/* --------------------------------------------------------------- Rendering */

function renderHome() {
  $('#home-coins').textContent = profile.coins.toLocaleString('de-DE');
  $('#home-highscore').textContent = profile.highScore.toLocaleString('de-DE');
  $('#home-games').textContent = profile.gamesPlayed;
  $('#home-coupons').textContent = profile.coupons.filter((coupon) => !coupon.redeemed).length;

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
      <div class="reward__emoji" aria-hidden="true">${reward.emoji}</div>
      <div class="reward__body">
        <p class="reward__title">${reward.title}</p>
        <p class="reward__subtitle">${reward.subtitle}</p>
      </div>
      <button class="reward__action" type="button" data-reward="${reward.id}" ${
        affordable ? '' : 'disabled'
      }>${reward.cost} 🪙</button>
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
      <p class="coupon__meta">Code an der Kasse vorzeigen.</p>
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
    game = new NuggetRush($('#game-canvas'), {
      onUpdate: updateHud,
      onGameOver: handleGameOver,
    });
  }
  return game;
}

function updateHud(state) {
  $('#hud-score').textContent = state.score.toLocaleString('de-DE');
  $('#hud-combo').textContent = `x${state.combo}`;
  $('#hud-lives').textContent = '❤️'.repeat(Math.max(0, state.lives));
}

function startGame() {
  showScreen('play');
  $('#game-overlay').hidden = true;
  const instance = ensureGame();
  // Layout steht erst nach dem Screen-Wechsel fest.
  requestAnimationFrame(() => {
    instance.onResize();
    instance.start();
  });
}

function handleGameOver({ score, distance }) {
  const result = applyGameResult(profile, score, new Date());
  profile = result.profile;
  persist();

  $('#result-score').textContent = score.toLocaleString('de-DE');
  $('#result-distance').textContent = `${distance.toLocaleString('de-DE')} m`;
  $('#result-coins').textContent = `+${result.earned} 🪙`;
  $('#result-balance').textContent = `${profile.coins.toLocaleString('de-DE')} 🪙`;
  $('#result-badge').hidden = !result.isNewRecord;

  showScreen('over');
}

function pauseGame() {
  if (!game || !game.running || game.paused) return;
  game.pause();
  $('#overlay-title').textContent = 'Pause';
  $('#overlay-text').textContent = 'Tippe auf Weiter, um zurück ins Rennen zu kommen.';
  $('#game-overlay').hidden = false;
}

function resumeGame() {
  $('#game-overlay').hidden = true;
  game?.resume();
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
    toast(
      result.error === 'insufficient-coins'
        ? 'Dafür reichen deine Coins noch nicht.'
        : 'Diese Belohnung gibt es nicht mehr.',
    );
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

function handleReset() {
  const confirmed = window.confirm(
    'Wirklich alle Coins, Gutscheine und Rekorde löschen? Das lässt sich nicht rückgängig machen.',
  );
  if (!confirmed) return;
  profile = resetProfile();
  toast('Fortschritt zurückgesetzt.');
  renderRewards();
  renderHome();
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
$('#overlay-resume').addEventListener('click', resumeGame);
$('#overlay-quit').addEventListener('click', quitGame);
$('#quit-button').addEventListener('click', quitGame);
$('#control-left').addEventListener('click', () => game?.move(-1));
$('#control-right').addEventListener('click', () => game?.move(1));

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
