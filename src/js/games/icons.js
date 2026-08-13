/**
 * Produkt-Grafiken für die Spielmodi.
 *
 * Gezeichnet werden ausschließlich Dinge, die es bei Loco Chicken wirklich
 * gibt (siehe brand.js): Wings, Filets, Crispy Fries, Potato Pops, Onion
 * Rings, BBQ Waffle, Dips, Chili Cheese Burger – dazu der Chili als
 * Störobjekt und der Shaker aus der Protein-Kooperation.
 *
 * Anders als eine Comic-Illustration arbeiten die Formen mit Verläufen,
 * Glanzkanten und Panierkrümeln, damit sie im dunklen Ladenlicht wie echte
 * Ware wirken statt wie Symbole.
 */

import { PALETTE } from './base.js';

/** Warmer Verlauf für frittierte Ware. */
function crustGradient(ctx, size, base) {
  const gradient = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  gradient.addColorStop(0, shade(base, 26));
  gradient.addColorStop(0.45, base);
  gradient.addColorStop(1, shade(base, -34));
  return gradient;
}

/**
 * Zerlegt eine Farbe in ihre Kanäle.
 * Verarbeitet `#rrggbb` und `rgb(r,g,b)` – die Garfarben der Fritteuse werden
 * zur Laufzeit gemischt und kommen deshalb als rgb() an.
 */
