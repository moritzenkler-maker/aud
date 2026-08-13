/**
 * Modus "Kasse": Kopfrechnen unter Zeitdruck.
 *
 * Ein Gast zahlt, das Wechselgeld muss stimmen – und zwar schnell. Der
 * einzige Modus, der nicht über die Finger, sondern über den Kopf geht.
 */

import GameBase, { PALETTE, lerp } from './base.js';

const NOTES = [5, 10, 20, 50];

const euro = (value) => `${value.toFixed(2).replace('.', ',')} €`;

export default class RegisterGame extends GameBase {
  setup() {
    this.round = 0;
    this.question = null;
    this.pressed = null;
    this.pressedTimer = 0;
    this.nextQuestion();
  }

  layout() {
    const top = this.vh * 0.52;
    const gap = 12;
    const width = (this.vw - 44 - gap) / 2;
    const height = Math.max(56, Math.min(78, (this.vh - top - 110) / 2 - gap));

    this.options = Array.from({ length: 4 }, (unused, index) => ({
      x: 22 + (index % 2) * (width + gap),
      y: top + Math.floor(index / 2) * (height + gap),
      width,
      height,
    }));
  }

  get answerTime() {
    return lerp(7, 3.2, Math.min(1, this.round / 16));
  }

  nextQuestion() {
    this.round += 1;

    // Betrag mit "krummen" Cent, damit Kopfrechnen nötig ist.
    const total = Math.round((3 + Math.random() * 22) * 100) / 100;
    const note = NOTES.find((value) => value > total) ?? Math.ceil(total / 10) * 10;
    const change = Math.round((note - total) * 100) / 100;

    const wrong = new Set();
    const candidates = [
      change + 1,
      change - 1,
      change + 0.1,
      change - 0.1,
      Math.round((note - total + 0.5) * 100) / 100,
      Math.round((total - Math.floor(total)) * 100) / 100,
    ];
    for (const value of candidates) {
      const rounded = Math.round(value * 100) / 100;
      if (rounded > 0 && Math.abs(rounded - change) > 0.001) wrong.add(rounded);
      if (wrong.size >= 3) break;
    }

    const answers = [change, ...[...wrong].slice(0, 3)];
    for (let i = answers.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }

    this.question = { total, note, change, answers, timer: this.answerTime, maxTimer: this.answerTime };
  }

  update(dt) {
    if (this.pressedTimer > 0) this.pressedTimer -= dt;
    if (!this.question) return;

    this.question.timer -= dt;
    if (this.question.timer <= 0) {
      this.fail({ position: { x: this.vw / 2, y: this.vh * 0.4 }, label: 'ZU LANGSAM' });
      if (!this.gameOver) this.nextQuestion();
    }
  }

  onPointer(x, y) {
    const index = this.options.findIndex(
      (option) => x >= option.x && x <= option.x + option.width && y >= option.y && y <= option.y + option.height,
    );
    if (index < 0) return;
    this.answer(index);
  }

  onKey(key) {
    const index = Number.parseInt(key, 10) - 1;
    if (Number.isInteger(index) && index >= 0 && index < 4) {
      this.answer(index);
      return true;
    }
    return false;
  }

  answer(index) {
    if (!this.question) return;

    const option = this.options[index];
    const position = { x: option.x + option.width / 2, y: option.y + option.height / 2 };
    const value = this.question.answers[index];
    this.pressed = index;
    this.pressedTimer = 0.18;

    if (Math.abs(value - this.question.change) < 0.001) {
      this.hit({ position, points: this.config.perfectPoints ?? 85, label: 'STIMMT!', type: 'register' });
    } else {
      this.fail({ position, label: euro(this.question.change) });
    }
    if (!this.gameOver) this.nextQuestion();
  }

  /* --------------------------------------------------------------- Render */

  render(ctx) {
    this.drawKitchen(ctx, 96);
    this.label(ctx, 'WECHSELGELD', this.vw / 2, 88, { size: 28, fill: PALETTE.cream });

    const question = this.question;
    if (!question) return;

    // Bon
    const bonX = 30;
    const bonY = 120;
    const bonWidth = this.vw - 60;
    const bonHeight = this.vh * 0.24;

    this.paperPanel(ctx, bonX, bonY, bonWidth, bonHeight, 10);

    this.label(ctx, `Summe ${euro(question.total)}`, this.vw / 2, bonY + bonHeight * 0.34, {
      size: 22,
      fill: PALETTE.ink,
    });
    this.label(ctx, `Gast zahlt ${euro(question.note)}`, this.vw / 2, bonY + bonHeight * 0.6, {
      size: 22,
      fill: PALETTE.red,
    });

    const remaining = Math.max(0, question.timer) / question.maxTimer;
    ctx.fillStyle = '#d5cdbb';
    this.roundedRect(ctx, bonX + 16, bonY + bonHeight - 26, bonWidth - 32, 12, 6);
    ctx.fill();
    this.outline(ctx, 1.5);
    ctx.fillStyle = remaining < 0.3 ? PALETTE.red : PALETTE.yellow;
    this.roundedRect(ctx, bonX + 16, bonY + bonHeight - 26, (bonWidth - 32) * remaining, 12, 6);
    ctx.fill();

    this.label(ctx, 'Wie viel zurück?', this.vw / 2, this.vh * 0.48, { size: 18, fill: PALETTE.cream });

    for (const [index, option] of this.options.entries()) {
      const active = this.pressed === index && this.pressedTimer > 0;
      this.shelfPanel(ctx, option.x, option.y, option.width, option.height, 12, active);
      this.label(ctx, euro(question.answers[index]), option.x + option.width / 2, option.y + option.height / 2 + 8, {
        size: 22,
        fill: active ? PALETTE.yellow : PALETTE.cream,
      });
    }
  }
}
