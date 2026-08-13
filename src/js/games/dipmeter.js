/**
 * Modus "Dip-Meter": ein Balken, ein Zeiger, ein Moment.
 *
 * Der Zeiger läuft hin und her, die grüne Zone wird mit jedem Treffer
 * schmaler und wandert. Reduziert das Spiel auf die eine Entscheidung –
 * jetzt oder nicht.
 */

import GameBase, { PALETTE, lerp } from './base.js';
import { drawFood } from './icons.js';

export default class DipMeterGame extends GameBase {
  setup() {
    this.attempts = 0;
    this.filled = 0;
    this.needle = 0.5;
    this.direction = 1;
    this.zone = { start: 0.4, width: 0.2 };
    this.locked = false;
    this.lockTimer = 0;
    this.shotClock = 6;
    this.newZone();
  }

  layout() {
    this.bar = {
      x: 30,
      y: this.vh * 0.58,
      width: this.vw - 60,
      height: 46,
    };
  }

  get speed() {
    // Anteil des Balkens pro Sekunde.
    return lerp(0.55, 1.5, Math.min(1, this.attempts / 20));
  }

  newZone() {
    const width = lerp(0.2, 0.06, Math.min(1, this.attempts / 18));
    this.zone = { start: 0.06 + Math.random() * (0.88 - width), width };
    // Zugzwang: Abwarten ist keine Option.
    this.maxShotClock = lerp(6, 3.2, Math.min(1, this.attempts / 18));
    this.shotClock = this.maxShotClock;
  }

  update(dt) {
    if (this.locked) {
      this.lockTimer -= dt;
      if (this.lockTimer <= 0) {
        this.locked = false;
        this.newZone();
      }
      return;
    }

    this.shotClock -= dt;
    if (this.shotClock <= 0) {
      this.attempts += 1;
      this.fail({ position: { x: this.vw / 2, y: this.bar.y - 24 }, label: 'ZU ZÖGERLICH' });
      if (!this.gameOver) this.newZone();
      return;
    }

    this.needle += this.direction * this.speed * dt;
    if (this.needle > 1) {
      this.needle = 1;
      this.direction = -1;
    }
    if (this.needle < 0) {
      this.needle = 0;
      this.direction = 1;
    }
  }

  onPointer() {
    this.stop();
  }

  onKey(key) {
    if (key === ' ' || key === 'Enter') {
      this.stop();
      return true;
    }
    return false;
  }

  stop() {
    if (this.locked) return;

    this.locked = true;
    this.lockTimer = 0.35;
    this.attempts += 1;

    const position = { x: this.bar.x + this.bar.width * this.needle, y: this.bar.y - 24 };
    const zoneEnd = this.zone.start + this.zone.width;
    const inside = this.needle >= this.zone.start && this.needle <= zoneEnd;

    if (!inside) {
      this.fail({ position, label: 'DANEBEN' });
      return;
    }

    // Mitte der Zone zählt voll, der Rand nur halb.
    const center = this.zone.start + this.zone.width / 2;
    const offset = Math.abs(this.needle - center) / (this.zone.width / 2);

    if (offset <= 0.45) {
      this.filled = Math.min(1, this.filled + 0.2);
      this.hit({ position, points: this.config.perfectPoints ?? 90, label: 'MITTE!', type: 'dip' });
    } else {
      this.filled = Math.min(1, this.filled + 0.08);
      this.hit({
        position,
        points: this.config.goodPoints ?? 20,
        perfect: false,
        label: 'RAND',
        color: PALETTE.paper,
      });
    }
  }

  /* --------------------------------------------------------------- Render */

  render(ctx) {
    this.drawKitchen(ctx, 96);
    this.label(ctx, 'TRIFF DIE ZONE', this.vw / 2, 88, { size: 28, fill: PALETTE.ink });

    // Dip-Becher als Fortschrittsgefäß
    const cupX = this.vw / 2;
    const cupY = this.vh * 0.3;
    drawFood(ctx, 'dip', cupX, cupY, 120);
    ctx.fillStyle = PALETTE.blue;
    ctx.globalAlpha = 0.35 + this.filled * 0.5;
    ctx.beginPath();
    ctx.arc(cupX, cupY + 10, 18 + this.filled * 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const { x, y, width, height } = this.bar;

    ctx.fillStyle = PALETTE.paper;
    this.roundedRect(ctx, x, y, width, height, 12);
    ctx.fill();
    this.outline(ctx, 3);

    // Zielzone
    ctx.fillStyle = PALETTE.yellow;
    this.roundedRect(ctx, x + width * this.zone.start, y + 4, width * this.zone.width, height - 8, 8);
    ctx.fill();
    this.outline(ctx, 3);

    // Zeiger
    const needleX = x + width * this.needle;
    ctx.fillStyle = this.locked ? PALETTE.green : PALETTE.red;
    this.roundedRect(ctx, needleX - 5, y - 12, 10, height + 24, 5);
    ctx.fill();
    this.outline(ctx, 3);

    // Restzeit für den aktuellen Versuch
    const remaining = Math.max(0, this.shotClock) / (this.maxShotClock ?? 6);
    ctx.fillStyle = PALETTE.paper;
    this.roundedRect(ctx, x, y + height + 18, width, 10, 5);
    ctx.fill();
    this.outline(ctx, 3);
    ctx.fillStyle = remaining < 0.3 ? PALETTE.red : PALETTE.yellow;
    this.roundedRect(ctx, x, y + height + 18, width * remaining, 10, 5);
    ctx.fill();

    this.label(ctx, `${this.attempts} Versuche`, this.vw / 2, y + height + 58, {
      size: 15,
      fill: PALETTE.ink,
    });
  }
}
