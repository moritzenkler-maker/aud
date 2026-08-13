/**
 * "Loco Fryer" – das Kernspiel der Loco Chicken App.
 *
 * Timing-Spiel an der Fritteuse: Hähnchenteile fallen in die Körbe und garen
 * vor sich hin. Wer im schmalen goldenen Moment zieht, bekommt "Perfekt" und
 * baut die Combo aus. Wer zu früh zieht, verliert die Combo. Wer zu spät
 * zieht, verbrennt das Teil – dreimal verbrannt und die Schicht ist vorbei.
 *
 * Der goldene Moment liegt bewusst direkt vor dem Verbrennen: Warten bringt
 * Punkte und Risiko zugleich. Punkte gibt es ausschließlich für Können, nicht
 * für Spielzeit – deshalb sind hohe Ergebnisse selten und Coins entsprechend
 * wertvoll.
 *
 * Gezeichnet wird prozedural auf einem Canvas im Marken-Look.
 */

import { sfx } from './audio.js';

const VIRTUAL_WIDTH = 360;
const SLOT_COLUMNS = 2;
const SLOT_ROWS = 3;
const SLOT_COUNT = SLOT_COLUMNS * SLOT_ROWS;
const START_STRIKES = 3;

/* Punktwerte -------------------------------------------------------------- */

const PERFECT_POINTS = 100;
const GOOD_POINTS = 20;
const HOT_STREAK_BONUS = 500; // alle fünf Perfekt-Treffer in Folge
const HOT_STREAK_STEP = 5;
const MAX_COMBO = 10;

/* Schwierigkeitskurve ------------------------------------------------------
 * `ramp` läuft von 0 (Rundenstart) bis 1 (ab RAMP_PIECES servierten Teilen).
 * Alles wird dazwischen linear interpoliert.                                */

const RAMP_PIECES = 45;
const COOK_TIME = { start: 3.4, end: 1.6 };
const SPAWN_INTERVAL = { start: 1.5, end: 0.6 };
const PERFECT_WINDOW = { start: 0.18, end: 0.075 };
const GOOD_ZONE_START = 0.5; // ab hier ist ein Teil essbar, davor roh

/** Markenfarben – Gegenstück zu den CSS-Variablen in styles.css. */
const PALETTE = {
  ink: '#12100e',
  red: '#d91f26',
  yellow: '#ffdd00',
  yellowDark: '#f5c400',
  paper: '#ffffff',
  oil: '#3d2b16',
  oilDark: '#2a1d0f',
  basket: '#8a8f96',
  steel: '#c9ced4',
  basketDark: '#5f656c',
  raw: '#f4e0b4',
  golden: '#eda52f',
  deep: '#b4651a',
  burnt: '#2f2620',
  green: '#43a047',
};

/** Die drei Teile garen unterschiedlich schnell – reine Rhythmus-Routine
 *  reicht dadurch nicht aus. */
const PIECE_TYPES = [
  { id: 'nugget', cookFactor: 0.85 },
  { id: 'wing', cookFactor: 1 },
  { id: 'tender', cookFactor: 1.18 },
];

const lerp = (from, to, t) => from + (to - from) * t;

/** Mischt zwei Hex-Farben; `t` läuft von 0 bis 1. */
function mixColor(from, to, t) {
  const parse = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const channel = (a, b) => Math.round(lerp(a, b, Math.max(0, Math.min(1, t))));
  return `rgb(${channel(r1, r2)},${channel(g1, g2)},${channel(b1, b2)})`;
}

