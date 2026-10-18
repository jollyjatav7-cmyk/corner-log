/* 角球事件記錄：離線快取
   第一次聯網打開時把檔案存到裝置上；之後優先用本機檔案（離線也能開），
   有網路時在背景取得新版，下次打開就是新版。換了圖示等檔案時把版本號加 1。 */
const CACHE = 'corner-log-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k.startsWith('corner-log')).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const key = req.mode === 'navigate' ? './index.html' : req;
  const network = fetch(req).then(res => {
    if (res && res.ok && res.type === 'basic'){
      const copy = res.clone();
      return caches.open(CACHE).then(c => c.put(key, copy)).then(() => res, () => res);
    }
    return res;
  }).catch(() => null);
  e.waitUntil(network);
  e.respondWith(caches.match(key, { ignoreSearch: true }).then(hit => hit || network.then(res =>
    res || new Response('目前離線，而且這個檔案還沒存到裝置上。請先聯網打開一次。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))));
});
