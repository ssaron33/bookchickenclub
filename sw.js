const APP_VERSION = '0.8.0';
const CACHE_NAME = `bookchickenclub-v${APP_VERSION.replace(/\./g, '-')}-shell`;
const ASSETS = [
  './',
  `./index.html?v=${APP_VERSION}`,
  `./styles.css?v=${APP_VERSION}`,
  `./app.js?v=${APP_VERSION}`,
  `./manifest.json?v=${APP_VERSION}`
];

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

  const shellPath = url.pathname.endsWith('/') || /\/(?:index\.html|app\.js|styles\.css|manifest\.json)$/.test(url.pathname);
  if(shellPath){
    const bust = new URL(url.href);
    bust.searchParams.set('v', APP_VERSION);
    event.respondWith(
      fetch(new Request(bust.href, request), {cache:'no-store'})
        .then(response => {
          if(response.ok){
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())).catch(()=>{});
          }
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match(`./index.html?v=${APP_VERSION}`)))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => response)
      .catch(() => caches.match(request))
  );
});