function channels(color) {
  if (color.startsWith('#')) {
    return [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
  }
  const parts = color.match(/-?\d+(\.\d+)?/g);
  return parts ? parts.slice(0, 3).map(Number) : [200, 150, 60];
}

/** Hellt eine Farbe auf (positiv) oder dunkelt sie ab (negativ). */
function shade(color, amount) {
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  const [r, g, b] = channels(color);
  return `rgb(${clamp(r + amount)},${clamp(g + amount)},${clamp(b + amount)})`;
}

/** Dunkle Kante – dünner als eine Comic-Kontur, nur zum Absetzen. */
function edge(ctx, width = 2) {
  ctx.strokeStyle = 'rgba(30,18,8,0.75)';
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Glanzlicht oben links, wie von einem Spot. */
function gloss(ctx, x, y, rx, ry, alpha = 0.32) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Panierkrümel – macht aus einer Fläche eine Kruste. */
function crumbs(ctx, size, count, base) {
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + i;
    const radius = size * (0.1 + ((i * 37) % 100) / 380);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = i % 2 === 0 ? shade(base, 34) : shade(base, -40);
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * radius, Math.sin(angle * 1.3) * radius * 0.8, size * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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

/* --------------------------------------------------------------- Chicken */

function filet(ctx, size, color) {
  const base = color ?? PALETTE.golden;
  ctx.fillStyle = crustGradient(ctx, size, base);
  ctx.beginPath();
  ctx.moveTo(-size * 0.34, -size * 0.3);
  ctx.bezierCurveTo(-size * 0.1, -size * 0.52, size * 0.28, -size * 0.44, size * 0.34, -size * 0.12);
  ctx.bezierCurveTo(size * 0.4, size * 0.2, size * 0.12, size * 0.46, -size * 0.12, size * 0.42);
  ctx.bezierCurveTo(-size * 0.36, size * 0.38, -size * 0.46, size * 0.02, -size * 0.34, -size * 0.3);
  ctx.closePath();
  ctx.fill();
  edge(ctx);
  crumbs(ctx, size, 9, base);
  gloss(ctx, -size * 0.12, -size * 0.22, size * 0.16, size * 0.08);
}

function wings(ctx, size, color) {
  const base = color ?? PALETTE.deep;

  // Knochen zuerst, damit das Fleisch darüber liegt
  ctx.strokeStyle = '#efe4cd';
  ctx.lineWidth = size * 0.12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.12, -size * 0.12);
  ctx.lineTo(size * 0.34, -size * 0.38);
  ctx.stroke();
  ctx.fillStyle = '#f6efdd';
  ctx.beginPath();
  ctx.arc(size * 0.36, -size * 0.4, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  edge(ctx, 1.5);

  ctx.fillStyle = crustGradient(ctx, size, base);
  ctx.beginPath();
  ctx.ellipse(-size * 0.04, size * 0.1, size * 0.38, size * 0.32, 0.3, 0, Math.PI * 2);
  ctx.fill();
  edge(ctx);
  crumbs(ctx, size, 8, base);
  gloss(ctx, -size * 0.16, -size * 0.04, size * 0.14, size * 0.07);
}

/* ---------------------------------------------------------------- Sides */

function fries(ctx, size) {
  // Pommes hinter der Tüte
  for (const [index, offset] of [-0.26, -0.09, 0.08, 0.25].entries()) {
    const height = size * (0.5 + (index % 2) * 0.14);
    const gradient = ctx.createLinearGradient(0, -size * 0.5, 0, 0);
    gradient.addColorStop(0, '#ffe07a');
    gradient.addColorStop(1, '#e0a52a');
    ctx.fillStyle = gradient;
    roundedRect(ctx, offset * size - size * 0.05, -size * 0.52 - height + size * 0.5, size * 0.1, height, size * 0.03);
    ctx.fill();
    edge(ctx, 1.5);
  }

  const box = ctx.createLinearGradient(-size / 2, 0, size / 2, 0);
  box.addColorStop(0, '#a8161c');
  box.addColorStop(0.4, '#e8323a');
  box.addColorStop(1, '#8f1116');
  ctx.fillStyle = box;
  ctx.beginPath();
  ctx.moveTo(-size * 0.44, 0);
  ctx.lineTo(size * 0.44, 0);
  ctx.lineTo(size * 0.34, size * 0.5);
  ctx.lineTo(-size * 0.34, size * 0.5);
  ctx.closePath();
  ctx.fill();
  edge(ctx);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(-size * 0.36, size * 0.14, size * 0.72, size * 0.09);
}

function pops(ctx, size) {
  // Drei kleine Kartoffelbällchen
  for (const [dx, dy, r] of [
    [-0.18, -0.06, 0.19],
    [0.16, -0.12, 0.17],
    [0.02, 0.12, 0.2],
  ]) {
    const gradient = ctx.createRadialGradient(
      dx * size - r * size * 0.3,
      dy * size - r * size * 0.3,
      r * size * 0.15,
      dx * size,
      dy * size,
      r * size,
    );
    gradient.addColorStop(0, '#ffd98a');
    gradient.addColorStop(1, '#c98a26');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(dx * size, dy * size, r * size, 0, Math.PI * 2);
    ctx.fill();
    edge(ctx);
  }
  gloss(ctx, -size * 0.2, -size * 0.14, size * 0.07, size * 0.04, 0.4);
}

function onion(ctx, size) {
  for (const [dx, dy, r] of [
    [-0.12, -0.08, 0.3],
    [0.14, 0.1, 0.26],
  ]) {
    const gradient = ctx.createLinearGradient(dx * size - r * size, 0, dx * size + r * size, 0);
    gradient.addColorStop(0, '#f2c368');
    gradient.addColorStop(0.5, '#d99a34');
    gradient.addColorStop(1, '#a86f1c');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = size * 0.14;
    ctx.beginPath();
    ctx.arc(dx * size, dy * size, r * size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(30,18,8,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(dx * size, dy * size, r * size + size * 0.07, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(dx * size, dy * size, r * size - size * 0.07, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function waffle(ctx, size) {
  const gradient = ctx.createLinearGradient(0, -size * 0.4, 0, size * 0.4);
  gradient.addColorStop(0, '#e8b45c');
  gradient.addColorStop(1, '#b87a25');
  ctx.fillStyle = gradient;
  roundedRect(ctx, -size * 0.42, -size * 0.34, size * 0.84, size * 0.68, size * 0.1);
  ctx.fill();
  edge(ctx);

  ctx.strokeStyle = 'rgba(90,52,14,0.55)';
  ctx.lineWidth = size * 0.05;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * size * 0.21, -size * 0.34);
    ctx.lineTo(i * size * 0.21, size * 0.34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.42, i * size * 0.21);
    ctx.lineTo(size * 0.42, i * size * 0.21);
    ctx.stroke();
  }

  // BBQ-Glasur
  ctx.fillStyle = 'rgba(120,32,14,0.65)';
  ctx.beginPath();
  ctx.ellipse(size * 0.06, -size * 0.1, size * 0.2, size * 0.1, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function dip(ctx, size) {
  const cup = ctx.createLinearGradient(-size * 0.3, 0, size * 0.3, 0);
  cup.addColorStop(0, '#d8d2c6');
  cup.addColorStop(0.45, '#fbf7ef');
  cup.addColorStop(1, '#cbc4b6');
  ctx.fillStyle = cup;
  ctx.beginPath();
  ctx.moveTo(-size * 0.32, -size * 0.14);
  ctx.lineTo(size * 0.32, -size * 0.14);
  ctx.lineTo(size * 0.24, size * 0.42);
  ctx.lineTo(-size * 0.24, size * 0.42);
  ctx.closePath();
  ctx.fill();
  edge(ctx);

  // Deckel in der Farbe der Sorte
  ctx.fillStyle = '#2e5fa3';
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.16, size * 0.33, size * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  edge(ctx);
  gloss(ctx, -size * 0.12, -size * 0.2, size * 0.1, size * 0.03, 0.35);
}

function burger(ctx, size) {
  // Unteres Bun
  const bun = ctx.createLinearGradient(0, -size * 0.1, 0, size * 0.5);
  bun.addColorStop(0, '#eab873');
  bun.addColorStop(1, '#b8802f');
  ctx.fillStyle = bun;
  roundedRect(ctx, -size * 0.42, size * 0.16, size * 0.84, size * 0.24, size * 0.1);
  ctx.fill();
  edge(ctx);

  // Patty
  ctx.fillStyle = crustGradient(ctx, size, PALETTE.deep);
  roundedRect(ctx, -size * 0.46, size * 0.02, size * 0.92, size * 0.2, size * 0.07);
  ctx.fill();
  edge(ctx);

  // Cheese
  ctx.fillStyle = '#f7b731';
  ctx.beginPath();
  ctx.moveTo(-size * 0.47, size * 0.02);
  ctx.lineTo(size * 0.47, size * 0.02);
  ctx.lineTo(size * 0.34, size * 0.16);
  ctx.lineTo(-size * 0.34, size * 0.16);
  ctx.closePath();
  ctx.fill();

  // Oberes Bun
  const top = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.02);
  top.addColorStop(0, '#f3c684');
  top.addColorStop(1, '#c98e39');
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(-size * 0.42, size * 0.02);
  ctx.quadraticCurveTo(-size * 0.42, -size * 0.48, 0, -size * 0.48);
  ctx.quadraticCurveTo(size * 0.42, -size * 0.48, size * 0.42, size * 0.02);
  ctx.closePath();
  ctx.fill();
  edge(ctx);

  ctx.fillStyle = 'rgba(255,244,220,0.85)';
  for (const [dx, dy] of [[-0.16, -0.28], [0.1, -0.34], [0.22, -0.2]]) {
    ctx.beginPath();
    ctx.ellipse(dx * size, dy * size, size * 0.045, size * 0.028, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function chili(ctx, size) {
  const gradient = ctx.createLinearGradient(-size * 0.2, 0, size * 0.2, 0);
  gradient.addColorStop(0, '#8f1116');
  gradient.addColorStop(0.45, '#e8323a');
  gradient.addColorStop(1, '#a8161c');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.12, size * 0.19, size * 0.38, 0.18, 0, Math.PI * 2);
  ctx.fill();
  edge(ctx);
  gloss(ctx, -size * 0.06, -size * 0.02, size * 0.04, size * 0.14, 0.4);

  ctx.strokeStyle = '#3f7a35';
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-size * 0.04, -size * 0.3);
  ctx.lineTo(size * 0.12, -size * 0.48);
  ctx.stroke();
}

function shaker(ctx, size) {
  const body = ctx.createLinearGradient(-size * 0.3, 0, size * 0.3, 0);
  body.addColorStop(0, '#16150f');
  body.addColorStop(0.4, '#403c36');
  body.addColorStop(1, '#1b1a18');
  ctx.fillStyle = body;
  roundedRect(ctx, -size * 0.26, -size * 0.16, size * 0.52, size * 0.62, size * 0.08);
  ctx.fill();
  edge(ctx);

  ctx.fillStyle = '#c11d24';
  roundedRect(ctx, -size * 0.3, -size * 0.36, size * 0.6, size * 0.2, size * 0.06);
  ctx.fill();
  edge(ctx);

  ctx.strokeStyle = 'rgba(255,221,0,0.85)';
  ctx.lineWidth = size * 0.03;
  for (const y of [0.02, 0.14, 0.26]) {
    ctx.beginPath();
    ctx.moveTo(size * 0.06, y * size);
    ctx.lineTo(size * 0.18, y * size);
    ctx.stroke();
  }
  gloss(ctx, -size * 0.14, size * 0.05, size * 0.04, size * 0.18, 0.16);
}

const DRAWERS = { filet, wings, fries, pops, onion, waffle, dip, burger, chili, shaker };

/**
 * Zeichnet ein Produkt zentriert auf (x, y).
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} type Schlüssel aus brand.js PRODUCTS, zusätzlich 'chili' und 'shaker'
 */
export function drawFood(ctx, type, x, y, size, color) {
  const drawer = DRAWERS[type] ?? filet;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';

  // Weicher Schlagschatten, damit die Ware auf der Fläche liegt
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.42, size * 0.34, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawer(ctx, size, color);
  ctx.restore();
}