export default class LocoFryer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{onUpdate?: Function, onGameOver?: Function}} handlers
   */
  constructor(canvas, handlers = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.handlers = handlers;

    this.running = false;
    this.paused = false;
    this.frame = null;
    this.lastTime = 0;

    this.vw = VIRTUAL_WIDTH;
    this.vh = 640;
    this.scale = 1;

    this.onResize = this.onResize.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.loop = this.loop.bind(this);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    canvas.addEventListener('pointerdown', this.onPointerDown);

    this.reset();
    this.onResize();
  }

  /* ---------------------------------------------------------------- Setup */

  reset() {
    this.score = 0;
    this.strikes = 0;
    this.combo = 1;
    this.perfectStreak = 0;
    this.bestPerfectStreak = 0;
    this.perfects = 0;
    this.perfectsByType = { nugget: 0, wing: 0, tender: 0 };
    this.bestCombo = 1;
    this.burns = 0;
    this.closestMiss = null; // knappster verpasster Perfekt-Treffer in Sekunden
    this.served = 0;
    this.spawnTimer = 0.6;
    this.time = 0;
    this.shake = 0;
    this.flash = 0;
    this.slots = Array.from({ length: SLOT_COUNT }, () => null);
    this.particles = [];
    this.popups = [];
    this.bubbles = Array.from({ length: 26 }, () => this.createBubble(true));
    this.gameOver = false;
  }

  onResize() {
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

    this.layout();
    if (!this.running) this.draw();
  }

  /** Legt Fritteuse und Korbraster für die aktuelle Höhe fest. */
  layout() {
    const top = Math.max(96, this.vh * 0.16);
    const bottom = this.vh - Math.max(120, this.vh * 0.14);
    this.basin = { x: 22, y: top, width: this.vw - 44, height: Math.max(240, bottom - top) };

    const cellWidth = this.basin.width / SLOT_COLUMNS;
    const cellHeight = this.basin.height / SLOT_ROWS;
    this.slotRadius = Math.min(cellWidth, cellHeight) * 0.34;

    this.slotPositions = Array.from({ length: SLOT_COUNT }, (unused, index) => ({
      x: this.basin.x + cellWidth * (0.5 + (index % SLOT_COLUMNS)),
      y: this.basin.y + cellHeight * (0.5 + Math.floor(index / SLOT_COLUMNS)),
    }));
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
  }

  /* -------------------------------------------------------------- Ablauf */

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

    this.update(dt);
    this.draw();

    this.frame = requestAnimationFrame(this.loop);
  }

  /* ------------------------------------------------------- Schwierigkeit */

  get ramp() {
    return Math.min(1, this.served / RAMP_PIECES);
  }

  get perfectWindow() {
    return lerp(PERFECT_WINDOW.start, PERFECT_WINDOW.end, this.ramp);
  }

  /* -------------------------------------------------------------- Update */

  update(dt) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 4);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnPiece();
      this.spawnTimer = lerp(SPAWN_INTERVAL.start, SPAWN_INTERVAL.end, this.ramp);
    }

    for (const [index, piece] of this.slots.entries()) {
      if (!piece) continue;
      piece.elapsed += dt;
      piece.progress = piece.elapsed / piece.cookTime;
      if (piece.progress > 1) this.burn(index);
    }

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

    for (const bubble of this.bubbles) {
      bubble.y -= bubble.speed * dt;
      bubble.x += Math.sin(this.time * bubble.wobble) * 6 * dt;
      if (bubble.y < this.basin.y) Object.assign(bubble, this.createBubble(false));
    }

    this.emitUpdate();
  }

  createBubble(spread) {
    const basin = this.basin ?? { x: 22, y: 100, width: VIRTUAL_WIDTH - 44, height: 300 };
    return {
      x: basin.x + Math.random() * basin.width,
      y: basin.y + (spread ? Math.random() : 1) * basin.height,
      radius: 1.5 + Math.random() * 3,
      speed: 14 + Math.random() * 26,
      wobble: 1 + Math.random() * 3,
    };
  }

  spawnPiece() {
    const free = this.slots.flatMap((piece, index) => (piece ? [] : [index]));
    // Alle Körbe belegt: Der Gast muss erst abarbeiten, es kommt nichts nach.
    if (free.length === 0) return;

    const slot = free[Math.floor(Math.random() * free.length)];
    const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];

    this.slots[slot] = {
      type: type.id,
      cookTime: lerp(COOK_TIME.start, COOK_TIME.end, this.ramp) * type.cookFactor,
      elapsed: 0,
      progress: 0,
      spin: Math.random() * Math.PI,
      dropped: 0,
    };
    sfx.sizzle();
  }

  /* --------------------------------------------------------- Interaktion */

  /** Zieht das Teil aus einem Korb und wertet den Zeitpunkt aus. */
  pull(slotIndex) {
    if (!this.running || this.paused || this.gameOver) return;
    const piece = this.slots[slotIndex];
    if (!piece) return;

    const position = this.slotPositions[slotIndex];
    const perfectFrom = 1 - this.perfectWindow;

    if (piece.progress >= perfectFrom) {
      this.scorePerfect(slotIndex, position, piece);
      return;
    }

    // Wie knapp war es? Der Abstand zum goldenen Fenster in Sekunden ist die
    // ehrlichste Rückmeldung – und der Grund, es sofort nochmal zu versuchen.
    const missedBy = (perfectFrom - piece.progress) * piece.cookTime;
    if (this.closestMiss === null || missedBy < this.closestMiss) this.closestMiss = missedBy;

    if (piece.progress >= GOOD_ZONE_START) {
      this.scoreGood(slotIndex, position, missedBy);
    } else {
      this.scoreRaw(slotIndex, position, missedBy);
    }
  }

  /** Sekunden als "0,42 s" – kurz genug für ein Popup mitten im Spiel. */
  formatMiss(seconds) {
    return `${seconds.toFixed(2).replace('.', ',')} s zu früh`;
  }

  /** Kurzes Rütteln, wo das Gerät es kann. Auf dem Handy trägt das viel. */
  buzz(pattern) {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* Haptik ist optional */
    }
  }

  scorePerfect(slotIndex, position, piece) {
    this.slots[slotIndex] = null;
    this.served += 1;
    this.perfects += 1;
    this.perfectsByType[piece.type] = (this.perfectsByType[piece.type] ?? 0) + 1;
    this.perfectStreak += 1;
    this.bestPerfectStreak = Math.max(this.bestPerfectStreak, this.perfectStreak);

    this.score += PERFECT_POINTS * this.combo;
    this.popup(position, 'PERFEKT!', PALETTE.yellow, 1.25);
    this.burst(position, PALETTE.yellow, 18, 210);
    this.flash = 0.6;
    sfx.perfect(this.combo);
    this.buzz(12);

    if (this.combo < MAX_COMBO) this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);

    if (this.perfectStreak > 0 && this.perfectStreak % HOT_STREAK_STEP === 0) {
      this.score += HOT_STREAK_BONUS;
      this.popup({ x: position.x, y: position.y - 26 }, `HEISS! +${HOT_STREAK_BONUS}`, PALETTE.red, 1.1);
      this.burst(position, PALETTE.red, 22, 260);
      sfx.hotStreak();
    }
  }

  scoreGood(slotIndex, position, missedBy) {
    this.slots[slotIndex] = null;
    this.served += 1;
    // Brauchbar, aber kein Ausbau der Combo – nur Perfekt treibt die Runde.
    this.score += GOOD_POINTS * this.combo;
    this.perfectStreak = 0;
    this.popup(position, this.formatMiss(missedBy), PALETTE.paper, 0.8);
    this.burst(position, PALETTE.golden, 8, 140);
    sfx.good();
  }

  scoreRaw(slotIndex, position, missedBy) {
    this.slots[slotIndex] = null;
    this.served += 1;
    // Zu früh gezogen: Das Teil ist hin, die Combo fällt zurück.
    this.combo = 1;
    this.perfectStreak = 0;
    this.popup(position, this.formatMiss(missedBy), PALETTE.raw, 0.85);
    this.burst(position, PALETTE.raw, 8, 130);
    sfx.raw();
  }

  burn(slotIndex) {
    const position = this.slotPositions[slotIndex];
    this.slots[slotIndex] = null;
    this.served += 1;
    this.strikes += 1;
    this.burns += 1;
    this.combo = 1;
    this.perfectStreak = 0;
    this.shake = 1;
    this.popup(position, 'VERBRANNT', PALETTE.red, 1.1);
    this.smoke(position);
    sfx.burnt();
    this.buzz([50, 40, 50]);

    if (this.strikes >= START_STRIKES) this.endGame();
  }

  endGame() {
    this.gameOver = true;
    this.stop();
    sfx.gameOver();
    this.handlers.onGameOver?.({
      score: Math.floor(this.score),
      perfects: this.perfects,
      perfectsByType: { ...this.perfectsByType },
      bestCombo: this.bestCombo,
      bestPerfectStreak: this.bestPerfectStreak,
      burns: this.burns,
      served: this.served,
      closestMiss: this.closestMiss,
    });
  }

  emitUpdate() {
    this.handlers.onUpdate?.({
      score: Math.floor(this.score),
      strikes: this.strikes,
      combo: this.combo,
      perfects: this.perfects,
    });
  }

  /* --------------------------------------------------------------- Juice */

  popup(position, text, color, size) {
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
    for (let i = 0; i < 14; i += 1) {
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

  /* ------------------------------------------------------------- Eingabe */

  onPointerDown(event) {
    if (!this.running || this.paused) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * this.vw;
    const y = ((event.clientY - rect.top) / rect.width) * this.vw;

    for (const [index, position] of this.slotPositions.entries()) {
      const distance = Math.hypot(position.x - x, position.y - y);
      // Großzügiger Trefferbereich – gefragt ist Timing, nicht Zielgenauigkeit.
      if (distance <= this.slotRadius * 1.55) {
        this.pull(index);
        return;
      }
    }
  }

  onKeyDown(event) {
    // Tasten 1-6 entsprechen den Körben von links oben nach rechts unten.
    const index = Number.parseInt(event.key, 10) - 1;
    if (Number.isInteger(index) && index >= 0 && index < SLOT_COUNT) {
      this.pull(index);
      event.preventDefault();
    }
  }

  /* --------------------------------------------------------------- Render */

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (this.shake > 0) {
      const amount = this.shake * 6;
      ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
    }

    this.drawKitchen(ctx);
    this.drawBasin(ctx);
    for (const [index, piece] of this.slots.entries()) this.drawSlot(ctx, index, piece);
    this.drawParticles(ctx);
    this.drawPopups(ctx);

    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.16;
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(0, 0, this.vw, this.vh);
      ctx.globalAlpha = 1;
    }
  }

  outline(ctx, width = 3) {
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  drawKitchen(ctx) {
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(0, 0, this.vw, this.vh);

    // Edelstahl-Rückwand: ruhige Fläche, damit HUD und Körbe die Bühne haben
    const wallHeight = this.basin.y - 30;
    ctx.fillStyle = PALETTE.steel;
    ctx.fillRect(0, 0, this.vw, wallHeight);
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 2;
    for (let y = 12; y < wallHeight; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.vw, y);
      ctx.stroke();
    }

    // Karo-Streifen als Marken-Zitat direkt über der Fritteuse
    const tile = 12;
    for (let x = 0, column = 0; x < this.vw; x += tile, column += 1) {
      ctx.fillStyle = column % 2 === 0 ? PALETTE.red : PALETTE.paper;
      ctx.fillRect(x, wallHeight, tile, tile);
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, wallHeight - 3, this.vw, 3);
    ctx.fillRect(0, wallHeight + tile, this.vw, 3);
  }

  drawBasin(ctx) {
    const { x, y, width, height } = this.basin;

    // Stahlrahmen
    ctx.fillStyle = PALETTE.basketDark;
    this.roundedRect(ctx, x - 10, y - 10, width + 20, height + 20, 20);
    ctx.fill();
    this.outline(ctx, 4);

    // Öl
    ctx.fillStyle = PALETTE.oil;
    this.roundedRect(ctx, x, y, width, height, 14);
    ctx.fill();
    this.outline(ctx, 3);

    ctx.save();
    this.roundedRect(ctx, x, y, width, height, 14);
    ctx.clip();

    for (const bubble of this.bubbles) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = PALETTE.yellowDark;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawSlot(ctx, index, piece) {
    const { x, y } = this.slotPositions[index];
    const radius = this.slotRadius;

    // Korbmulde
    ctx.fillStyle = PALETTE.oilDark;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.basket;
    ctx.lineWidth = 3;
    ctx.stroke();

    if (!piece) return;

    const perfectFrom = 1 - this.perfectWindow;
    const inPerfect = piece.progress >= perfectFrom;

    // Garring: dunkle Rille, goldene Zielzone, heller Zeiger obenauf
    const ringRadius = radius * 1.38;

    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = PALETTE.yellow;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, this.angle(perfectFrom), this.angle(1));
    ctx.stroke();

    ctx.strokeStyle = inPerfect ? PALETTE.paper : mixColor(PALETTE.green, PALETTE.red, piece.progress);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, this.angle(0), this.angle(Math.min(piece.progress, 1)));
    ctx.stroke();

    if (inPerfect) {
      // Pulsierender Hof, damit der goldene Moment nicht zu übersehen ist
      const pulse = 0.5 + Math.sin(this.time * 22) * 0.5;
      ctx.globalAlpha = 0.25 + pulse * 0.35;
      ctx.fillStyle = PALETTE.yellow;
      ctx.beginPath();
      ctx.arc(x, y, ringRadius + 4 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    this.drawPiece(ctx, piece, x, y, radius);
  }

  /** Winkel auf dem Garring, Start oben. */
  angle(progress) {
    return -Math.PI / 2 + progress * Math.PI * 2;
  }

  /**
   * Farbe nach Garzustand: blass -> golden -> kräftig gebräunt.
   * Im perfekten Moment sieht das Teil bewusst am appetitlichsten aus –
   * schwarz wird es erst beim Verbrennen, und das ist dann ohnehin vorbei.
   */
  pieceColor(progress) {
    if (progress < 0.55) return mixColor(PALETTE.raw, PALETTE.golden, progress / 0.55);
    return mixColor(PALETTE.golden, PALETTE.deep, (progress - 0.55) / 0.45);
  }

  drawPiece(ctx, piece, x, y, radius) {
    const color = this.pieceColor(piece.progress);
    const wobble = Math.sin(this.time * 6 + piece.spin) * 0.08;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(wobble);
    ctx.fillStyle = color;

    if (piece.type === 'nugget') {
      const size = radius * 1.85;
      ctx.beginPath();
      ctx.moveTo(-size / 2, -size / 5);
      ctx.quadraticCurveTo(-size / 2.4, -size / 2, 0, -size / 2.4);
      ctx.quadraticCurveTo(size / 2.2, -size / 2.2, size / 2, -size / 6);
      ctx.quadraticCurveTo(size / 2.2, size / 2.4, 0, size / 2.6);
      ctx.quadraticCurveTo(-size / 2.4, size / 2.4, -size / 2, -size / 5);
      ctx.closePath();
      ctx.fill();
      this.outline(ctx);
    } else if (piece.type === 'tender') {
      const width = radius * 1.05;
      const height = radius * 2.15;
      this.roundedRect(ctx, -width / 2, -height / 2, width, height, width / 2);
      ctx.fill();
      this.outline(ctx);
    } else {
      // Keule: Fleisch mit kurzem Knochen und Knauf
      const boneTip = { x: radius * 0.72, y: -radius * 0.74 };
      ctx.save();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(radius * 0.3, -radius * 0.28);
      ctx.lineTo(boneTip.x, boneTip.y);
      ctx.stroke();
      ctx.strokeStyle = '#f7f1e0';
      ctx.lineWidth = 7;
      ctx.stroke();

      ctx.fillStyle = '#f7f1e0';
      ctx.beginPath();
      ctx.arc(boneTip.x, boneTip.y, radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
      this.outline(ctx);
      ctx.restore();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, radius * 0.2, radius * 0.82, radius * 0.72, 0.25, 0, Math.PI * 2);
      ctx.fill();
      this.outline(ctx);
    }

    ctx.restore();
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 2));
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
      const fade = Math.min(1, popup.life * 2.4);
      const size = 20 * popup.size;
      ctx.globalAlpha = fade;
      ctx.font = `italic 900 ${size}px 'Arial Black', 'Segoe UI', Impact, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = PALETTE.ink;
      ctx.strokeText(popup.text, popup.x, popup.y);
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
  }

  roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }
}
