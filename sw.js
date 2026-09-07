/* sw.js — service worker : l'application fonctionne entièrement hors connexion */
var CACHE = 'wanianga-recensement-v2';
var FICHIERS = [
  './',
  'index.html',
  'css/styles.css',
  'js/core.js',
  'js/db.js',
  'js/ui.js',
  'js/app.js',
  'js/sync.js',
  'js/photo.js',
  'js/signature.js',
  'js/carte.js',
  'js/supervision.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHIERS); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') { return; }
  e.respondWith(
    caches.match(e.request).then(function (reponse) {
      return reponse || fetch(e.request).then(function (res) {
        var copie = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copie); });
        return res;
      }).catch(function () { return caches.match('index.html'); });
    })
  );
});
