// Service Worker for PWA with Offline Support
// Update the version number below to refresh the cache

const CACHE_VERSION = '1.0.1';
const CACHE_NAME = `downbeat-v${CACHE_VERSION}`;

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/img/favicon-96x96.png',
  '/img/favicon.svg',
  '/img/favicon.ico',
  '/img/apple-touch-icon.png',
  '/img/web-app-manifest-192x192.png',
  '/img/web-app-manifest-512x512.png',
  // External CDN resources
  'https://cdn.jsdelivr.net/npm/framework7@8/framework7-bundle.min.css',
  'https://cdn.jsdelivr.net/npm/framework7-icons@5/css/framework7-icons.css',
  'https://cdn.jsdelivr.net/npm/framework7@8/framework7-bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/msgpack-lite@0.1.26/dist/msgpack.min.js'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  console.log(`Service Worker: Installing (${CACHE_NAME})...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('Service Worker: All assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`Service Worker: Activating (${CACHE_NAME})...`);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log(`Service Worker: Deleting old cache: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - cache-first strategy for offline support
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          // Update cache in background for next time
          fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, response);
                });
              }
            })
            .catch(() => {
              // Network failed, but we have cached version
            });
          
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            // Cache successful responses for offline use
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            
            return response;
          })
          .catch((error) => {
            console.log('Fetch failed; returning offline page:', error);
            throw error;
          });
      })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
