/* FlowAtlas Service Worker · 离线可用 */
var CACHE = 'flowatlas-v1';
var ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './js/util.js', './js/illustrations.js', './js/store.js', './js/categorize.js', './js/parsers.js',
  './js/charts.js', './js/report.js', './js/ui.js',
  './js/views-main.js', './js/views-plan.js', './js/views-import.js',
  './js/views-report.js', './js/views-more.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
