/**
 * Modus "Chili-Alarm": Reaktion statt Timing.
 *
 * Aus neun Luken springt Ware hervor. Chicken wird abgegriffen, Chilis
 * müssen liegen bleiben. Wer danebenhaut, verliert ein Leben – wer zu spät
 * ist, nur die Combo.
 */

import GameBase, { PALETTE, lerp } from './base.js';
import { drawFood } from './icons.js';

const HOLE_COLUMNS = 3;
const HOLE_ROWS = 3;
const CHICKEN = ['wings', 'filet', 'pops'];

export default class ChiliGame extends GameBase {
  setup() {
    this.holes = Array.from({ length: HOLE_COLUMNS * HOLE_ROWS }, () => null);
    this.spawnTimer = 0.5;
  }

  layout() {
    const top = Math.max(130, this.vh * 0.2);
    const bottom = this.vh - Math.max(120, this.vh * 0.15);
    const width = this.vw - 44;
    const height = Math.max(220, bottom - top);
    this.board = { x: 22, y: top, width, height };

    const cellWidth = width / HOLE_COLUMNS;
    const cellHeight = height / HOLE_ROWS;
    this.holeRadius = Math.min(cellWidth, cellHeight) * 0.36;

    this.holePositions = Array.from({ length: HOLE_COLUMNS * HOLE_ROWS }, (unused, index) => ({
      x: 22 + cellWidth * (0.5 + (index % HOLE_COLUMNS)),
      y: top + cellHeight * (0.5 + Math.floor(index / HOLE_COLUMNS)),
    }));
  }

  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.pop();
      this.spawnTimer = lerp(0.85, 0.3, this.ramp);
    }

    for (const [index, entry] of this.holes.entries()) {
      if (!entry) continue;
      entry.life -= dt;
      if (entry.life > 0) continue;

      this.holes[index] = null;
      // Verpasstes Chicken kostet ein Leben – Zusehen ist keine Strategie.
      // Ein liegen gelassener Chili ist dagegen genau richtig.
      if (entry.kind === 'chicken') {
        this.fail({ position: this.holePositions[index], label: 'VERPASST' });
        if (this.gameOver) return;
      }
    }
  }

  pop() {
    const free = this.holes.flatMap((entry, index) => (entry ? [] : [index]));
    if (free.length === 0) return;

    const index = free[Math.floor(Math.random() * free.length)];
    // Der Chili-Anteil steigt mit der Zeit – Zielen wird riskanter.
    const chiliChance = lerp(0.22, 0.42, this.ramp);
    const isChili = Math.random() < chiliChance;
    const life = lerp(1.25, 0.6, this.ramp);

    this.holes[index] = {
      kind: isChili ? 'chili' : 'chicken',
      type: isChili ? 'chili' : CHICKEN[Math.floor(Math.random() * CHICKEN.length)],
      life,
      maxLife: life,
    };
  }

  onPointer(x, y) {
    for (const [index, position] of this.holePositions.entries()) {
      if (Math.hypot(position.x - x, position.y - y) > this.holeRadius * 1.4) continue;

      const entry = this.holes[index];
      if (!entry) {
        // Ins Leere gehauen: kein Leben, aber die Combo ist weg.
        this.fail({ position, label: 'DANEBEN', strike: false, color: PALETTE.raw });
        return;
      }

      this.holes[index] = null;
      if (entry.kind === 'chili') {
        this.fail({ position, label: 'AUTSCH!' });
      } else {
        this.hit({ position, points: this.config.perfectPoints ?? 70, label: 'SCHNAPP!', type: entry.type });
      }
      return;
    }
  }

  /* --------------------------------------------------------------- Render */

  render(ctx) {
    this.drawKitchen(ctx, this.board.y - 30);

    this.label(ctx, 'CHICKEN GREIFEN – CHILI LIEGEN LASSEN', this.vw / 2, this.board.y - 46, {
      size: 13,
      fill: PALETTE.cream,
    });

    ctx.fillStyle = PALETTE.steelDark;
    this.roundedRect(ctx, this.board.x - 10, this.board.y - 10, this.board.width + 20, this.board.height + 20, 18);
    ctx.fill();
    this.outline(ctx, 4);

    for (const [index, position] of this.holePositions.entries()) {
      ctx.fillStyle = PALETTE.oilDark;
      ctx.beginPath();
      ctx.ellipse(position.x, position.y, this.holeRadius, this.holeRadius * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      this.outline(ctx, 3);

      const entry = this.holes[index];
      if (!entry) continue;

      // Kurzes Auftauchen und Abtauchen, damit die Luke lebendig wirkt.
      const phase = entry.life / entry.maxLife;
      const rise = Math.min(1, (1 - phase) * 6, phase * 6);
      const y = position.y - this.holeRadius * 0.5 * rise;

      ctx.save();
      ctx.beginPath();
      ctx.rect(position.x - this.holeRadius * 1.4, position.y - this.holeRadius * 2.2, this.holeRadius * 2.8, this.holeRadius * 2.2);
      ctx.clip();
      drawFood(ctx, entry.type, position.x, y, this.holeRadius * 1.5);
      ctx.restore();
    }
  }
}
