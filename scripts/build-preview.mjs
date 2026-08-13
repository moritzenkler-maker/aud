/**
 * Baut aus den Projektquellen eine einzelne HTML-Datei (`dist/preview.html`).
 *
 * Zweck: eine teilbare Vorschau zum Testen, die ohne Server und ohne
 * Nachbarn-Dateien auskommt. CSS und JavaScript werden eingebettet, die
 * SVG-Assets als data:-URI eingesetzt.
 *
 * Die Datei ist bewusst ein HTML-Fragment ohne <!doctype>/<html>/<body>:
 * So lässt sie sich sowohl direkt im Browser öffnen als auch als Artifact
 * veröffentlichen, das seinen eigenen Dokumentrahmen mitbringt.
 *
 * Start: `npm run build:preview`
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (...parts) => readFile(join(ROOT, ...parts), 'utf8');

/** Reihenfolge entspricht den Abhängigkeiten der Module untereinander. */
const MODULES = [
  'src/js/brand.js',
  'src/js/economy.js',
  'src/js/missions.js',
  'src/js/modes.js',
  'src/js/storage.js',
  'src/js/audio.js',
  'src/js/sharecard.js',
  'src/js/games/base.js',
  'src/js/games/icons.js',
  'src/js/games/fryer.js',
  'src/js/games/order.js',
  'src/js/games/sorting.js',
  'src/js/games/chili.js',
  'src/js/games/stack.js',
  'src/js/games/dipmeter.js',
  'src/js/games/register.js',
  'src/js/games/belt.js',
  'src/js/game.js',
  'src/js/app.js',
];

const ASSETS = [
  'assets/icon.svg',
  'assets/logo.svg',
  'assets/coin.svg',
  'assets/rewards/dip.svg',
  'assets/rewards/fries.svg',
  'assets/rewards/tenders.svg',
  'assets/rewards/burger.svg',
  'assets/rewards/bucket.svg',
  'assets/rewards/shaker.svg',
  'assets/rewards/whey.svg',
];

/** Entfernt die Modul-Syntax, damit alle Dateien in einem Script laufen. */
function inlineModule(source) {
  return source
    .replace(/^import\s+[^;]*?;\s*$/gms, '')
    // Re-Exporte (`export { a } from './x.js'`) haben im Bündel keinen Sinn.
    .replace(/^export\s*\{[^}]*\}\s*(?:from\s*'[^']*')?;\s*$/gm, '')
    .replace(/^export\s+default\s+class/gm, 'class')
    .replace(/^export\s+(const|function|class|let)\b/gm, '$1')
    // Der Service Worker ist Teil der ausgelieferten App, nicht der Vorschau.
    .replace(/if \('serviceWorker' in navigator\) \{[\s\S]*?\n\}\n?/g, '')
    .trim();
}

async function assetMap() {
  const entries = await Promise.all(
    ASSETS.map(async (path) => {
      const svg = await read(path);
      const uri = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
      return [path, uri];
    }),
  );
  return new Map(entries);
}

/** Ersetzt alle Verweise auf ./assets/... durch die eingebetteten data:-URIs. */
function embedAssets(text, assets) {
  let output = text;
  for (const [path, uri] of assets) {
    output = output.replaceAll(`./${path}`, uri);
  }
  return output;
}

/**
 * Prüft, ob zwei Module denselben Namen auf oberster Ebene vergeben.
 * Im Bündel landen alle Module in einem Geltungsbereich – eine Dopplung
 * wäre ein SyntaxError, der erst im Browser auffiele.
 */
function assertNoNameClashes(sources) {
  const pattern = /^(?:export\s+)?(?:default\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  const owners = new Map();
  const clashes = [];

  for (const [path, source] of sources) {
    for (const [, name] of source.matchAll(pattern)) {
      if (owners.has(name) && owners.get(name) !== path) {
        clashes.push(`${name} (${owners.get(name)} und ${path})`);
      } else {
        owners.set(name, path);
      }
    }
  }

  if (clashes.length > 0) {
    throw new Error(`Doppelte Namen auf oberster Ebene:\n  ${clashes.join('\n  ')}`);
  }
}

async function build() {
  const [html, css, assets] = await Promise.all([read('index.html'), read('src/css/styles.css'), assetMap()]);

  const scripts = await Promise.all(MODULES.map((path) => read(path)));
  assertNoNameClashes(MODULES.map((path, index) => [path, inlineModule(scripts[index])]));
  const bundle = scripts.map(inlineModule).join('\n\n');

  // Nur den Inhalt zwischen <body> und </body> übernehmen.
  const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
  if (!bodyMatch) throw new Error('index.html: <body> nicht gefunden');

  const body = bodyMatch[1]
    // Das Script wird unten eingebettet, der externe Verweis entfällt.
    .replace(/\s*<script type="module"[^>]*><\/script>/, '')
    .trim();

  const page = `<title>Loco Games</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

<!-- Automatisch erzeugt von scripts/build-preview.mjs – nicht von Hand ändern. -->
<style>
${css.trim()}
</style>

${body}

<script type="module">
${bundle}
</script>
`;

  const output = embedAssets(page, assets);
  await mkdir(join(ROOT, 'dist'), { recursive: true });
  await writeFile(join(ROOT, 'dist/preview.html'), output, 'utf8');

  const kb = (Buffer.byteLength(output, 'utf8') / 1024).toFixed(1);
  console.log(`dist/preview.html geschrieben (${kb} kB)`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
