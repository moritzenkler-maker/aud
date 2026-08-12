/**
 * Minimaler Sound-Layer auf Basis der Web Audio API.
 * Es werden keine Audio-Dateien geladen – alle Töne werden synthetisiert.
 */

const MUTE_KEY = 'loco-chicken:muted';

let ctx = null;
let muted = false;

try {
  muted = window.localStorage.getItem(MUTE_KEY) === '1';
} catch {
  muted = false;
}

function context() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // Browser starten den Context erst nach einer Nutzerinteraktion.
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq, duration = 0.12, type = 'square', gain = 0.05, sweepTo = null }) {
  if (muted) return;
  const audio = context();
  if (!audio) return;

  const osc = audio.createOscillator();
  const amp = audio.createGain();
  const now = audio.currentTime;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, now + duration);

  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(amp).connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export const sfx = {
  collect: () => tone({ freq: 660, sweepTo: 990, duration: 0.1 }),
  bonus: () => tone({ freq: 880, sweepTo: 1320, duration: 0.18, type: 'triangle', gain: 0.06 }),
  hit: () => tone({ freq: 220, sweepTo: 80, duration: 0.28, type: 'sawtooth', gain: 0.07 }),
  gameOver: () => {
    tone({ freq: 400, sweepTo: 150, duration: 0.5, type: 'triangle', gain: 0.07 });
  },
  ui: () => tone({ freq: 520, duration: 0.06, gain: 0.03 }),
};

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* Speichern ist optional */
  }
  return muted;
}
