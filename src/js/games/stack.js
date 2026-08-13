/**
 * Modus "Burger-Stapel": Präzision statt Tempo.
 *
 * Eine Zutat schwingt über dem Turm hin und her. Wer im richtigen Moment
 * tippt, stapelt sauber; wer daneben liegt, verliert den Überstand – der
 * Turm wird schmaler und die nächste Schicht schwerer.
 */

import GameBase, { PALETTE, lerp } from './base.js';

const LAYER_HEIGHT = 26;
const PERFECT_TOLERANCE = 4;
const LAYER_COLORS = [PALETTE.deep, PALETTE.cheese, PALETTE.green, PALETTE.bun, PALETTE.red];

export default class StackGame extends GameBase {
  setup() {
    this.layers = [];
    this.moving = null;
    this.cameraY = 0;
    this.startLayer();
  }

  layout() {
    // Platz für Steuerleiste und Pausenknopf am unteren Rand freihalten.
    this.baseY = this.vh - Math.max(200, this.vh * 0.26);
    this.baseWidth = Math.min(200, this.vw * 0.58);
    if (this.layers.length === 0) {
      this.layers = [{ x: this.vw / 2, width: this.baseWidth, color: PALETTE.bun }];
    }
  }

  get top() {
    return this.layers[this.layers.length - 1];
  }

  startLayer() {
    if (!this.layers || this.layers.length === 0) {
      this.layers = [{ x: this.vw / 2, width: this.baseWidth ?? 200, color: PALETTE.bun }];
    }
    const speed = lerp(120, 340, Math.min(1, this.layers.length / 22));
    // Zugzwang: Wer die Schicht ewig schwingen lässt, verliert sie.
    this.dropTimer = lerp(5, 2.6, Math.min(1, this.layers.length / 20));
    this.moving = {
      x: Math.random() < 0.5 ? 30 : this.vw - 30,
      width: this.top.width,
      direction: Math.random() < 0.5 ? 1 : -1,
      speed,
      color: LAYER_COLORS[this.layers.length % LAYER_COLORS.length],
    };
  }

  update(dt) {
    const layer = this.moving;
    if (!layer) return;

    this.dropTimer -= dt;
    if (this.dropTimer <= 0) {
      this.moving = null;
      this.fail({ position: { x: layer.x, y: this.layerY(this.layers.length) }, label: 'ZU LANGSAM' });
      if (!this.gameOver) this.startLayer();
      return;
    }

    layer.x += layer.direction * layer.speed * dt;
    const half = layer.width / 2;
    if (layer.x - half < 6) {
      layer.x = 6 + half;
      layer.direction = 1;
    }
    if (layer.x + half > this.vw - 6) {
      layer.x = this.vw - 6 - half;
      layer.direction = -1;
    }
  }

  onPointer() {
    this.drop();
  }

  onKey(key) {
    if (key === ' ' || key === 'Enter') {
      this.drop();
      return true;
    }
    return false;
  }

  drop() {
    const layer = this.moving;
    if (!layer) return;

    const top = this.top;
    const offset = layer.x - top.x;
    const overlap = Math.min(top.x + top.width / 2, layer.x + layer.width / 2)
      - Math.max(top.x - top.width / 2, layer.x - layer.width / 2);

    const position = { x: layer.x, y: this.layerY(this.layers.length) };

    if (overlap <= 6) {
      this.moving = null;
      this.fail({ position, label: 'DANEBEN' });
      if (!this.gameOver) this.startLayer();
      return;
    }

    const perfect = Math.abs(offset) <= PERFECT_TOLERANCE;
    const width = perfect ? top.width : overlap;
    const x = perfect ? top.x : (Math.max(top.x - top.width / 2, layer.x - layer.width / 2) + Math.min(top.x + top.width / 2, layer.x + layer.width / 2)) / 2;

    this.layers.push({ x, width, color: layer.color });
    this.moving = null;

    // Der Turm wächst nach oben – die Ansicht wandert mit.
    this.cameraY = Math.max(0, (this.layers.length - 6) * LAYER_HEIGHT);

    if (perfect) {
      this.hit({ position, points: this.config.perfectPoints ?? 80, label: 'SAUBER!', type: 'burger' });
    } else {
      this.hit({
        position,
        points: this.config.goodPoints ?? 20,
        perfect: false,
        label: `-${Math.round(top.width - width)}`,
        color: PALETTE.paper,
      });
    }

    // Zu schmal zum Weiterbauen: Der Turm kippt.
    if (!this.gameOver && width < 26) {
      this.fail({ position, label: 'ZU WACKELIG' });
    }
    if (!this.gameOver) this.startLayer();
  }

  layerY(index) {
    return this.baseY - index * LAYER_HEIGHT + this.cameraY;
  }

  /* --------------------------------------------------------------- Render */

  render(ctx) {
    this.drawKitchen(ctx, 96);
    this.label(ctx, 'STAPELN', this.vw / 2, 88, { size: 30, fill: PALETTE.cream });
    this.label(ctx, `${this.layers.length - 1} Schichten`, this.vw / 2, 138, { size: 14, fill: PALETTE.cream });

    // Restzeit für die schwebende Schicht
    if (this.moving) {
      const total = lerp(5, 2.6, Math.min(1, this.layers.length / 20));
      const remaining = Math.max(0, this.dropTimer) / total;
      ctx.fillStyle = PALETTE.paper;
      this.roundedRect(ctx, 40, 150, this.vw - 80, 10, 5);
      ctx.fill();
      this.outline(ctx, 3);
      ctx.fillStyle = remaining < 0.3 ? PALETTE.red : PALETTE.yellow;
      this.roundedRect(ctx, 40, 150, (this.vw - 80) * remaining, 10, 5);
      ctx.fill();
    }

    // Teller aus Edelstahl
    this.steelPanel(
      ctx,
      this.vw / 2 - this.baseWidth / 2 - 20,
      this.baseY + LAYER_HEIGHT - 6,
      this.baseWidth + 40,
      12,
      6,
    );

    for (const [index, layer] of this.layers.entries()) {
      const y = this.layerY(index);
      if (y < 170 || y > this.vh) continue;
      this.drawLayer(ctx, layer, y);
    }

    if (this.moving) {
      this.drawLayer(ctx, this.moving, this.layerY(this.layers.length));
    }
  }

  drawLayer(ctx, layer, y) {
    // Jede Schicht bekommt Wölbung: hell oben, dunkel unten
    const body = ctx.createLinearGradient(0, y, 0, y + LAYER_HEIGHT - 4);
    body.addColorStop(0, this.lighten(layer.color, 32));
    body.addColorStop(0.5, layer.color);
    body.addColorStop(1, this.lighten(layer.color, -38));
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = body;
    this.roundedRect(ctx, layer.x - layer.width / 2, y, layer.width, LAYER_HEIGHT - 4, 8);
    ctx.fill();
    ctx.restore();
    this.outline(ctx, 2);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.roundedRect(ctx, layer.x - layer.width / 2 + 6, y + 3, Math.max(0, layer.width - 12), 3, 2);
    ctx.fill();
  }

  /** Hellt eine Hex-Farbe auf oder dunkelt sie ab. */
  lighten(hex, amount) {
    const value = (offset) => Math.max(0, Math.min(255, parseInt(hex.slice(offset, offset + 2), 16) + amount));
    return `rgb(${value(1)},${value(3)},${value(5)})`;
  }
}
