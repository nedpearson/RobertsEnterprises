const CACHE_NAME = 'roberts-erp-v1';
// Minimal caching since it's a dynamic ERP. Just sufficient to pass PWA install criteria
const urlsToCache = [
    '/',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    // Pass through everything else since it's a dynamic auth-based ERP
    event.respondWith(
        fetch(event.request).catch(error => {
            // If network fails (offline), try cache
            return caches.match(event.request);
        })
    );
});
