/** App-Shell: Navigation, Zustand und Anbindung des Spiels an das Profil. */

import { createGame } from './game.js';
import { MODES, DEFAULT_MODE, resolveMode } from './modes.js';
import { BRAND, PROTEIN } from './brand.js';
import { drawFood } from './games/icons.js';
import { loadProfile, saveProfile, resetProfile } from './storage.js';
import { isMuted, toggleMute, sfx } from './audio.js';
import { applyMissionProgress, missionState } from './missions.js';
import { renderShareCard, shareCard } from './sharecard.js';
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
  rankFor,
  redeemReward,
  remainingDailyCoins,
  streakAtRisk,
} from './economy.js';

const $ = (selector) => document.querySelector(selector);

/** Marken-Coin als Inline-Grafik statt Emoji. */
const COIN_ICON = '<img class="coin-icon" src="./assets/coin.svg" alt="Loco Coins" />';

const SCREENS = {
  home: $('#screen-home'),
  modes: $('#screen-modes'),
  play: $('#screen-game'),
  over: $('#screen-over'),
  rewards: $('#screen-rewards'),
};

let profile = loadProfile();
let game = null;
let toastTimer = null;
let resetTimer = null;
let overlayMode = 'pause';
// Zuletzt gespieltes Spiel merken, damit der Startknopf direkt dorthin führt.
let currentMode = resolveMode(profile.lastMode ?? DEFAULT_MODE).id;
let lastRun = null;
let shareCanvas = null;
// Die Erklärung vor der Runde kommt nur einmal je Sitzung – danach soll der
// nächste Versuch ohne Zwischenschritt starten.
const briefingSeen = new Set();

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
  if (name === 'modes') renderModes();
  if (name === 'rewards') renderRewards();
  // Ein scharfgeschalteter Reset gilt nur, solange der Screen sichtbar bleibt.
  if (name !== 'rewards') disarmReset();
  window.scrollTo({ top: 0 });
}

/* --------------------------------------------------------------- Rendering */

