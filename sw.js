// SCIENCE UP! Service Worker
// 一度読み込んだファイルをキャッシュし、オフラインでも動くようにする
//
// 同じ origin（biosprout.github.io）に他の BioSprout アプリも置かれているので、
// cache 名はアプリ固有の CACHE_PREFIX で始め、掃除するときも自分の prefix の古い cache だけを消す。
const CACHE_PREFIX = 'scienceup-';
const CACHE = CACHE_PREFIX + 'v2';
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

// 必須 asset の precache に失敗したら install を失敗させる（既存の Service Worker がそのまま残る）。
// このとき新しく作った空の cache は消す。すでにあった cache（稼働中の版）には触れない。
self.addEventListener('install', e => {
  e.waitUntil(
    caches.has(CACHE).then(existed =>
      caches.open(CACHE)
        .then(c => c.addAll(ASSETS))
        .catch(err => (existed ? Promise.resolve() : caches.delete(CACHE)).then(() => { throw err; }))
    ).then(() => self.skipWaiting())
  );
});

// 自分の prefix を持つ古い cache だけ削除する。他アプリの cache と、今使っている CACHE は残す
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 正常な response（ok）だけを cache に保存する。404 や 500 は保存しない
function putIfOk(req, res){
  if(res && res.ok){
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

// アプリ本体と問題データはネットワーク優先。失敗したときだけキャッシュを使う。
// こうしておくと、data/*.json を差し替えるだけで新しい内容が届く
// （このファイルの CACHE 版数を上げ直さなくてよい）。
// ネットワークが error response（404 等）を返したときも、正常な cache があればそちらを返す。
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
          if (res.ok) return putIfOk(req, res);
          return caches.match(req).then(hit => hit || (isDoc ? caches.match('./index.html') : null) || res);
        })
        .catch(() => caches.match(req).then(r => r || (isDoc ? caches.match('./index.html') : undefined)))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => putIfOk(req, res)))
  );
});
