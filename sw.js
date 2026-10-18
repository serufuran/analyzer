// オフライン用のキャッシュ。版番号は make_pwa.sh が日時で書き換える（版が変わると古いキャッシュを消す）
const CACHE = 'kc-20261018111707';
const OCR_CACHE = 'kc-ocr-5.1.1'; // 文字認識の部品（約13MB）は版をまたいで残す
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== OCR_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // 画面本体：電波があれば最新版、なければ保存済みの版
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('index.html', copy));
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }
  if (url.pathname.includes('/ocr/')) {
    // 文字認識の部品：初めて使ったときに保存し、以後は保存分を使う
    e.respondWith(caches.open(OCR_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
