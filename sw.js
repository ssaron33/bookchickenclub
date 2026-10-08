const CACHE_NAME = 'bookchickenclub-v0-7-8-shell';
const ASSETS = ['./','./index.html?v=0.7.8','./styles.css?v=0.7.8','./app.js?v=0.7.8','./manifest.json?v=0.7.8'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;
  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;
  if(url.pathname.endsWith('/sw.js')) return;

  // 앱 셸은 버전 쿼리로 최신 배포본을 강제한다.
  const shellPath = url.pathname.endsWith('/') || /\/(?:index\.html|app\.js|styles\.css|manifest\.json)$/.test(url.pathname);
  if(shellPath){
    const bust = new URL(url.href);
    bust.searchParams.set('v','0.7.8');
    event.respondWith(fetch(new Request(bust.href, request), {cache:'no-store'}).then(response => response));
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if(response && response.ok){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html?v=0.7.8')))
  );
});
