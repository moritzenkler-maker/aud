/**
 * Ergebniskarte zum Teilen.
 *
 * Zeichnet das Rundenergebnis als Hochformat-Bild (9:16) – das Format, in
 * dem Stories und Kurzvideos laufen. Der Screenshot ist der eigentliche
 * Verbreitungsweg: Wer ein gutes Ergebnis hat, soll es in zwei Tipps
 * weitergeben können, ohne die App zu verlassen.
 */

const WIDTH = 1080;
const HEIGHT = 1920;

const COLOR = {
  ink: '#12100e',
  red: '#d91f26',
  yellow: '#ffdd00',
  paper: '#ffffff',
  brown: '#c47a33',
  beak: '#f5c400',
};

const DISPLAY = "'Arial Black', 'Segoe UI', Impact, sans-serif";

function outlinedText(ctx, text, x, y, { size, fill, stroke = COLOR.ink, width = 12, align = 'center' }) {
  ctx.save();
  ctx.textAlign = align;
  ctx.font = `italic 900 ${size}px ${DISPLAY}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Karo-Streifen wie auf der Verpackung. */
function checkerStrip(ctx, y, height) {
  const tile = height;
  for (let x = 0, column = 0; x < WIDTH; x += tile, column += 1) {
    ctx.fillStyle = column % 2 === 0 ? COLOR.red : COLOR.paper;
    ctx.fillRect(x, y, tile, tile);
  }
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(0, y - 8, WIDTH, 8);
  ctx.fillRect(0, y + height, WIDTH, 8);
}

/** Vereinfachtes Marken-Badge: Hahn mit Sonnenbrille im gelben Kreis. */
function badge(ctx, cx, cy, radius) {
  ctx.save();
  ctx.translate(cx, cy);
  const scale = radius / 100;
  ctx.scale(scale, scale);

  ctx.fillStyle = COLOR.red;
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR.yellow;
  ctx.beginPath();
  ctx.arc(0, 0, 88, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = COLOR.ink;

  // Kamm
  ctx.fillStyle = COLOR.red;
  ctx.beginPath();
  ctx.moveTo(-34, -44);
  ctx.quadraticCurveTo(-42, -76, -12, -68);
  ctx.quadraticCurveTo(-8, -96, 16, -78);
  ctx.quadraticCurveTo(38, -88, 34, -46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Kopf
  ctx.fillStyle = COLOR.brown;
  ctx.beginPath();
  ctx.ellipse(0, -4, 56, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sonnenbrille
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(-50, -26, 100, 14);
  ctx.beginPath();
  ctx.roundRect?.(-48, -18, 42, 30, 10);
  if (!ctx.roundRect) ctx.rect(-48, -18, 42, 30);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect?.(6, -18, 42, 30, 10);
  if (!ctx.roundRect) ctx.rect(6, -18, 42, 30);
  ctx.fill();

  // Schnabel mit Grinsen
  ctx.fillStyle = COLOR.beak;
  ctx.beginPath();
  ctx.moveTo(-34, 18);
  ctx.quadraticCurveTo(0, 56, 34, 18);
  ctx.quadraticCurveTo(0, 4, -34, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLOR.paper;
  ctx.beginPath();
  ctx.moveTo(-26, 22);
  ctx.quadraticCurveTo(0, 46, 26, 22);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Zeichnet die Ergebniskarte.
 * @param {{score:number, perfects:number, bestCombo:number, rank:string,
 *          streak:number, isRecord:boolean}} stats
 * @returns {HTMLCanvasElement}
 */
export function renderShareCard(stats) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = COLOR.yellow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  checkerStrip(ctx, 0, 56);
  checkerStrip(ctx, HEIGHT - 56, 56);

  badge(ctx, WIDTH / 2, 330, 150);

  outlinedText(ctx, 'LOCO FRYER', WIDTH / 2, 580, { size: 96, fill: COLOR.red, width: 14 });

  if (stats.isRecord) {
    ctx.save();
    ctx.translate(WIDTH / 2, 648);
    ctx.rotate(-0.04);
    ctx.fillStyle = COLOR.red;
    ctx.fillRect(-260, -42, 520, 84);
    ctx.strokeStyle = COLOR.ink;
    ctx.lineWidth = 8;
    ctx.strokeRect(-260, -42, 520, 84);
    outlinedText(ctx, 'NEUER REKORD', 0, 22, { size: 52, fill: COLOR.yellow, width: 9 });
    ctx.restore();
  }

  // Punktestand als Hauptmotiv
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `italic 900 260px ${DISPLAY}`;
  ctx.fillStyle = COLOR.red;
  ctx.fillText(stats.score.toLocaleString('de-DE'), WIDTH / 2 + 14, 950);
  ctx.restore();
  outlinedText(ctx, stats.score.toLocaleString('de-DE'), WIDTH / 2, 936, {
    size: 260,
    fill: COLOR.yellow,
    width: 22,
  });
  outlinedText(ctx, 'PUNKTE', WIDTH / 2, 1020, { size: 58, fill: COLOR.paper, width: 12 });

  // Kennzahlen
  const stats3 = [
    { label: 'PERFEKT', value: String(stats.perfects) },
    { label: 'COMBO', value: `x${stats.bestCombo}` },
    { label: 'SERIE', value: `${stats.streak} 🔥` },
  ];
  const boxWidth = 300;
  const gap = 24;
  const totalWidth = stats3.length * boxWidth + (stats3.length - 1) * gap;
  stats3.forEach((item, index) => {
    const x = (WIDTH - totalWidth) / 2 + index * (boxWidth + gap);
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(x, 1110, boxWidth, 190);
    ctx.strokeStyle = COLOR.ink;
    ctx.lineWidth = 8;
    ctx.strokeRect(x, 1110, boxWidth, 190);
    outlinedText(ctx, item.value, x + boxWidth / 2, 1220, { size: 76, fill: COLOR.red, width: 10 });
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `800 30px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillStyle = COLOR.ink;
    ctx.fillText(item.label, x + boxWidth / 2, 1268);
    ctx.restore();
  });

  // Rang
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(120, 1330, WIDTH - 240, 130);
  outlinedText(ctx, stats.rank.toUpperCase(), WIDTH / 2, 1418, {
    size: 66,
    fill: COLOR.yellow,
    stroke: COLOR.ink,
    width: 6,
  });

  outlinedText(ctx, 'SCHAFFST DU MEHR?', WIDTH / 2, 1620, { size: 72, fill: COLOR.paper, width: 14 });

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `800 42px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle = COLOR.ink;
  ctx.fillText('Loco Chicken App · Spiel dir deinen Gutschein', WIDTH / 2, 1710);
  ctx.restore();

  return canvas;
}

/** Canvas als PNG-Blob. */
export function cardToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Versucht, die Karte über das System-Teilen-Menü zu verschicken.
 * Fällt auf das Kopieren des Ergebnistexts zurück, wenn das Gerät oder der
 * Kontext (z. B. eine eingebettete Vorschau) das Teilen nicht erlaubt.
 *
 * @returns {Promise<'shared'|'copied'|'manual'>}
 */
export async function shareCard(canvas, text) {
  try {
    const blob = await cardToBlob(canvas);
    const file = blob && new File([blob], 'loco-fryer.png', { type: 'image/png' });

    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ text });
      return 'shared';
    }
  } catch {
    // Abbruch durch den Nutzer oder gesperrter Kontext – weiter zum Fallback.
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}
