/**
 * Modus "Sortieren": Warengruppen unter Zeitdruck trennen.
 *
 * Von oben kommt Ware herunter. Chicken gehört nach links, Beilagen nach
 * rechts. Getippt wird die Bildschirmhälfte, nicht das Objekt – gefragt ist
 * schnelles Erkennen, nicht Zielen.
 */

import GameBase, { PALETTE, lerp } from './base.js';
import { PRODUCTS, PRODUCT_IDS, randomProduct } from '../brand.js';
import { drawFood } from './icons.js';

const BINS = {
  chicken: { label: 'CHICKEN', color: PALETTE.deep },
  side: { label: 'SIDES', color: PALETTE.yellow },
};

export default class SortingGame extends GameBase {
  setup() {
    this.item = null;
    this.spawnTimer = 0.4;
    this.flashSide = null;
    this.flashTimer = 0;
  }

  layout() {
    this.binTop = this.vh - Math.max(150, this.vh * 0.2);
    this.binHeight = Math.max(90, this.vh * 0.13);
  }

  get fallTime() {
    // Sekunden vom oberen Rand bis zu den Kisten.
    return lerp(2.2, 0.85, this.ramp);
  }

  update(dt) {
    if (this.flashTimer > 0) this.flashTimer -= dt;

    if (!this.item) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) this.spawn();
      return;
    }

    this.item.y += ((this.binTop - 126) / this.fallTime) * dt;
    this.item.spin += dt * 2;

    if (this.item.y >= this.binTop - 10) {
      const position = { x: this.item.x, y: this.item.y };
      this.item = null;
      this.spawnTimer = 0.25;
      this.fail({ position, label: 'VERPASST' });
    }
  }

  spawn() {
    const id = randomProduct();
    this.item = { id, group: PRODUCTS[id].group, x: this.vw / 2, y: 126, spin: 0 };
  }

  onPointer(x) {
    if (!this.item) return;
    this.sort(x < this.vw / 2 ? 'chicken' : 'side');
  }

  onKey(key) {
    if (key === 'ArrowLeft' || key === 'a') {
      this.sort('chicken');
      return true;
    }
    if (key === 'ArrowRight' || key === 'd') {
      this.sort('side');
      return true;
    }
    return false;
  }

  sort(side) {
    if (!this.item) return;

    const position = { x: this.item.x, y: this.item.y };
    const correct = this.item.group === side;
    const item = this.item;
    this.item = null;
    this.spawnTimer = 0.18;

    this.flashSide = side;
    this.flashTimer = 0.18;

    if (correct) {
      this.hit({
        position,
        points: this.config.perfectPoints ?? 60,
        label: 'RICHTIG',
        type: item.id,
      });
    } else {
      this.fail({ position, label: 'FALSCHE KISTE' });
    }
  }

  /* --------------------------------------------------------------- Render */

  render(ctx) {
    this.drawKitchen(ctx, 96);

    this.label(ctx, 'WOHIN DAMIT?', this.vw / 2, 88, { size: 28, fill: PALETTE.cream });

    // Trennlinie der beiden Hälften
    ctx.strokeStyle = 'rgba(18,16,14,0.18)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(this.vw / 2, 132);
    ctx.lineTo(this.vw / 2, this.binTop);
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawBin(ctx, 'chicken', 0);
    this.drawBin(ctx, 'side', this.vw / 2);

    if (this.item) {
      drawFood(ctx, this.item.id, this.item.x, this.item.y, 62);
      this.label(ctx, PRODUCTS[this.item.id].name.toUpperCase(), this.item.x, this.item.y + 58, {
        size: 15,
        fill: PALETTE.cream,
      });
    }
  }

  drawBin(ctx, group, x) {
    const width = this.vw / 2;
    const bin = BINS[group];
    const active = this.flashSide === group && this.flashTimer > 0;

    ctx.fillStyle = active ? PALETTE.paper : bin.color;
    this.roundedRect(ctx, x + 8, this.binTop, width - 16, this.binHeight, 14);
    ctx.fill();
    this.outline(ctx, 3);

    this.label(ctx, bin.label, x + width / 2, this.binTop + this.binHeight / 2 + 8, {
      size: 22,
      fill: group === 'chicken' ? PALETTE.paper : PALETTE.ink,
      stroke: group === 'chicken' ? PALETTE.ink : null,
      width: 4,
    });
  }
}
