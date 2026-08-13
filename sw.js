/* Service Worker: App-Shell offline verfügbar machen. */

const CACHE = 'loco-chicken-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/logo.svg',
  './assets/coin.svg',
  './assets/rewards/dip.svg',
  './assets/rewards/fries.svg',
  './assets/rewards/tenders.svg',
  './assets/rewards/burger.svg',
  './assets/rewards/bucket.svg',
  './assets/rewards/shaker.svg',
  './assets/rewards/whey.svg',
  './src/css/styles.css',
  './src/js/app.js',
  './src/js/game.js',
  './src/js/brand.js',
  './src/js/economy.js',
  './src/js/missions.js',
  './src/js/sharecard.js',
  './src/js/modes.js',
  './src/js/games/base.js',
  './src/js/games/icons.js',
  './src/js/games/fryer.js',
  './src/js/games/order.js',
  './src/js/games/sorting.js',
  './src/js/games/chili.js',
  './src/js/games/stack.js',
  './src/js/games/dipmeter.js',
  './src/js/games/register.js',
  './src/js/games/belt.js',
  './src/js/storage.js',
  './src/js/audio.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Cache first – die App-Shell ändert sich nur mit einer neuen Cache-Version.
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            return response;
          })
          .catch(() => caches.match('./index.html')),
    ),
  );
});
