/**
 * Gemeinsame Basis aller Spielmodi.
 *
 * Kümmert sich um alles, was jeder Modus gleich braucht: Spielschleife,
 * Auflösung, virtuelles Koordinatensystem, Eingaben, Partikel, Popups,
 * Combo-Buchführung und die Übergabe an die App. Ein Modus muss dadurch nur
 * noch seine eigene Mechanik beschreiben.
 *
 * Ein Modus überschreibt:
 *   setup()          – Zustand zu Rundenbeginn
 *   layout()         – Positionen nach einer Größenänderung
 *   update(dt)       – Spiellogik
 *   render(ctx)      – Zeichnen
 *   onPointer(x, y)  – Tipp in virtuellen Koordinaten
 *   onKey(key)       – Tastatur (optional, für den Desktop)
 *
 * und meldet Ergebnisse über hit() und fail().
 */

import { sfx } from '../audio.js';

export const VIRTUAL_WIDTH = 360;

/**
 * Farben der Spielfläche – Gegenstück zu den CSS-Variablen in styles.css.
 * Der Raum ist der Laden am Abend: dunkle Fliesen, gebürsteter Stahl,
 * warmes Licht von oben. Die Marke setzt Akzente, sie flutet nicht die Fläche.
 */
export const PALETTE = {
  ink: '#12100e',
  red: '#d91f26',
  redBright: '#f0323a',
  redDark: '#8f1116',
  yellow: '#ffdd00',
  yellowDark: '#f5c400',
  paper: '#ffffff',
  cream: '#fff6dc',

  // Raum
  room: '#191512',
  roomDeep: '#0e0c0b',
  tile: '#221d19',
  tileLight: '#2c2621',
  grout: '#15110f',
  steel: '#9aa0a6',
  steelMid: '#6b7076',
  steelDark: '#3a3d41',

  // Ware
  oil: '#4a3316',
  oilDark: '#2e1f0d',
  raw: '#f4e0b4',
  golden: '#e6a233',
  deep: '#b4651a',
  burnt: '#2f2620',
  green: '#43a047',
  blue: '#2e5fa3',
  bun: '#e0a75a',
  cheese: '#f7b731',
};

export const lerp = (from, to, t) => from + (to - from) * t;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Mischt zwei Hex-Farben; `t` läuft von 0 bis 1. */
export function mixColor(from, to, t) {
  const parse = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const channel = (a, b) => Math.round(lerp(a, b, clamp(t, 0, 1)));
  return `rgb(${channel(r1, r2)},${channel(g1, g2)},${channel(b1, b2)})`;
}

