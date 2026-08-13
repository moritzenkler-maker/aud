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
  redBright: '#f0323a',
  redDark: '#8f1116',
  yellow: '#ffdd00',
  yellowWarm: '#f5c400',
  paper: '#ffffff',
  cream: '#f6f0e6',
  muted: '#a89c8c',
  brown: '#c47a33',
  beak: '#f5c400',
  surface: '#1f1c19',
  surfaceDeep: '#100e0d',
};

const DISPLAY = "'Arial Black', 'Segoe UI', Impact, sans-serif";

/** Leuchtschrift, wie sie über dem Tresen hängt. */
function neonText(ctx, text, x, y, { size, fill, glow, blur = 28, align = 'center', weight = '900' }) {
  ctx.save();
  ctx.textAlign = align;
  ctx.font = `italic ${weight} ${size}px ${DISPLAY}`;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = blur;
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  // Zweiter Durchgang verdichtet den Schein
  if (glow) ctx.fillText(text, x, y);
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

  // Raum: dunkler Tresen mit warmem Spot von oben
  const room = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  room.addColorStop(0, '#241a15');
  room.addColorStop(0.45, COLOR.surfaceDeep);
  room.addColorStop(1, '#0a0908');
  ctx.fillStyle = room;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const spot = ctx.createRadialGradient(WIDTH / 2, 120, 40, WIDTH / 2, 700, 1100);
  spot.addColorStop(0, 'rgba(255, 198, 110, 0.28)');
  spot.addColorStop(1, 'rgba(255, 198, 110, 0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  checkerStrip(ctx, 0, 44);
  checkerStrip(ctx, HEIGHT - 44, 44);

  badge(ctx, WIDTH / 2, 330, 140);
  neonText(ctx, 'LOCO CHICKEN', WIDTH / 2, 540, {
    size: 74,
    fill: COLOR.cream,
    glow: 'rgba(255,255,255,0.25)',
    blur: 16,
  });
  neonText(ctx, stats.mode.toUpperCase(), WIDTH / 2, 626, {
    size: 58,
    fill: COLOR.yellow,
    glow: 'rgba(255,221,0,0.55)',
  });

  if (stats.isRecord) {
    const badgeWidth = 460;
    const badgeY = 690;
    const plate = ctx.createLinearGradient(0, badgeY, 0, badgeY + 76);
    plate.addColorStop(0, COLOR.redBright);
    plate.addColorStop(1, COLOR.redDark);
    ctx.save();
    ctx.shadowColor = 'rgba(240,50,58,0.6)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = plate;
    ctx.beginPath();
    ctx.roundRect?.((WIDTH - badgeWidth) / 2, badgeY, badgeWidth, 76, 38);
    if (!ctx.roundRect) ctx.rect((WIDTH - badgeWidth) / 2, badgeY, badgeWidth, 76);
    ctx.fill();
    ctx.restore();
    neonText(ctx, 'NEUER REKORD', WIDTH / 2, badgeY + 54, { size: 44, fill: '#fff' });
  }

  // Punktestand als Leuchtziffer
  neonText(ctx, stats.score.toLocaleString('de-DE'), WIDTH / 2, 940, {
    size: 250,
    fill: COLOR.yellow,
    glow: 'rgba(255,190,40,0.65)',
    blur: 48,
  });
  neonText(ctx, 'PUNKTE', WIDTH / 2, 1014, { size: 46, fill: COLOR.muted, glow: null });

  // Kennzahlen auf dunklen Tafeln
  const tiles = [
    { label: 'PERFEKT', value: String(stats.perfects) },
    { label: 'COMBO', value: `x${stats.bestCombo}` },
    { label: 'SERIE', value: `${stats.streak}` },
  ];
  const boxWidth = 296;
  const gap = 26;
  const totalWidth = tiles.length * boxWidth + (tiles.length - 1) * gap;
  const boxY = 1090;

  tiles.forEach((item, index) => {
    const x = (WIDTH - totalWidth) / 2 + index * (boxWidth + gap);
    const surface = ctx.createLinearGradient(0, boxY, 0, boxY + 190);
    surface.addColorStop(0, '#2b2723');
    surface.addColorStop(1, '#151311');
    ctx.fillStyle = surface;
    ctx.beginPath();
    ctx.roundRect?.(x, boxY, boxWidth, 190, 22);
    if (!ctx.roundRect) ctx.rect(x, boxY, boxWidth, 190);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 3;
    ctx.stroke();

    neonText(ctx, item.value, x + boxWidth / 2, boxY + 112, {
      size: 74,
      fill: COLOR.yellow,
      glow: 'rgba(255,221,0,0.4)',
      blur: 18,
    });
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `800 28px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillStyle = COLOR.muted;
    ctx.fillText(item.label, x + boxWidth / 2, boxY + 156);
    ctx.restore();
  });

  // Rang auf einem Schild aus Stahl
  const rankY = 1350;
  const steel = ctx.createLinearGradient(0, rankY, 0, rankY + 120);
  steel.addColorStop(0, '#7c8085');
  steel.addColorStop(0.2, '#54585c');
  steel.addColorStop(1, '#2a2c2f');
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.roundRect?.(130, rankY, WIDTH - 260, 120, 18);
  if (!ctx.roundRect) ctx.rect(130, rankY, WIDTH - 260, 120);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 4;
  ctx.stroke();
  neonText(ctx, stats.rank.toUpperCase(), WIDTH / 2, rankY + 80, { size: 58, fill: '#fdf8ee', glow: null });

  neonText(ctx, 'SCHAFFST DU MEHR?', WIDTH / 2, 1610, {
    size: 66,
    fill: COLOR.redBright,
    glow: 'rgba(240,50,58,0.55)',
  });

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `700 38px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillStyle = COLOR.muted;
  ctx.fillText('Loco Chicken App · Spiel dir deinen Gutschein', WIDTH / 2, 1700);
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
