/**
 * Modus-Familie "Fritteuse": Timing am Garring.
 *
 * In mehreren Körben garen Teile vor sich hin. Kurz bevor der Garring voll
 * ist, leuchtet ein schmales goldenes Fenster auf – nur dann zählt der Zug
 * voll. Zu früh kostet die Combo, zu spät ein Leben.
 *
 * Über die Konfiguration entstehen daraus mehrere Modi (Klassik, Blitz,
 * Blind, Eisern, Ansturm) – siehe modes.js.
 */

import GameBase, { PALETTE, lerp, mixColor } from './base.js';
import { drawFood } from './icons.js';

const PIECE_TYPES = [
  { id: 'nugget', cookFactor: 0.85 },
  { id: 'wing', cookFactor: 1 },
  { id: 'tender', cookFactor: 1.18 },
];

export default class FryerGame extends GameBase {
  setup() {
    const { columns = 2, rows = 3 } = this.config;
    this.slotCount = columns * rows;
    this.slots = Array.from({ length: this.slotCount }, () => null);
    this.spawnTimer = 0.5;
    this.bubbles = Array.from({ length: 24 }, () => this.createBubble(true));
  }

  layout() {
    const { columns = 2, rows = 3 } = this.config;
    const top = Math.max(120, this.vh * 0.18);
    const bottom = this.vh - Math.max(120, this.vh * 0.14);
    this.basin = { x: 22, y: top, width: this.vw - 44, height: Math.max(230, bottom - top) };

    const cellWidth = this.basin.width / columns;
    const cellHeight = this.basin.height / rows;
    this.slotRadius = Math.min(cellWidth, cellHeight) * 0.34;

    this.slotPositions = Array.from({ length: columns * rows }, (unused, index) => ({
      x: this.basin.x + cellWidth * (0.5 + (index % columns)),
      y: this.basin.y + cellHeight * (0.5 + Math.floor(index / columns)),
    }));
  }

  get perfectWindow() {
    const { perfectWindow = { start: 0.14, end: 0.05 } } = this.config;
    return lerp(perfectWindow.start, perfectWindow.end, this.ramp);
  }

  createBubble(spread) {
    const basin = this.basin ?? { x: 22, y: 120, width: this.vw - 44, height: 300 };
    return {
      x: basin.x + Math.random() * basin.width,
      y: basin.y + (spread ? Math.random() : 1) * basin.height,
      radius: 1.5 + Math.random() * 3,
      speed: 14 + Math.random() * 26,
      wobble: 1 + Math.random() * 3,
    };
  }

  update(dt) {
    const spawn = this.config.spawn ?? { start: 1.4, end: 0.6 };

    if (this.config.alwaysFull) {
      // Ansturm: Jeder frei werdende Korb wird sofort neu belegt.
      for (let index = 0; index < this.slotCount; index += 1) {
        if (!this.slots[index]) this.fill(index);
      }
    } else {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnPiece();
        this.spawnTimer = lerp(spawn.start, spawn.end, this.ramp);
      }
    }

    for (const [index, piece] of this.slots.entries()) {
      if (!piece) continue;
      piece.elapsed += dt;
      piece.progress = piece.elapsed / piece.cookTime;
      if (piece.progress > 1) this.burn(index);
    }

