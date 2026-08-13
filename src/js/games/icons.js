/**
 * Speisen-Icons für die Spielmodi.
 *
 * Alle Modi zeichnen ihre Objekte über dieselben Funktionen, damit ein Nugget
 * überall wie dasselbe Nugget aussieht. Gezeichnet wird prozedural im
 * Marken-Look: kräftige Farben, schwarze Kontur.
 */

import { PALETTE } from './base.js';

/** Warengruppen – Grundlage des Sortier-Modus. */
export const FOOD = {
  nugget: { label: 'Nugget', group: 'chicken' },
  wing: { label: 'Keule', group: 'chicken' },
  tender: { label: 'Tender', group: 'chicken' },
  fries: { label: 'Fries', group: 'beilage' },
  dip: { label: 'Dip', group: 'beilage' },
  drink: { label: 'Drink', group: 'beilage' },
};

export const FOOD_IDS = Object.keys(FOOD);

function outline(ctx, width = 3) {
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = width;
  ctx.stroke();
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function nugget(ctx, size, color) {
  ctx.fillStyle = color ?? PALETTE.golden;
  ctx.beginPath();
  ctx.moveTo(-size / 2, -size / 5);
  ctx.quadraticCurveTo(-size / 2.4, -size / 2, 0, -size / 2.4);
  ctx.quadraticCurveTo(size / 2.2, -size / 2.2, size / 2, -size / 6);
  ctx.quadraticCurveTo(size / 2.2, size / 2.4, 0, size / 2.6);
  ctx.quadraticCurveTo(-size / 2.4, size / 2.4, -size / 2, -size / 5);
  ctx.closePath();
  ctx.fill();
  outline(ctx);
}

function tender(ctx, size, color) {
  ctx.fillStyle = color ?? PALETTE.golden;
  roundedRect(ctx, -size / 4, -size / 2, size / 2, size, size / 4);
  ctx.fill();
  outline(ctx);
}

function wing(ctx, size, color) {
  const radius = size / 2;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = size * 0.26;
  ctx.beginPath();
  ctx.moveTo(radius * 0.3, -radius * 0.28);
  ctx.lineTo(radius * 0.72, -radius * 0.74);
  ctx.stroke();
  ctx.strokeStyle = '#f7f1e0';
  ctx.lineWidth = size * 0.14;
  ctx.stroke();

  ctx.fillStyle = '#f7f1e0';
  ctx.beginPath();
  ctx.arc(radius * 0.72, -radius * 0.74, radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx);

  ctx.fillStyle = color ?? PALETTE.deep;
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.2, radius * 0.82, radius * 0.72, 0.25, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx);
}

function fries(ctx, size) {
  ctx.fillStyle = PALETTE.yellowDark;
  for (const [index, offsetX] of [-0.28, -0.1, 0.08, 0.26].entries()) {
    const height = size * (0.45 + (index % 2) * 0.14);
    roundedRect(ctx, offsetX * size - size * 0.05, -size / 2 - height + size * 0.42, size * 0.1, height, 2);
    ctx.fill();
    outline(ctx, 2);
  }
  ctx.fillStyle = PALETTE.red;
  ctx.beginPath();
  ctx.moveTo(-size / 2.2, 0);
  ctx.lineTo(size / 2.2, 0);
  ctx.lineTo(size / 2.8, size / 2);
  ctx.lineTo(-size / 2.8, size / 2);
  ctx.closePath();
  ctx.fill();
  outline(ctx);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-size / 2.6, size / 8, size / 1.3, size * 0.1);
}

function dip(ctx, size) {
  ctx.fillStyle = PALETTE.cream;
  ctx.beginPath();
  ctx.moveTo(-size / 2.6, -size / 6);
  ctx.lineTo(size / 2.6, -size / 6);
  ctx.lineTo(size / 3.2, size / 2);
  ctx.lineTo(-size / 3.2, size / 2);
  ctx.closePath();
  ctx.fill();
  outline(ctx);

  ctx.fillStyle = PALETTE.blue;
  ctx.beginPath();
  ctx.ellipse(0, -size / 5, size / 2.3, size / 7, 0, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx);
}

function drink(ctx, size) {
  ctx.fillStyle = PALETTE.red;
  ctx.beginPath();
  ctx.moveTo(-size / 3, -size / 2.6);
  ctx.lineTo(size / 3, -size / 2.6);
  ctx.lineTo(size / 4.2, size / 2);
  ctx.lineTo(-size / 4.2, size / 2);
  ctx.closePath();
  ctx.fill();
  outline(ctx);

  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-size / 3.2, -size / 8, size / 1.6, size * 0.12);

  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(size / 8, -size / 2.6);
  ctx.lineTo(size / 3.4, -size / 1.5);
  ctx.stroke();
}

function burger(ctx, size) {
  ctx.fillStyle = PALETTE.bun;
  ctx.beginPath();
  ctx.moveTo(-size / 2, -size / 8);
  ctx.quadraticCurveTo(-size / 2, -size / 1.7, 0, -size / 1.7);
  ctx.quadraticCurveTo(size / 2, -size / 1.7, size / 2, -size / 8);
  ctx.closePath();
  ctx.fill();
  outline(ctx);

  ctx.fillStyle = PALETTE.cheese;
  ctx.beginPath();
  ctx.moveTo(-size / 1.9, -size / 8);
  ctx.lineTo(size / 1.9, -size / 8);
  ctx.lineTo(size / 2.4, size / 8);
  ctx.lineTo(-size / 2.4, size / 8);
  ctx.closePath();
  ctx.fill();
  outline(ctx, 2);

  ctx.fillStyle = PALETTE.deep;
  roundedRect(ctx, -size / 2, size / 12, size, size / 5, 4);
  ctx.fill();
  outline(ctx);

  ctx.fillStyle = PALETTE.bun;
  roundedRect(ctx, -size / 2.1, size / 3.4, size / 1.05, size / 5, 6);
  ctx.fill();
  outline(ctx);
}

function chili(ctx, size) {
  ctx.fillStyle = PALETTE.red;
  ctx.beginPath();
  ctx.ellipse(0, size / 8, size / 5, size / 2.6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  outline(ctx);
  ctx.strokeStyle = '#2f6b2f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-size / 12, -size / 3);
  ctx.lineTo(size / 8, -size / 2);
  ctx.stroke();
}

const DRAWERS = { nugget, tender, wing, fries, dip, drink, burger, chili };

/**
 * Zeichnet ein Speisen-Icon zentriert auf (x, y).
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} type Schlüssel aus FOOD, zusätzlich 'burger' und 'chili'
 */
export function drawFood(ctx, type, x, y, size, color) {
  const drawer = DRAWERS[type] ?? nugget;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  drawer(ctx, size, color);
  ctx.restore();
}
