/**
 * Modus "Bestellung": Reihenfolge merken.
 *
 * Ein Gast bestellt – die Positionen leuchten nacheinander auf. Danach muss
 * die Bestellung in derselben Reihenfolge zusammengestellt werden. Mit jeder
 * Runde wird sie länger und wird kürzer gezeigt.
 *
 * Kein Timing-, sondern ein Gedächtnisspiel: der Gegenpol zur Fritteuse.
 */

import GameBase, { PALETTE, lerp } from './base.js';
import { drawFood } from './icons.js';

const TILES = ['nugget', 'wing', 'fries', 'burger', 'dip', 'drink'];
const TILE_COLUMNS = 3;

export default class OrderGame extends GameBase {
  setup() {
    this.round = 0;
    this.phase = 'show';
    this.sequence = [];
    this.showIndex = 0;
    this.showTimer = 0.6;
    this.inputIndex = 0;
    this.inputTimer = 0;
    this.pressed = null;
    this.pressedTimer = 0;
    this.nextRound();
  }

  layout() {
    const gridTop = this.vh * 0.46;
    const cellWidth = (this.vw - 44) / TILE_COLUMNS;
    const cellHeight = Math.min(cellWidth, (this.vh - gridTop - 100) / 2);
    this.tileSize = Math.min(cellWidth, cellHeight) * 0.82;

    this.tiles = TILES.map((id, index) => ({
      id,
      x: 22 + cellWidth * (0.5 + (index % TILE_COLUMNS)),
      y: gridTop + cellHeight * (0.5 + Math.floor(index / TILE_COLUMNS)),
    }));
  }

  nextRound() {
    this.round += 1;
    const length = Math.min(2 + Math.floor(this.round / 2), 7);
    this.sequence = Array.from({ length }, () => TILES[Math.floor(Math.random() * TILES.length)]);
    this.phase = 'show';
    this.showIndex = 0;
    this.showTimer = 0.5;
    this.inputIndex = 0;
  }

  get showTime() {
    // Je weiter die Runde, desto kürzer wird jede Position gezeigt.
    return lerp(0.7, 0.32, Math.min(1, this.round / 12));
  }

  update(dt) {
    if (this.pressedTimer > 0) this.pressedTimer -= dt;

    if (this.phase === 'show') {
      this.showTimer -= dt;
      if (this.showTimer > 0) return;

      this.showIndex += 1;
      if (this.showIndex >= this.sequence.length) {
        this.phase = 'input';
        // Zeitfenster fürs Nachtippen: großzügig, aber nicht endlos.
        this.inputTimer = 1.4 + this.sequence.length * 0.95;
        return;
      }
      this.showTimer = this.showTime;
      return;
    }

    this.inputTimer -= dt;
    if (this.inputTimer <= 0) {
      this.fail({ position: this.center(), label: 'ZU LANGSAM' });
      if (!this.gameOver) this.nextRound();
    }
  }

  center() {
    return { x: this.vw / 2, y: this.vh * 0.3 };
  }

  onPointer(x, y) {
    if (this.phase !== 'input') return;

    const tile = this.tiles.find(
      (candidate) => Math.abs(candidate.x - x) < this.tileSize * 0.6 && Math.abs(candidate.y - y) < this.tileSize * 0.6,
    );
    if (!tile) return;

    this.pressed = tile.id;
    this.pressedTimer = 0.16;

    if (tile.id !== this.sequence[this.inputIndex]) {
      this.fail({ position: tile, label: 'FALSCH' });
      if (!this.gameOver) this.nextRound();
      return;
    }

    this.inputIndex += 1;
    if (this.inputIndex < this.sequence.length) {
      // Zwischenschritt: bestätigen, ohne die Wertung anzufassen.
      this.burst(tile, PALETTE.yellow, 6, 120);
      return;
    }

    this.hit({
      position: this.center(),
      points: (this.config.perfectPoints ?? 40) * this.sequence.length,
      label: 'BESTELLUNG!',
      type: 'order',
    });
    if (!this.gameOver) this.nextRound();
  }

  onKey(key) {
    const index = Number.parseInt(key, 10) - 1;
    if (Number.isInteger(index) && index >= 0 && index < this.tiles.length) {
      const tile = this.tiles[index];
      this.onPointer(tile.x, tile.y);
      return true;
    }
    return false;
  }

  /* --------------------------------------------------------------- Render */

  render(ctx) {
    this.drawKitchen(ctx, 96);

    const showing = this.phase === 'show';
    this.label(ctx, showing ? 'MERKEN' : 'NACHTIPPEN', this.vw / 2, 88, {
      size: 30,
      fill: showing ? PALETTE.red : PALETTE.ink,
    });

    // Bestellzettel mit der Länge der Bestellung
    this.drawTicket(ctx);
    this.drawTiles(ctx);
  }

  drawTicket(ctx) {
    const width = this.vw - 80;
    const height = this.vh * 0.24;
    const x = 40;
    const y = 130;

    ctx.fillStyle = PALETTE.paper;
    this.roundedRect(ctx, x, y, width, height, 12);
    ctx.fill();
    this.outline(ctx, 3);

    if (this.phase === 'show') {
      const current = this.sequence[this.showIndex];
      if (current) {
        drawFood(ctx, current, this.vw / 2, y + height / 2, Math.min(width, height) * 0.5);
      }
      this.label(ctx, `${this.showIndex + 1} / ${this.sequence.length}`, this.vw / 2, y + height - 12, {
        size: 16,
        fill: PALETTE.ink,
      });
      return;
    }

    // Eingabephase: Punkte für erledigte Positionen, Balken für die Zeit
    const dotSize = 14;
    const gap = 10;
    const totalWidth = this.sequence.length * dotSize + (this.sequence.length - 1) * gap;
    for (let index = 0; index < this.sequence.length; index += 1) {
      const dotX = this.vw / 2 - totalWidth / 2 + index * (dotSize + gap) + dotSize / 2;
      ctx.fillStyle = index < this.inputIndex ? PALETTE.red : PALETTE.cream;
      ctx.beginPath();
      ctx.arc(dotX, y + height / 2 - 10, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
      this.outline(ctx, 3);
    }

    const barWidth = width - 40;
    const remaining = Math.max(0, this.inputTimer) / (1.4 + this.sequence.length * 0.95);
    ctx.fillStyle = PALETTE.cream;
    this.roundedRect(ctx, x + 20, y + height - 34, barWidth, 12, 6);
    ctx.fill();
    this.outline(ctx, 3);
    ctx.fillStyle = remaining < 0.3 ? PALETTE.red : PALETTE.yellow;
    this.roundedRect(ctx, x + 20, y + height - 34, barWidth * remaining, 12, 6);
    ctx.fill();
  }

  drawTiles(ctx) {
    for (const tile of this.tiles) {
      const active = this.pressed === tile.id && this.pressedTimer > 0;
      ctx.fillStyle = active ? PALETTE.yellow : PALETTE.paper;
      this.roundedRect(ctx, tile.x - this.tileSize / 2, tile.y - this.tileSize / 2, this.tileSize, this.tileSize, 14);
      ctx.fill();
      this.outline(ctx, 3);
      drawFood(ctx, tile.id, tile.x, tile.y, this.tileSize * 0.62);
    }
  }
}
