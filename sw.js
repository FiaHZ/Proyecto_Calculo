const CACHE_NAME = 'dino-game-v1';
const urlsToCache = [
  '/',
  '/dino.html',
  '/css/styles.css',
  '/js/game.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});