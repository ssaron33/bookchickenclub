const CACHE_NAME = 'bookchickenclub-v0-7-6-shell';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./manifest.json'];

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

  // 앱 코드/HTML/CSS는 항상 네트워크에서 최신 파일을 우선 가져온다.
  const isAppShell = /\/(?:index\.html|app\.js|styles\.css|manifest\.json)?$/.test(url.pathname);
  event.respondWith(
    fetch(request, {cache: isAppShell ? 'no-store' : 'default'})
      .then(response => {
        if(response && response.ok){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
  );
});
