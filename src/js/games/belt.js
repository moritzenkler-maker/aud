/**
 * Modus "Fließband": Rhythmus.
 *
 * Ware läuft von rechts nach links über das Band. Genau über der Marke muss
 * abgegriffen werden. Wer trifft, kommt in einen Takt – wer etwas
 * durchlaufen lässt, verliert ein Leben.
 */

import GameBase, { PALETTE, lerp } from './base.js';
import { FOOD_IDS, drawFood } from './icons.js';

export default class BeltGame extends GameBase {
  setup() {
    this.items = [];
    this.spawnTimer = 0.6;
    this.beltOffset = 0;
  }

  layout() {
    this.beltY = this.vh * 0.46;
    this.beltHeight = 96;
    this.markerX = this.vw * 0.3;
  }

  get speed() {
    return lerp(105, 260, this.ramp);
  }

  get spacing() {
    return lerp(1.25, 0.6, this.ramp);
  }

  update(dt) {
    this.beltOffset = (this.beltOffset + this.speed * dt) % 28;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.items.push({
        id: FOOD_IDS[Math.floor(Math.random() * FOOD_IDS.length)],
        x: this.vw + 40,
      });
      this.spawnTimer = this.spacing;
    }

    for (const item of this.items) item.x -= this.speed * dt;

    // Alles, was links an der Marke vorbei ist, gilt als durchgelaufen.
    const missed = this.items.filter((item) => item.x < this.markerX - 46);
    this.items = this.items.filter((item) => item.x >= this.markerX - 46);
    for (const item of missed) {
      this.fail({ position: { x: this.markerX, y: this.beltY }, label: 'DURCH!' });
      if (this.gameOver) return;
    }
  }

  onPointer() {
    this.grab();
  }

  onKey(key) {
    if (key === ' ' || key === 'Enter') {
      this.grab();
      return true;
    }
    return false;
  }

  grab() {
    if (this.items.length === 0) {
      this.fail({ position: { x: this.markerX, y: this.beltY }, label: 'LEER', strike: false, color: PALETTE.raw });
      return;
    }

    // Das Stück, das der Marke am nächsten ist.
    let nearest = this.items[0];
    for (const item of this.items) {
      if (Math.abs(item.x - this.markerX) < Math.abs(nearest.x - this.markerX)) nearest = item;
    }

    const distance = Math.abs(nearest.x - this.markerX);
    const position = { x: nearest.x, y: this.beltY };

    if (distance > 60) {
      this.fail({ position, label: 'ZU FRÜH', strike: false, color: PALETTE.raw });
      return;
    }

    this.items = this.items.filter((item) => item !== nearest);

    if (distance <= 14) {
      this.hit({ position, points: this.config.perfectPoints ?? 75, label: 'TAKT!', type: nearest.id });
    } else {
      this.hit({
        position,
        points: this.config.goodPoints ?? 15,
        perfect: false,
        label: 'knapp',
        color: PALETTE.paper,
      });
    }
  }

  /* --------------------------------------------------------------- Render */

  render(ctx) {
    this.drawKitchen(ctx, 96);
    this.label(ctx, 'AN DER MARKE ABGREIFEN', this.vw / 2, 88, { size: 20, fill: PALETTE.ink });

    const top = this.beltY - this.beltHeight / 2;

    ctx.fillStyle = PALETTE.steelDark;
    this.roundedRect(ctx, -10, top, this.vw + 20, this.beltHeight, 10);
    ctx.fill();
    this.outline(ctx, 3);

    // Laufende Bandstruktur
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 6;
    for (let x = -28 + (28 - this.beltOffset); x < this.vw + 28; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, top + 6);
      ctx.lineTo(x, top + this.beltHeight - 6);
      ctx.stroke();
    }

    // Abgreif-Marke
    ctx.fillStyle = PALETTE.yellow;
    this.roundedRect(ctx, this.markerX - 30, top - 10, 60, this.beltHeight + 20, 12);
    ctx.fill();
    this.outline(ctx, 3);
    ctx.strokeStyle = PALETTE.red;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.markerX, top - 6);
    ctx.lineTo(this.markerX, top + this.beltHeight + 6);
    ctx.stroke();

    for (const item of this.items) {
      if (item.x < -40 || item.x > this.vw + 40) continue;
      drawFood(ctx, item.id, item.x, this.beltY, 56);
    }

    this.label(ctx, 'TIPPEN', this.markerX, top + this.beltHeight + 42, { size: 16, fill: PALETTE.ink });
  }
}