export default class GameBase {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{onUpdate?: Function, onGameOver?: Function}} handlers
   * @param {object} config Modus-Konfiguration aus modes.js
   */
  constructor(canvas, handlers = {}, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.handlers = handlers;
    this.config = config;

    this.running = false;
    this.paused = false;
    this.frame = null;
    this.lastTime = 0;

    this.vw = VIRTUAL_WIDTH;
    this.vh = 640;
    this.scale = 1;

    this.handleResize = this.handleResize.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.loop = this.loop.bind(this);

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    canvas.addEventListener('pointerdown', this.handlePointerDown);

    this.reset();
    this.handleResize();
  }

  /* ------------------------------------------------------------ Rahmen */

  get maxStrikes() {
    return this.config.strikes ?? 3;
  }

  get maxCombo() {
    return this.config.maxCombo ?? 8;
  }

  /** Läuft von 0 (Rundenstart) bis 1 (ab `rampItems` bearbeiteten Objekten). */
  get ramp() {
    return Math.min(1, this.stats.served / (this.config.rampItems ?? 40));
  }

  reset() {
    this.score = 0;
    this.strikes = 0;
    this.combo = 1;
    this.perfectStreak = 0;
    this.time = 0;
    this.shake = 0;
    this.flash = 0;
    this.particles = [];
    this.popups = [];
    this.gameOver = false;
    this.stats = {
      perfects: 0,
      bestCombo: 1,
      bestPerfectStreak: 0,
      burns: 0,
      served: 0,
      perfectsByType: {},
      closestMiss: null,
    };
    this.setup?.();
  }

  handleResize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = rect.width || this.canvas.clientWidth || VIRTUAL_WIDTH;
    const cssHeight = rect.height || this.canvas.clientHeight || 640;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);

    // Virtuelle Höhe folgt dem Seitenverhältnis, damit nichts verzerrt wird.
    this.vw = VIRTUAL_WIDTH;
    this.vh = (VIRTUAL_WIDTH * cssHeight) / cssWidth;
    this.scale = (cssWidth * dpr) / VIRTUAL_WIDTH;

    this.layout?.();
    if (!this.running) this.draw();
  }

  /** Von der App genutzt, damit alle Modi dieselbe Schnittstelle haben. */
  onResize() {
    this.handleResize();
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
  }

  start() {
    this.reset();
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.loop);
    this.emitUpdate();
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.loop);
  }

  loop(now) {
    if (!this.running || this.paused) return;
    // Nach Tab-Wechseln kann der Delta-Wert sehr groß werden – deckeln.
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 4);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);

    this.update?.(dt);
    this.updateEffects(dt);
    this.draw();

    this.frame = requestAnimationFrame(this.loop);
  }

  /* ----------------------------------------------------------- Wertung */

  /**
   * Erfolgreicher Zug.
   * `perfect` unterscheidet den Bestfall (treibt Combo und Statistik) vom
   * brauchbaren Zug (bringt wenig und lässt die Combo stehen).
   */
  hit({ position, points, perfect = true, label, color = PALETTE.yellow, type }) {
    this.stats.served += 1;
    this.score += points * this.combo;

    if (perfect) {
      this.stats.perfects += 1;
      this.perfectStreak += 1;
      this.stats.bestPerfectStreak = Math.max(this.stats.bestPerfectStreak, this.perfectStreak);
      if (type) this.stats.perfectsByType[type] = (this.stats.perfectsByType[type] ?? 0) + 1;

      if (this.combo < this.maxCombo) this.combo += 1;
      this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);

      this.flash = 0.5;
      sfx.perfect(this.combo);
      this.buzz(12);

      const step = this.config.streakStep ?? 6;
      const bonus = this.config.streakBonus ?? 300;
      if (this.perfectStreak > 0 && this.perfectStreak % step === 0) {
        this.score += bonus;
        this.popup({ x: position.x, y: position.y - 28 }, `HEISS! +${bonus}`, PALETTE.red, 1.05);
        this.burst(position, PALETTE.red, 20, 250);
        sfx.hotStreak();
      }
    } else {
      this.perfectStreak = 0;
      sfx.good();
    }

    if (label) this.popup(position, label, color, perfect ? 1.2 : 0.85);
    this.burst(position, color, perfect ? 16 : 7, perfect ? 210 : 130);
    this.emitUpdate();
  }

  /**
   * Fehlzug. `strike: true` kostet ein Leben, sonst nur die Combo.
   */
  fail({ position, label, strike = true, color = PALETTE.red }) {
    this.stats.served += 1;
    this.combo = 1;
    this.perfectStreak = 0;

    if (label) this.popup(position, label, color, 1);
    this.burst(position, color, strike ? 16 : 8, strike ? 220 : 130);

    if (strike) {
      this.strikes += 1;
      this.stats.burns += 1;
      this.shake = 1;
      sfx.burnt();
      this.buzz([50, 40, 50]);
      if (this.strikes >= this.maxStrikes) {
        this.endGame();
        return;
      }
    } else {
      sfx.raw();
    }

    this.emitUpdate();
  }

  endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.stop();
    sfx.gameOver();
    this.handlers.onGameOver?.({
      score: Math.floor(this.score),
      mode: this.config.id,
      ...this.stats,
    });
  }

  emitUpdate() {
    this.handlers.onUpdate?.({
      score: Math.floor(this.score),
      strikes: this.strikes,
      maxStrikes: this.maxStrikes,
      combo: this.combo,
    });
  }

  /* -------------------------------------------------------------- Juice */

  popup(position, text, color, size = 1) {
    this.popups.push({ x: position.x, y: position.y, text, color, size, life: 0.85 });
  }

  burst(position, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const power = speed * (0.35 + Math.random() * 0.65);
      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power,
        gravity: 420,
        life: 0.4 + Math.random() * 0.35,
        size: 2.5 + Math.random() * 3.5,
        color,
      });
    }
  }

  smoke(position) {
    for (let i = 0; i < 12; i += 1) {
      this.particles.push({
        x: position.x + (Math.random() - 0.5) * 18,
        y: position.y,
        vx: (Math.random() - 0.5) * 40,
        vy: -40 - Math.random() * 60,
        gravity: -20,
        life: 0.6 + Math.random() * 0.5,
        size: 5 + Math.random() * 7,
        color: '#6b625a',
      });
    }
  }

  /** Kurzes Rütteln, wo das Gerät es kann. Auf dem Handy trägt das viel. */
  buzz(pattern) {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* Haptik ist optional */
    }
  }

  updateEffects(dt) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += particle.gravity * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);

    for (const popup of this.popups) {
      popup.life -= dt;
      popup.y -= 34 * dt;
    }
    this.popups = this.popups.filter((popup) => popup.life > 0);
  }

  /* -------------------------------------------------------------- Render */

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (this.shake > 0) {
      const amount = this.shake * 6;
      ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
    }

    this.render?.(ctx);
    this.drawParticles(ctx);
    this.drawPopups(ctx);

    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.16;
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(0, 0, this.vw, this.vh);
      ctx.globalAlpha = 1;
    }
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      ctx.globalAlpha = clamp(particle.life * 2, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawPopups(ctx) {
    ctx.textAlign = 'center';
    for (const popup of this.popups) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, popup.life * 2.4);
      ctx.font = `italic 900 ${20 * popup.size}px 'Arial Black', 'Segoe UI', Impact, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(popup.text, popup.x, popup.y);
      ctx.shadowColor = popup.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
  }

  /* ------------------------------------------------------------ Helfer */

  outline(ctx, width = 3) {
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  /**
   * Hintergrund, den sich alle Modi teilen: der Laden von hinten gesehen –
   * gefliste Wand, Karo-Bordüre, Edelstahltresen, warmes Licht von oben.
   */
  drawKitchen(ctx, wallHeight = 96) {
    // Tresen
    const counter = ctx.createLinearGradient(0, wallHeight, 0, this.vh);
    counter.addColorStop(0, PALETTE.room);
    counter.addColorStop(0.5, '#151210');
    counter.addColorStop(1, PALETTE.roomDeep);
    ctx.fillStyle = counter;
    ctx.fillRect(0, 0, this.vw, this.vh);

    // Gefliste Wand
    const tileWidth = 34;
    const tileHeight = 22;
    ctx.fillStyle = PALETTE.grout;
    ctx.fillRect(0, 0, this.vw, wallHeight);
    for (let row = 0, y = 0; y < wallHeight; row += 1, y += tileHeight) {
      const offset = row % 2 === 0 ? 0 : -tileWidth / 2;
      for (let x = offset; x < this.vw; x += tileWidth) {
        const shade = (row + Math.round(x / tileWidth)) % 3 === 0 ? PALETTE.tileLight : PALETTE.tile;
        ctx.fillStyle = shade;
        ctx.fillRect(x + 1, y + 1, tileWidth - 2, tileHeight - 2);
      }
    }

    // Lichtkegel der Wärmelampe
    const spot = ctx.createRadialGradient(this.vw / 2, -30, 10, this.vw / 2, wallHeight, this.vw * 0.9);
    spot.addColorStop(0, 'rgba(255, 208, 130, 0.30)');
    spot.addColorStop(1, 'rgba(255, 208, 130, 0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, this.vw, this.vh * 0.7);

    // Karo-Bordüre als Marken-Zitat
    const check = 11;
    for (let x = 0, column = 0; x < this.vw; x += check, column += 1) {
      ctx.fillStyle = column % 2 === 0 ? PALETTE.red : '#f2ece1';
      ctx.fillRect(x, wallHeight, check, check);
    }

    // Stahlkante des Tresens
    const edge = ctx.createLinearGradient(0, wallHeight + check, 0, wallHeight + check + 12);
    edge.addColorStop(0, PALETTE.steel);
    edge.addColorStop(0.4, PALETTE.steelMid);
    edge.addColorStop(1, PALETTE.steelDark);
    ctx.fillStyle = edge;
    ctx.fillRect(0, wallHeight + check, this.vw, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, wallHeight + check, this.vw, 2);

    // Abdunkelung zu den Rändern, damit die Mitte im Licht steht
    const vignette = ctx.createRadialGradient(
      this.vw / 2,
      this.vh * 0.45,
      this.vw * 0.3,
      this.vw / 2,
      this.vh * 0.45,
      this.vw * 0.95,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.vw, this.vh);
  }

  /** Zentrierter Text im Marken-Stil. */
  label(ctx, text, x, y, { size = 20, fill = PALETTE.cream, stroke = null, width = 4, glow = null } = {}) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `italic 900 ${size}px 'Arial Black', 'Segoe UI', Impact, sans-serif`;
    if (stroke) {
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.strokeText(text, x, y);
    }
    if (glow) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 16;
    }
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /* ------------------------------------------------------------ Eingabe */

  handlePointerDown(event) {
    if (!this.running || this.paused || this.gameOver) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * this.vw;
    const y = ((event.clientY - rect.top) / rect.width) * this.vw;
    this.onPointer?.(x, y);
  }

  handleKeyDown(event) {
    if (!this.running || this.paused || this.gameOver) return;
    if (this.onKey?.(event.key)) event.preventDefault();
  }
}
