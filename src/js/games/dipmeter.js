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
    this.label(ctx, 'TRIFF DIE ZONE', this.vw / 2, 88, { size: 28, fill: PALETTE.cream });

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

    // Schiene: dunkle Rinne in Stahl
    this.steelPanel(ctx, x - 6, y - 6, width + 12, height + 12, 14);
    const track = ctx.createLinearGradient(0, y, 0, y + height);
    track.addColorStop(0, '#0d0c0b');
    track.addColorStop(1, '#1e1b18');
    ctx.fillStyle = track;
    this.roundedRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Zielzone leuchtet
    ctx.save();
    ctx.shadowColor = 'rgba(255,221,0,0.7)';
    ctx.shadowBlur = 18;
    const zone = ctx.createLinearGradient(0, y + 4, 0, y + height - 4);
    zone.addColorStop(0, '#fff08a');
    zone.addColorStop(1, PALETTE.yellowDark);
    ctx.fillStyle = zone;
    this.roundedRect(ctx, x + width * this.zone.start, y + 4, width * this.zone.width, height - 8, 7);
    ctx.fill();
    ctx.restore();

    // Zeiger
    const needleX = x + width * this.needle;
    ctx.save();
    ctx.shadowColor = this.locked ? 'rgba(67,160,71,0.8)' : 'rgba(240,50,58,0.8)';
    ctx.shadowBlur = 14;
    const needle = ctx.createLinearGradient(needleX - 5, 0, needleX + 5, 0);
    needle.addColorStop(0, this.locked ? '#2f7a33' : '#8f1116');
    needle.addColorStop(0.45, this.locked ? '#6fd075' : '#ff5a61');
    needle.addColorStop(1, this.locked ? '#2f7a33' : '#8f1116');
    ctx.fillStyle = needle;
    this.roundedRect(ctx, needleX - 4, y - 14, 8, height + 28, 4);
    ctx.fill();
    ctx.restore();

    // Restzeit für den aktuellen Versuch
    const remaining = Math.max(0, this.shotClock) / (this.maxShotClock ?? 6);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.roundedRect(ctx, x, y + height + 18, width, 10, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = remaining < 0.3 ? PALETTE.red : PALETTE.yellow;
    this.roundedRect(ctx, x, y + height + 18, width * remaining, 10, 5);
    ctx.fill();

    this.label(ctx, `${this.attempts} Versuche`, this.vw / 2, y + height + 58, {
      size: 15,
      fill: PALETTE.cream,
    });
  }
}
