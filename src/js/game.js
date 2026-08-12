/**
 * "Nugget Rush" – das Kernspiel der Loco Chicken App.
 *
 * Ein Drei-Spuren-Runner: Der Loco-Hahn rennt über die Straße, sammelt
 * Nuggets, Fries und Burger und weicht den Flammen aus. Gezeichnet wird alles
 * prozedural auf einem Canvas im Marken-Look (kräftiges Rot/Gelb, schwarze
 * Comic-Konturen, rot-weißes Karo) – es werden keine Bild-Assets benötigt.
 */

import { sfx } from './audio.js';

const LANES = 3;
const VIRTUAL_WIDTH = 360;
const ROAD_MARGIN = 30;
const PLAYER_SIZE = 52;
const START_SPEED = 240;
const MAX_SPEED = 620;
const SPEED_RAMP = 9; // Pixel pro Sekunde, die pro Sekunde dazukommen
const START_LIVES = 3;
const INVULNERABLE_TIME = 1.6;
const COMBO_STEP = 5; // Sammelobjekte bis zur nächsten Multiplikator-Stufe
const MAX_COMBO = 5;

/** Punktwerte der Sammelobjekte. */
const ITEM_POINTS = {
  nugget: 10,
  fries: 25,
  burger: 50,
};

/** Markenfarben – Gegenstück zu den CSS-Variablen in styles.css. */
const PALETTE = {
  ink: '#12100e',
  red: '#d91f26',
  redDark: '#a8161c',
  yellow: '#ffdd00',
  yellowDark: '#f5c400',
  paper: '#ffffff',
  road: '#2a2723',
  roadLine: '#ffffff',
  chicken: '#c47a33',
  chickenDark: '#9a5a22',
  vest: '#2e5fa3',
  beak: '#f5c400',
  nugget: '#f0a827',
  nuggetDark: '#c87d15',
  bun: '#e0a75a',
  cheese: '#f7b731',
  orange: '#ff8a1e',
};

const randomLane = () => Math.floor(Math.random() * LANES);