function renderHome() {
  $('#home-coins').textContent = profile.coins.toLocaleString('de-DE');
  $('#home-highscore').textContent = profile.highScore.toLocaleString('de-DE');
  $('#home-streak').textContent = profile.streak ?? 0;
  $('#home-rank').textContent = rankFor(profile.highScore).current.title;

  const note = $('#streak-note');
  if (streakAtRisk(profile)) {
    note.textContent = `🔥 Deine Serie steht bei ${profile.streak} Tagen – heute noch nicht gespielt.`;
    note.hidden = false;
  } else {
    note.hidden = true;
  }

  $('#play-label').textContent = `${resolveMode(currentMode).title} spielen`;
  renderMissions();

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

function renderMissions() {
  const container = $('#mission-list');
  const missions = missionState(profile);
  container.innerHTML = '';

  for (const mission of missions) {
    const percent = Math.round((mission.progress / mission.target) * 100);
    const card = document.createElement('div');
    card.className = `mission${mission.done ? ' mission--done' : ''}`;
    card.innerHTML = `
      <div class="mission__head">
        <span class="mission__title">${mission.title}</span>
        <span class="mission__reward">${mission.done ? '✓' : `+${mission.reward}`}</span>
      </div>
      <div class="mission__bar"><span style="width:${Math.min(100, percent)}%"></span></div>
      <span class="mission__progress">${Math.min(mission.progress, mission.target).toLocaleString(
        'de-DE',
      )} / ${mission.target.toLocaleString('de-DE')}</span>
    `;
    container.appendChild(card);
  }

  const open = missions.filter((mission) => !mission.done).length;
  $('#mission-note').textContent =
    open === 0
      ? 'Alle Missionen erledigt – morgen gibt es drei neue.'
      : 'Missionscoins zählen gegen dasselbe Tageslimit wie erspielte Coins.';
}

/** Kleines Vorschaubild je Spiel, gezeichnet mit denselben Icons wie im Spiel. */
function modeIcon(mode) {
  const canvas = document.createElement('canvas');
  const size = 56;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawFood(ctx, mode.icon, size / 2, size / 2, size * 0.66);
  return canvas;
}

function renderModes() {
  $('#modes-coins').textContent = profile.coins.toLocaleString('de-DE');

  const grid = $('#mode-grid');
  grid.innerHTML = '';

  for (const mode of MODES) {
    const best = profile.modeScores?.[mode.id] ?? 0;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `mode${mode.id === currentMode ? ' mode--current' : ''}`;
    card.dataset.mode = mode.id;
    card.innerHTML = `
      <span class="mode__icon"></span>
      <span class="mode__body">
        <span class="mode__title">${mode.title}</span>
        <span class="mode__subtitle">${mode.subtitle}</span>
        <span class="mode__meta">
          <span class="mode__skill">${mode.skill}</span>
          <span class="mode__best">${best > 0 ? `Bestwert ${best.toLocaleString('de-DE')}` : 'noch ungespielt'}</span>
        </span>
      </span>
    `;
    card.querySelector('.mode__icon').appendChild(modeIcon(mode));
    grid.appendChild(card);
  }
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
        }</p>${reward.protein ? '<span class="reward__badge">High Protein</span>' : ''}
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

/** Legt für den gewählten Modus eine frische Spielinstanz an. */
function ensureGame() {
  if (game && game.config.id === currentMode) return game;

  game?.destroy();
  game = createGame(currentMode, $('#game-canvas'), {
    onUpdate: updateHud,
    onGameOver: handleGameOver,
  });

  // Prüfzugang für automatisierte Tests, nur mit ?debug in der Adresse.
  if (new URLSearchParams(window.location.search).has('debug')) {
    window.locoGame = game;
  }
  return game;
}

function selectMode(modeId) {
  currentMode = resolveMode(modeId).id;
  profile = { ...profile, lastMode: currentMode };
  persist();
}

function updateHud(state) {
  $('#hud-score').textContent = state.score.toLocaleString('de-DE');
  $('#hud-combo').textContent = `x${state.combo}`;
  $('#hud-strikes').innerHTML = Array.from({ length: state.maxStrikes ?? 3 }, (unused, index) =>
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
  const active = resolveMode(currentMode);
  $('#hud-mode').textContent = active.title;
  $('#controls-hint').textContent = active.subtitle;
  showScreen('play');
  const instance = ensureGame();
  // Layout steht erst nach dem Screen-Wechsel fest.
  requestAnimationFrame(() => instance.onResize());

  if (briefingSeen.has(currentMode)) {
    beginRound();
    return;
  }

  // Beim ersten Mal kurz erklären, danach geht es direkt los.
  const mode = resolveMode(currentMode);
  showOverlay('start', {
    title: mode.title,
    text: `${mode.subtitle}. Drei Fehler beenden die Runde.`,
    primary: 'Los geht\'s',
  });
}

function beginRound() {
  briefingSeen.add(currentMode);
  $('#game-overlay').hidden = true;
  ensureGame().start();
}

function handleGameOver(run) {
  const { score, perfects, closestMiss } = run;
  const now = new Date();

  const result = applyGameResult(profile, score, now, run.mode ?? currentMode);
  profile = result.profile;

  const missions = applyMissionProgress(profile, run, now);
  profile = missions.profile;
  persist();

  lastRun = { ...run, isRecord: result.isNewRecord, streak: result.streak };

  $('#result-title').textContent = resolveMode(run.mode ?? currentMode).title;
  $('#result-score').textContent = score.toLocaleString('de-DE');
  $('#result-perfects').textContent = perfects;
  $('#result-miss').textContent =
    closestMiss === null ? '–' : `${closestMiss.toFixed(2).replace('.', ',')} s`;

  const missionBox = $('#result-missions');
  if (missions.completed.length > 0) {
    missionBox.innerHTML = missions.completed
      .map((mission) => `<p class="result__mission">✓ ${mission.title}</p>`)
      .join('');
    missionBox.hidden = false;
  } else {
    missionBox.hidden = true;
  }
  $('#result-coins').innerHTML = `+${result.earned}${COIN_ICON}`;
  $('#result-balance').innerHTML = `${profile.coins.toLocaleString('de-DE')}${COIN_ICON}`;
  const badge = $('#result-badge');
  badge.hidden = !(result.isNewRecord || result.isModeRecord);
  badge.textContent = result.isNewRecord ? 'Neuer Rekord! 🏆' : 'Bestwert in diesem Spiel! 🏆';

  if (result.rankUp) toast(`Neuer Rang: ${result.rankUp.title}!`);
  else if (missions.completed.length > 0) toast(`Mission geschafft: +${missions.coins} Coins`);

  // Erklären, warum es weniger Coins gab als die Punkte hergeben würden.
  const note = $('#result-note');
  if (result.cappedAway > 0) {
    note.textContent = `Tageslimit erreicht: ${result.cappedAway} Coins konnten heute nicht mehr gutgeschrieben werden.`;
    note.hidden = false;
  } else if (result.earned === 0 && missions.coins === 0) {
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

async function openShare() {
  if (!lastRun) return;
  shareCanvas = renderShareCard({
    score: lastRun.score,
    perfects: lastRun.perfects,
    bestCombo: lastRun.bestCombo,
    rank: rankFor(profile.highScore).current.title,
    streak: lastRun.streak ?? profile.streak ?? 0,
    isRecord: Boolean(lastRun.isRecord),
  });
  $('#share-image').src = shareCanvas.toDataURL('image/png');
  $('#share-sheet').hidden = false;
}

function closeShare() {
  $('#share-sheet').hidden = true;
}

async function sendShare() {
  if (!shareCanvas) return;
  const text = `${lastRun.score.toLocaleString('de-DE')} Punkte bei Loco Fryer. Schaffst du mehr?`;
  const outcome = await shareCard(shareCanvas, text);
  if (outcome === 'copied') toast('Ergebnis in die Zwischenablage kopiert.');
  if (outcome === 'manual') toast('Bild lange gedrückt halten, um es zu speichern.');
}

/**
 * High-Protein-Schiene mit den tatsächlichen Angaben aus brand.js.
 * Bewusst getrennt formuliert: Der Designer Whey ist die Kooperation mit ESN,
 * das Kreatin-Flavour ist ein eigenes Produkt von Loco Chicken.
 */
function renderProteinCard() {
  $('#brand-claim').textContent = BRAND.claim;
  $('#protein-kicker').textContent = `High Protein × ${PROTEIN.partner}`;
  $('#protein-title').textContent = PROTEIN.whey.name;
  $('#protein-text').innerHTML =
    `<span class="protein-card__value">${PROTEIN.whey.proteinPerServing} g Protein</span> und ` +
    `${PROTEIN.whey.kcalPerServing} kcal je Portion (${PROTEIN.whey.serving}). ` +
    `Dazu gibt es das ${PROTEIN.creatineSeasoning.name} mit ` +
    `${PROTEIN.creatineSeasoning.creatinePerPacket} g pro Tütchen.`;
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
$('#share-button').addEventListener('click', openShare);
$('#modes-button').addEventListener('click', () => showScreen('modes'));
$('#other-mode-button').addEventListener('click', () => showScreen('modes'));

$('#mode-grid').addEventListener('click', (event) => {
  const card = event.target.closest('[data-mode]');
  if (!card) return;
  selectMode(card.dataset.mode);
  startGame();
});
$('#share-send').addEventListener('click', sendShare);
$('#share-close').addEventListener('click', closeShare);

// "Noch eine Runde" soll so wenig Reibung wie möglich haben.
window.addEventListener('keydown', (event) => {
  const onResult = SCREENS.over.classList.contains('screen--active');
  if (onResult && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    startGame();
  }
});

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
  if (tab.dataset.screen === 'play') showScreen('modes');
  else showScreen(tab.dataset.screen);
});

// Wechselt der Nutzer die App oder den Tab, wird das Spiel pausiert.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});

/* --------------------------------------------------------------------- Start */

updateMuteButton();
renderProteinCard();
renderHome();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* Offline-Support ist optional */
    });
  });
}
