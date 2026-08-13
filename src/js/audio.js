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

/** Spielt mehrere Töne nacheinander ab (kleine Fanfaren). */
function sequence(steps) {
  steps.forEach((step, index) => {
    setTimeout(() => tone(step), index * (step.gap ?? 70));
  });
}

export const sfx = {
  /** Ein Teil fällt ins Öl. */
  sizzle: () => tone({ freq: 1400, sweepTo: 900, duration: 0.05, type: 'triangle', gain: 0.02 }),

  /** Perfekt gezogen – die Tonhöhe steigt mit der Combo. */
  perfect: (combo = 1) => {
    const base = 620 + Math.min(combo, 10) * 55;
    tone({ freq: base, sweepTo: base * 1.5, duration: 0.14, type: 'triangle', gain: 0.06 });
    setTimeout(() => tone({ freq: base * 2, duration: 0.08, type: 'square', gain: 0.025 }), 60);
  },

  /** Brauchbar, aber nicht perfekt. */
  good: () => tone({ freq: 480, duration: 0.09, type: 'square', gain: 0.035 }),

  /** Zu früh gezogen. */
  raw: () => tone({ freq: 200, sweepTo: 140, duration: 0.14, type: 'sine', gain: 0.05 }),

  /** Verbrannt. */
  burnt: () => tone({ freq: 150, sweepTo: 60, duration: 0.34, type: 'sawtooth', gain: 0.07 }),

  /** Fünf Perfekt-Treffer in Folge. */
  hotStreak: () =>
    sequence([
      { freq: 660, duration: 0.09, type: 'triangle', gain: 0.05 },
      { freq: 880, duration: 0.09, type: 'triangle', gain: 0.05 },
      { freq: 1320, duration: 0.16, type: 'triangle', gain: 0.06 },
    ]),

  bonus: () => tone({ freq: 880, sweepTo: 1320, duration: 0.18, type: 'triangle', gain: 0.06 }),

  gameOver: () =>
    sequence([
      { freq: 420, duration: 0.16, type: 'triangle', gain: 0.06, gap: 130 },
      { freq: 320, duration: 0.16, type: 'triangle', gain: 0.06, gap: 130 },
      { freq: 190, sweepTo: 110, duration: 0.5, type: 'triangle', gain: 0.07, gap: 130 },
    ]),

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