export default class NuggetRush {
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
    this.onPointerUp = this.onPointerUp.bind(this);
    this.loop = this.loop.bind(this);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);

    this.reset();
    this.onResize();
  }

  /* ---------------------------------------------------------------- Setup */

  reset() {
    this.score = 0;
    this.lives = START_LIVES;
    this.speed = START_SPEED;
    this.distance = 0;
    this.combo = 1;
    this.collectedSinceCombo = 0;
    this.invulnerable = 0;
    this.shake = 0;
    this.spawnTimer = 0;
    this.entities = [];
    this.particles = [];
    this.lane = 1;
    this.playerX = this.laneCenter(1);
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

    this.playerY = this.vh - 120;
    if (!this.running) this.draw();
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
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

  /* -------------------------------------------------------------- Update */

  update(dt) {
    this.speed = Math.min(MAX_SPEED, this.speed + SPEED_RAMP * dt);
    this.distance += this.speed * dt;
    this.score += this.speed * dt * 0.05;

    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 4);

    // Sanfte Bewegung zur Zielspur.
    const targetX = this.laneCenter(this.lane);
    this.playerX += (targetX - this.playerX) * Math.min(1, dt * 14);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnRow();
      // Je schneller das Spiel, desto dichter die Reihen.
      this.spawnTimer = Math.max(0.42, 260 / this.speed);
    }

    for (const entity of this.entities) {
      entity.y += this.speed * dt;
      entity.spin += dt * 3;
    }

    this.checkCollisions();
    this.entities = this.entities.filter((entity) => entity.y < this.vh + 60 && !entity.dead);

    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt + this.speed * dt * 0.5;
      particle.vy += 420 * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);

    this.emitUpdate();
  }

  spawnRow() {
    // Mindestens eine Spur bleibt immer frei.
    const freeLane = randomLane();
    for (let lane = 0; lane < LANES; lane += 1) {
      if (lane === freeLane) continue;
      const roll = Math.random();
      if (roll < 0.34) {
        this.entities.push(this.createEntity('flame', lane));
      } else if (roll < 0.4) {
        this.entities.push(this.createEntity('burger', lane));
      } else if (roll < 0.54) {
        this.entities.push(this.createEntity('fries', lane));
      } else if (roll < 0.84) {
        this.entities.push(this.createEntity('nugget', lane));
      }
    }
  }

  createEntity(type, lane) {
    return {
      type,
      lane,
      x: this.laneCenter(lane),
      y: -50 - Math.random() * 40,
      size: type === 'flame' ? 44 : 32,
      spin: Math.random() * Math.PI,
      dead: false,
    };
  }

  checkCollisions() {
    for (const entity of this.entities) {
      if (entity.dead || entity.lane !== this.lane) continue;

      const dy = Math.abs(entity.y - this.playerY);
      const hitRange = (entity.size + PLAYER_SIZE) * 0.4;
      if (dy > hitRange) continue;

      if (entity.type === 'flame') {
        if (this.invulnerable > 0) continue;
        this.takeHit(entity);
      } else {
        this.collect(entity);
      }
    }
  }

  collect(entity) {
    entity.dead = true;
    this.score += (ITEM_POINTS[entity.type] ?? ITEM_POINTS.nugget) * this.combo;

    this.collectedSinceCombo += 1;
    if (this.collectedSinceCombo >= COMBO_STEP && this.combo < MAX_COMBO) {
      this.combo += 1;
      this.collectedSinceCombo = 0;
      sfx.bonus();
    } else {
      sfx.collect();
    }

    this.burst(entity.x, entity.y, entity.type === 'nugget' ? PALETTE.nugget : PALETTE.yellow, 10);
  }

  takeHit(entity) {
    entity.dead = true;
    this.lives -= 1;
    this.combo = 1;
    this.collectedSinceCombo = 0;
    this.invulnerable = INVULNERABLE_TIME;
    this.shake = 1;
    this.burst(entity.x, entity.y, PALETTE.red, 16);
    sfx.hit();

    if (this.lives <= 0) this.endGame();
  }

  endGame() {
    this.gameOver = true;
    this.stop();
    sfx.gameOver();
    this.handlers.onGameOver?.({
      score: Math.floor(this.score),
      distance: Math.floor(this.distance / 10),
    });
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 260,
        vy: (Math.random() - 0.8) * 220,
        life: 0.4 + Math.random() * 0.3,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  emitUpdate() {
    this.handlers.onUpdate?.({
      score: Math.floor(this.score),
      lives: this.lives,
      combo: this.combo,
      distance: Math.floor(this.distance / 10),
    });
  }

  /* ------------------------------------------------------------ Steuerung */

  laneCenter(lane) {
    const usable = this.vw - ROAD_MARGIN * 2;
    return ROAD_MARGIN + (usable / LANES) * (lane + 0.5);
  }

  move(direction) {
    if (!this.running || this.paused || this.gameOver) return;
    const next = Math.min(LANES - 1, Math.max(0, this.lane + direction));
    if (next !== this.lane) {
      this.lane = next;
      sfx.ui();
    }
  }

  onKeyDown(event) {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
      this.move(-1);
      event.preventDefault();
    } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
      this.move(1);
      event.preventDefault();
    }
  }

  onPointerDown(event) {
    this.pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
  }

  onPointerUp(event) {
    if (!this.pointerStart) return;
    const dx = event.clientX - this.pointerStart.x;
    const elapsed = performance.now() - this.pointerStart.time;
    this.pointerStart = null;

    // Wischen bewegt in Wischrichtung, ein Tippen bewegt zur getippten Seite.
    if (Math.abs(dx) > 24 && elapsed < 600) {
      this.move(dx > 0 ? 1 : -1);
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.move(event.clientX - rect.left < rect.width / 2 ? -1 : 1);
  }

  /* --------------------------------------------------------------- Render */

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (this.shake > 0) {
      const amount = this.shake * 5;
      ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
    }

    this.drawRoad(ctx);
    for (const entity of this.entities) this.drawEntity(ctx, entity);
    this.drawParticles(ctx);
    this.drawPlayer(ctx);
  }

  /** Kontur im Comic-Stil der Marke. */
  outline(ctx, width = 3) {
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  drawRoad(ctx) {
    // Gelber Markenhintergrund neben der Fahrbahn
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(0, 0, this.vw, this.vh);

    ctx.fillStyle = PALETTE.road;
    ctx.fillRect(ROAD_MARGIN, 0, this.vw - ROAD_MARGIN * 2, this.vh);

    // Rot-weißer Karo-Bordstein wie das Papier im Chicken-Bucket
    const tile = 12;
    const offset = this.distance % (tile * 2);
    for (let y = -tile * 2 + offset, row = 0; y < this.vh; y += tile, row += 1) {
      for (const [index, x] of [ROAD_MARGIN - tile, this.vw - ROAD_MARGIN].entries()) {
        ctx.fillStyle = (row + index) % 2 === 0 ? PALETTE.red : PALETTE.paper;
        ctx.fillRect(x, y, tile, tile);
      }
    }

    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ROAD_MARGIN, 0);
    ctx.lineTo(ROAD_MARGIN, this.vh);
    ctx.moveTo(ROAD_MARGIN - tile, 0);
    ctx.lineTo(ROAD_MARGIN - tile, this.vh);
    ctx.moveTo(this.vw - ROAD_MARGIN, 0);
    ctx.lineTo(this.vw - ROAD_MARGIN, this.vh);
    ctx.moveTo(this.vw - ROAD_MARGIN + tile, 0);
    ctx.lineTo(this.vw - ROAD_MARGIN + tile, this.vh);
    ctx.stroke();

    // Fahrbahnmarkierung
    const stripeHeight = 42;
    const gap = 34;
    const stripeOffset = this.distance % (stripeHeight + gap);
    ctx.fillStyle = PALETTE.roadLine;
    for (let lane = 1; lane < LANES; lane += 1) {
      const x = ROAD_MARGIN + ((this.vw - ROAD_MARGIN * 2) / LANES) * lane;
      for (let y = -stripeHeight + stripeOffset; y < this.vh; y += stripeHeight + gap) {
        ctx.fillRect(x - 2.5, y, 5, stripeHeight);
      }
    }
  }

  drawEntity(ctx, entity) {
    if (entity.type === 'nugget') this.drawNugget(ctx, entity);
    else if (entity.type === 'fries') this.drawFries(ctx, entity);
    else if (entity.type === 'burger') this.drawBurger(ctx, entity);
    else this.drawFlame(ctx, entity);
  }

  drawNugget(ctx, entity) {
    const size = entity.size;
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(Math.sin(entity.spin) * 0.2);

    ctx.fillStyle = PALETTE.nugget;
    ctx.beginPath();
    ctx.moveTo(-size / 2, -size / 5);
    ctx.quadraticCurveTo(-size / 2.4, -size / 2, 0, -size / 2.4);
    ctx.quadraticCurveTo(size / 2.2, -size / 2.2, size / 2, -size / 6);
    ctx.quadraticCurveTo(size / 2.2, size / 2.4, 0, size / 2.6);
    ctx.quadraticCurveTo(-size / 2.4, size / 2.4, -size / 2, -size / 5);
    ctx.closePath();
    ctx.fill();
    this.outline(ctx);

    ctx.fillStyle = PALETTE.nuggetDark;
    ctx.beginPath();
    ctx.arc(-4, 2, 2.4, 0, Math.PI * 2);
    ctx.arc(5, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawFries(ctx, entity) {
    const size = entity.size;
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(Math.sin(entity.spin) * 0.12);

    // Pommes
    ctx.fillStyle = PALETTE.yellowDark;
    for (const [index, offsetX] of [-9, -3, 3, 9].entries()) {
      const height = 15 + (index % 2) * 5;
      this.roundedRect(ctx, offsetX - 3, -size / 2 - height + 14, 6, height, 2);
      ctx.fill();
      this.outline(ctx, 2);
    }

    // Rote Box
    ctx.fillStyle = PALETTE.red;
    ctx.beginPath();
    ctx.moveTo(-size / 2.2, 0);
    ctx.lineTo(size / 2.2, 0);
    ctx.lineTo(size / 2.8, size / 2);
    ctx.lineTo(-size / 2.8, size / 2);
    ctx.closePath();
    ctx.fill();
    this.outline(ctx);

    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(-size / 2.6, size / 8, size / 1.3, 4);
    ctx.restore();
  }

  drawBurger(ctx, entity) {
    const size = entity.size;
    const width = size * 1.05;
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(Math.sin(entity.spin) * 0.1);

    // Unteres Bun
    ctx.fillStyle = PALETTE.bun;
    this.roundedRect(ctx, -width / 2, 4, width, 9, 4);
    ctx.fill();
    this.outline(ctx);

    // Patty
    ctx.fillStyle = PALETTE.nuggetDark;
    this.roundedRect(ctx, -width / 2 - 1, -3, width + 2, 8, 3);
    ctx.fill();
    this.outline(ctx);

    // Käse
    ctx.fillStyle = PALETTE.cheese;
    ctx.beginPath();
    ctx.moveTo(-width / 2 - 2, -3);
    ctx.lineTo(width / 2 + 2, -3);
    ctx.lineTo(width / 2 - 2, 3);
    ctx.lineTo(-width / 2 + 2, 3);
    ctx.closePath();
    ctx.fill();
    this.outline(ctx, 2);

    // Oberes Bun
    ctx.fillStyle = PALETTE.bun;
    ctx.beginPath();
    ctx.moveTo(-width / 2, -3);
    ctx.quadraticCurveTo(-width / 2, -size / 1.6, 0, -size / 1.6);
    ctx.quadraticCurveTo(width / 2, -size / 1.6, width / 2, -3);
    ctx.closePath();
    ctx.fill();
    this.outline(ctx);
    ctx.restore();
  }

  drawFlame(ctx, entity) {
    const size = entity.size;
    const flicker = 1 + Math.sin(entity.spin * 3) * 0.08;
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.scale(1, flicker);

    ctx.fillStyle = PALETTE.red;
    ctx.beginPath();
    ctx.moveTo(0, -size / 1.7);
    ctx.quadraticCurveTo(size / 2.1, -size / 6, size / 3, size / 4);
    ctx.quadraticCurveTo(size / 5, size / 2, 0, size / 2);
    ctx.quadraticCurveTo(-size / 5, size / 2, -size / 3, size / 4);
    ctx.quadraticCurveTo(-size / 2.1, -size / 6, 0, -size / 1.7);
    ctx.closePath();
    ctx.fill();
    this.outline(ctx);

    ctx.fillStyle = PALETTE.orange;
    ctx.beginPath();
    ctx.moveTo(0, -size / 5);
    ctx.quadraticCurveTo(size / 4.5, size / 8, size / 8, size / 3);
    ctx.quadraticCurveTo(0, size / 2.2, -size / 8, size / 3);
    ctx.quadraticCurveTo(-size / 4.5, size / 8, 0, -size / 5);
    ctx.closePath();
    ctx.fill();
    this.outline(ctx, 2);

    ctx.fillStyle = PALETTE.yellow;
    ctx.beginPath();
    ctx.ellipse(0, size / 4, size / 12, size / 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, particle.life * 2);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  /** Der Loco-Hahn: Sonnenbrille, roter Kamm, blaue Weste. */
  drawPlayer(ctx) {
    // Blinken während der Unverwundbarkeit nach einem Treffer.
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 12) % 2 === 0) return;

    const x = this.playerX;
    const y = this.playerY;
    const tilt = (x - this.laneCenter(this.lane)) * -0.012;
    const bob = Math.sin(this.distance / 22) * 3;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(tilt);

    // Schatten (vor der Figurenskalierung, damit er flach am Boden bleibt)
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, PLAYER_SIZE / 2 + 8, PLAYER_SIZE / 2.2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Die Figur wird etwas größer gezeichnet als ihre Trefferfläche –
    // das wirkt kräftiger und verzeiht knappe Ausweichmanöver.
    ctx.scale(1.32, 1.32);

    // Beine
    const legSwing = Math.sin(this.distance / 12) * 5;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-6, PLAYER_SIZE / 4);
    ctx.lineTo(-6 + legSwing, PLAYER_SIZE / 2 + 2);
    ctx.moveTo(6, PLAYER_SIZE / 4);
    ctx.lineTo(6 - legSwing, PLAYER_SIZE / 2 + 2);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.beak;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, PLAYER_SIZE / 4);
    ctx.lineTo(-6 + legSwing, PLAYER_SIZE / 2 + 2);
    ctx.moveTo(6, PLAYER_SIZE / 4);
    ctx.lineTo(6 - legSwing, PLAYER_SIZE / 2 + 2);
    ctx.stroke();

    // Körper
    ctx.fillStyle = PALETTE.chicken;
    ctx.beginPath();
    ctx.ellipse(0, 10, 15, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    this.outline(ctx);

    // Weißes Shirt
    ctx.fillStyle = PALETTE.paper;
    ctx.beginPath();
    ctx.ellipse(0, 12, 7, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    this.outline(ctx, 2);

    // Blaue Weste
    ctx.fillStyle = PALETTE.vest;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 5, 1);
      ctx.quadraticCurveTo(side * 17, 4, side * 13, 19);
      ctx.quadraticCurveTo(side * 8, 23, side * 5, 20);
      ctx.closePath();
      ctx.fill();
      this.outline(ctx, 2);
    }

    // Kamm – wird vor dem Kopf gezeichnet und sitzt dadurch fest auf ihm
    ctx.fillStyle = PALETTE.red;
    ctx.beginPath();
    ctx.moveTo(-10, -22);
    ctx.quadraticCurveTo(-13, -33, -4, -30);
    ctx.quadraticCurveTo(-3, -39, 5, -33);
    ctx.quadraticCurveTo(12, -37, 11, -23);
    ctx.closePath();
    ctx.fill();
    this.outline(ctx);

    // Kopf
    ctx.fillStyle = PALETTE.chicken;
    ctx.beginPath();
    ctx.ellipse(0, -12, 17, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    this.outline(ctx);

    // Sonnenbrille – schmaler als der Kopf, damit die Kontur sichtbar bleibt
    ctx.fillStyle = PALETTE.ink;
    this.roundedRect(ctx, -13, -20, 26, 4, 2);
    ctx.fill();
    this.roundedRect(ctx, -12.5, -18, 11, 9, 3);
    ctx.fill();
    this.roundedRect(ctx, 1.5, -18, 11, 9, 3);
    ctx.fill();

    // Glanzpunkte auf den Gläsern
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(-10.5, -16.5, 3, 3);
    ctx.fillRect(3.5, -16.5, 3, 3);

    // Schnabel mit Grinsen
    ctx.fillStyle = PALETTE.beak;
    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.quadraticCurveTo(0, 4, 9, -6);
    ctx.quadraticCurveTo(0, -10, -9, -6);
    ctx.closePath();
    ctx.fill();
    this.outline(ctx, 2);

    ctx.fillStyle = PALETTE.paper;
    ctx.beginPath();
    ctx.moveTo(-6.5, -4.5);
    ctx.quadraticCurveTo(0, 1.5, 6.5, -4.5);
    ctx.closePath();
    ctx.fill();

    // Kehllappen seitlich unter dem Schnabel
    ctx.fillStyle = PALETTE.red;
    ctx.beginPath();
    ctx.ellipse(-6, 2, 3, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    this.outline(ctx, 2);

    ctx.restore();
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
