// SCIENCE UP! Service Worker
// 一度読み込んだファイルをキャッシュし、オフラインでも動くようにする
const CACHE = 'scienceup-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './data/index.json',
  './data/phys.json',
  './data/chem.json',
  './data/bio.json',
  './data/earth.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// アプリ本体と問題データはネットワーク優先。失敗したときだけキャッシュを使う。
// こうしておくと、data/*.json を差し替えるだけで新しい問題が届く
// （このファイルの CACHE 版数を上げ直さなくてよい）。
// アイコンなど変わらないものはキャッシュ優先で速く出す。
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // フォントなど外部は素通し

  const isDoc = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  const isData = url.pathname.indexOf('/data/') >= 0 && url.pathname.endsWith('.json');

  if (isDoc || isData) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || (isDoc ? caches.match('./index.html') : undefined)))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