    for (const bubble of this.bubbles) {
      bubble.y -= bubble.speed * dt;
      bubble.x += Math.sin(this.time * bubble.wobble) * 6 * dt;
      if (bubble.y < this.basin.y) Object.assign(bubble, this.createBubble(false));
    }
  }

  spawnPiece() {
    const free = this.slots.flatMap((piece, index) => (piece ? [] : [index]));
    if (free.length === 0) return;
    this.fill(free[Math.floor(Math.random() * free.length)]);
  }

  fill(index) {
    const cook = this.config.cookTime ?? { start: 3.0, end: 1.4 };
    const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    this.slots[index] = {
      type: type.id,
      cookTime: lerp(cook.start, cook.end, this.ramp) * type.cookFactor,
      elapsed: 0,
      progress: 0,
      spin: Math.random() * Math.PI,
    };
  }

  onPointer(x, y) {
    for (const [index, position] of this.slotPositions.entries()) {
      const distance = Math.hypot(position.x - x, position.y - y);
      // Großzügiger Trefferbereich – gefragt ist Timing, nicht Zielgenauigkeit.
      if (distance <= this.slotRadius * 1.55) {
        this.pull(index);
        return;
      }
    }
  }

  onKey(key) {
    const index = Number.parseInt(key, 10) - 1;
    if (Number.isInteger(index) && index >= 0 && index < this.slotCount) {
      this.pull(index);
      return true;
    }
    return false;
  }

  pull(index) {
    const piece = this.slots[index];
    if (!piece) return;

    const position = this.slotPositions[index];
    const perfectFrom = 1 - this.perfectWindow;
    this.slots[index] = null;

    if (piece.progress >= perfectFrom) {
      this.hit({
        position,
        points: this.config.perfectPoints ?? 100,
        label: 'PERFEKT!',
        type: piece.type,
      });
      return;
    }

    // Wie knapp war es? Der Abstand zum goldenen Fenster in Sekunden ist die
    // ehrlichste Rückmeldung – und der Grund, es sofort nochmal zu versuchen.
    const missedBy = (perfectFrom - piece.progress) * piece.cookTime;
    if (this.stats.closestMiss === null || missedBy < this.stats.closestMiss) {
      this.stats.closestMiss = missedBy;
    }
    const label = `${missedBy.toFixed(2).replace('.', ',')} s zu früh`;

    if (piece.progress >= (this.config.goodFrom ?? 0.55)) {
      this.hit({ position, points: this.config.goodPoints ?? 5, perfect: false, label, color: PALETTE.paper });
    } else {
      this.fail({ position, label, strike: false, color: PALETTE.raw });
    }
  }

  burn(index) {
    const position = this.slotPositions[index];
    this.slots[index] = null;
    this.smoke(position);
    this.fail({ position, label: 'VERBRANNT' });
  }

  /* --------------------------------------------------------------- Render */

  render(ctx) {
    this.drawKitchen(ctx, this.basin.y - 30);
    this.drawBasin(ctx);
    for (const [index, piece] of this.slots.entries()) this.drawSlot(ctx, index, piece);
  }

  drawBasin(ctx) {
    const { x, y, width, height } = this.basin;

    ctx.fillStyle = PALETTE.steelDark;
    this.roundedRect(ctx, x - 10, y - 10, width + 20, height + 20, 20);
    ctx.fill();
    this.outline(ctx, 4);

    ctx.fillStyle = PALETTE.oil;
    this.roundedRect(ctx, x, y, width, height, 14);
    ctx.fill();
    this.outline(ctx, 3);

    ctx.save();
    this.roundedRect(ctx, x, y, width, height, 14);
    ctx.clip();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = PALETTE.yellowDark;
    for (const bubble of this.bubbles) {
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawSlot(ctx, index, piece) {
    const { x, y } = this.slotPositions[index];
    const radius = this.slotRadius;

    ctx.fillStyle = PALETTE.oilDark;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.steel;
    ctx.lineWidth = 3;
    ctx.stroke();

    if (!piece) return;

    const perfectFrom = 1 - this.perfectWindow;
    const inPerfect = piece.progress >= perfectFrom;
    const ringRadius = radius * 1.38;

    // Blind-Modus: Ab einem bestimmten Punkt verschwindet die Anzeige.
    const hideFrom = this.config.hideRingFrom ?? 1.1;
    const ringVisible = piece.progress < hideFrom;

    if (ringVisible) {
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
    } else {
      // Nur ein Hinweis, dass hier etwas gart – ohne Fortschritt.
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (inPerfect && ringVisible) {
      const pulse = 0.5 + Math.sin(this.time * 22) * 0.5;
      ctx.globalAlpha = 0.25 + pulse * 0.35;
      ctx.fillStyle = PALETTE.yellow;
      ctx.beginPath();
      ctx.arc(x, y, ringRadius + 4 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    drawFood(ctx, piece.type, x, y, radius * 1.7, this.pieceColor(piece.progress));
  }

  angle(progress) {
    return -Math.PI / 2 + progress * Math.PI * 2;
  }

  /** Blass -> golden -> kräftig gebräunt. Im perfekten Moment am schönsten. */
  pieceColor(progress) {
    if (progress < 0.55) return mixColor(PALETTE.raw, PALETTE.golden, progress / 0.55);
    return mixColor(PALETTE.golden, PALETTE.deep, (progress - 0.55) / 0.45);
  }
}
