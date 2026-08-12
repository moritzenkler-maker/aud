/**
 * "Nugget Rush" – das Kernspiel der Loco Chicken App.
 *
 * Ein Drei-Spuren-Runner: Das Huhn rennt über die Straße, sammelt Nuggets
 * und Coins und weicht Chilis und Grillsperren aus. Gezeichnet wird alles
 * prozedural auf einem Canvas, es werden keine Bild-Assets benötigt.
 */

import { sfx } from './audio.js';

const LANES = 3;
const VIRTUAL_WIDTH = 360;
const ROAD_MARGIN = 26;
const PLAYER_SIZE = 46;
const START_SPEED = 240;
const MAX_SPEED = 620;
const SPEED_RAMP = 9; // Pixel pro Sekunde, die pro Sekunde dazukommen
const START_LIVES = 3;
const INVULNERABLE_TIME = 1.6;
const NUGGET_POINTS = 10;
const COIN_POINTS = 25;
const COMBO_STEP = 5; // Sammelobjekte bis zur nächsten Multiplikator-Stufe
const MAX_COMBO = 5;

const PALETTE = {
  asphalt: '#2b2118',
  asphaltAlt: '#332619',
  lane: '#f7c948',
  grass: '#1d2b17',
  nugget: '#f6b23c',
  nuggetDark: '#c8801d',
  coin: '#ffd75e',
  chili: '#e23b2e',
  barrier: '#8d5524',
  chicken: '#fff3d6',
  comb: '#e23b2e',
  beak: '#f7a51b',
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

    this.playerY = this.vh - 110;
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
        this.entities.push(this.createEntity('obstacle', lane));
      } else if (roll < 0.46) {
        this.entities.push(this.createEntity('coin', lane));
      } else if (roll < 0.82) {
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
      size: type === 'obstacle' ? 42 : 30,
      spin: Math.random() * Math.PI,
      dead: false,
    };
  }

  checkCollisions() {
    for (const entity of this.entities) {
      if (entity.dead || entity.lane !== this.lane) continue;

      const dy = Math.abs(entity.y - this.playerY);
      const hitRange = (entity.size + PLAYER_SIZE) * 0.42;
      if (dy > hitRange) continue;

      if (entity.type === 'obstacle') {
        if (this.invulnerable > 0) continue;
        this.takeHit(entity);
      } else {
        this.collect(entity);
      }
    }
  }

  collect(entity) {
    entity.dead = true;
    const base = entity.type === 'coin' ? COIN_POINTS : NUGGET_POINTS;
    this.score += base * this.combo;

    this.collectedSinceCombo += 1;
    if (this.collectedSinceCombo >= COMBO_STEP && this.combo < MAX_COMBO) {
      this.combo += 1;
      this.collectedSinceCombo = 0;
      sfx.bonus();
    } else {
      sfx.collect();
    }

    this.burst(entity.x, entity.y, entity.type === 'coin' ? PALETTE.coin : PALETTE.nugget, 10);
  }

  takeHit(entity) {
    entity.dead = true;
    this.lives -= 1;
    this.combo = 1;
    this.collectedSinceCombo = 0;
    this.invulnerable = INVULNERABLE_TIME;
    this.shake = 1;
    this.burst(entity.x, entity.y, PALETTE.chili, 16);
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
        size: 2 + Math.random() * 3,
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

    if (this.shake > 0) {
      const amount = this.shake * 5;
      ctx.translate((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
    }

    this.drawRoad(ctx);
    for (const entity of this.entities) this.drawEntity(ctx, entity);
    this.drawParticles(ctx);
    this.drawPlayer(ctx);
  }

  drawRoad(ctx) {
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, this.vw, this.vh);

    ctx.fillStyle = PALETTE.asphalt;
    ctx.fillRect(ROAD_MARGIN, 0, this.vw - ROAD_MARGIN * 2, this.vh);

    // Laufender Streifen als Geschwindigkeitsgefühl.
    const stripeHeight = 42;
    const gap = 34;
    const offset = this.distance % (stripeHeight + gap);
    ctx.fillStyle = PALETTE.lane;
    ctx.globalAlpha = 0.75;
    for (let lane = 1; lane < LANES; lane += 1) {
      const x = ROAD_MARGIN + ((this.vw - ROAD_MARGIN * 2) / LANES) * lane;
      for (let y = -stripeHeight + offset; y < this.vh; y += stripeHeight + gap) {
        ctx.fillRect(x - 2, y, 4, stripeHeight);
      }
    }
    ctx.globalAlpha = 1;

    // Randmarkierungen.
    ctx.fillStyle = PALETTE.asphaltAlt;
    for (let y = -stripeHeight + offset; y < this.vh; y += stripeHeight + gap) {
      ctx.fillRect(ROAD_MARGIN - 10, y, 8, stripeHeight);
      ctx.fillRect(this.vw - ROAD_MARGIN + 2, y, 8, stripeHeight);
    }
  }

  drawEntity(ctx, entity) {
    if (entity.type === 'nugget') this.drawNugget(ctx, entity);
    else if (entity.type === 'coin') this.drawCoin(ctx, entity);
    else this.drawObstacle(ctx, entity);
  }

  drawNugget(ctx, entity) {
    const size = entity.size;
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.rotate(Math.sin(entity.spin) * 0.25);
    ctx.fillStyle = PALETTE.nuggetDark;
    this.roundedRect(ctx, -size / 2, -size / 2 + 3, size, size * 0.8, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.nugget;
    this.roundedRect(ctx, -size / 2, -size / 2, size, size * 0.8, 10);
    ctx.fill();
    ctx.restore();
  }

  drawCoin(ctx, entity) {
    const radius = entity.size / 2;
    const squeeze = Math.abs(Math.cos(entity.spin));
    ctx.save();
    ctx.translate(entity.x, entity.y);
    ctx.fillStyle = PALETTE.coin;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(3, radius * squeeze), radius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.nuggetDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  drawObstacle(ctx, entity) {
    const size = entity.size;
    ctx.save();
    ctx.translate(entity.x, entity.y);

    // Grillsperre
    ctx.fillStyle = PALETTE.barrier;
    this.roundedRect(ctx, -size / 2, -size / 4, size, size / 2, 6);
    ctx.fill();

    // Chili obendrauf
    ctx.fillStyle = PALETTE.chili;
    ctx.beginPath();
    ctx.ellipse(0, -size / 3, size / 5, size / 3, Math.sin(entity.spin) * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2f6b2f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -size / 1.6);
    ctx.lineTo(0, -size / 2.2);
    ctx.stroke();
    ctx.restore();
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, particle.life * 2);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  drawPlayer(ctx) {
    // Blinken während der Unverwundbarkeit nach einem Treffer.
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 12) % 2 === 0) return;

    const x = this.playerX;
    const y = this.playerY;
    const tilt = (x - this.laneCenter(this.lane)) * -0.01;
    const bob = Math.sin(this.distance / 22) * 3;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(tilt);

    // Schatten
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, PLAYER_SIZE / 2, PLAYER_SIZE / 2.4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Beine
    ctx.strokeStyle = PALETTE.beak;
    ctx.lineWidth = 4;
    const legSwing = Math.sin(this.distance / 12) * 5;
    ctx.beginPath();
    ctx.moveTo(-7, PLAYER_SIZE / 3);
    ctx.lineTo(-7 + legSwing, PLAYER_SIZE / 2);
    ctx.moveTo(7, PLAYER_SIZE / 3);
    ctx.lineTo(7 - legSwing, PLAYER_SIZE / 2);
    ctx.stroke();

    // Körper
    ctx.fillStyle = PALETTE.chicken;
    ctx.beginPath();
    ctx.ellipse(0, 0, PLAYER_SIZE / 2.4, PLAYER_SIZE / 2.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flügel
    ctx.fillStyle = '#f0ddb6';
    ctx.beginPath();
    ctx.ellipse(-PLAYER_SIZE / 3, 2, 6, 12, 0.3, 0, Math.PI * 2);
    ctx.ellipse(PLAYER_SIZE / 3, 2, 6, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Kamm
    ctx.fillStyle = PALETTE.comb;
    ctx.beginPath();
    ctx.arc(-5, -PLAYER_SIZE / 2.1, 5, 0, Math.PI * 2);
    ctx.arc(2, -PLAYER_SIZE / 1.9, 6, 0, Math.PI * 2);
    ctx.arc(9, -PLAYER_SIZE / 2.1, 5, 0, Math.PI * 2);
    ctx.fill();

    // Schnabel
    ctx.fillStyle = PALETTE.beak;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(12, 2);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fill();

    // Augen
    ctx.fillStyle = '#20160e';
    ctx.beginPath();
    ctx.arc(-6, -6, 2.6, 0, Math.PI * 2);
    ctx.arc(6, -6, 2.6, 0, Math.PI * 2);
    ctx.fill();

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
