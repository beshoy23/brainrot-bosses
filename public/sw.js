// Kick Chain Brawler Service Worker
// Enables offline play and fast loading

const CACHE_NAME = 'kick-brawler-v1';
const STATIC_CACHE_NAME = 'kick-brawler-static-v1';

// Essential files for the game to work offline
const ESSENTIAL_FILES = [
  '/brainrot-bosses/',
  '/brainrot-bosses/index.html',
  '/brainrot-bosses/src/main.ts',
  '/brainrot-bosses/patapim.png',
  '/brainrot-bosses/patapim-idle.png', 
  '/brainrot-bosses/patapim-run.png',
  '/brainrot-bosses/patapim-attack.png',
  '/brainrot-bosses/brbrattack1.png'
];

// Game assets that enhance experience but aren't critical
const GAME_ASSETS = [
  '/brainrot-bosses/zombie-male-idle.png',
  '/brainrot-bosses/zombie-female-idle.png',
  '/brainrot-bosses/black-warrior-idle.png',
  '/brainrot-bosses/red-lancer-idle.png', 
  '/brainrot-bosses/yellow-monk-idle.png',
  '/brainrot-bosses/zombie-male-walk.png',
  '/brainrot-bosses/zombie-female-walk.png',
  '/brainrot-bosses/black-warrior-run.png',
  '/brainrot-bosses/red-lancer-run.png',
  '/brainrot-bosses/yellow-monk-run.png'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  console.log('🥋 Kick Brawler Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache essential files
      caches.open(STATIC_CACHE_NAME).then(cache => {
        return cache.addAll(ESSENTIAL_FILES);
      }),
      // Cache game assets (don't fail if some are missing)
      caches.open(CACHE_NAME).then(cache => {
        return Promise.allSettled(
          GAME_ASSETS.map(asset => cache.add(asset))
        );
      })
    ]).then(() => {
      console.log('🎮 Kick Brawler: Ready for offline play!');
      self.skipWaiting(); // Activate immediately
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🥋 Kick Brawler Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            console.log('🗑️ Cleaning up old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Kick Brawler: Cache cleanup complete');
      self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests
  if (!url.origin.includes(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Found in cache - serve immediately
        return cachedResponse;
      }
      
      // Not in cache - fetch from network
      return fetch(request).then(networkResponse => {
        // Clone response for caching
        const responseClone = networkResponse.clone();
        
        // Cache successful responses
        if (networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        
        return networkResponse;
      }).catch(error => {
        console.log('🚫 Network fetch failed:', request.url);
        
        // Provide offline fallback for HTML pages
        if (request.destination === 'document') {
          return caches.match('/brainrot-bosses/index.html');
        }
        
        // For other assets, just return the error
        throw error;
      });
    })
  );
});

// Background sync for when user comes back online
self.addEventListener('sync', event => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-game-sync') {
    event.waitUntil(
      // Could sync game stats, achievements, etc.
      Promise.resolve()
    );
  }
});

// Push notifications (future feature)
self.addEventListener('push', event => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/brainrot-bosses/patapim.png',
      badge: '/brainrot-bosses/patapim.png',
      tag: 'kick-brawler-notification',
      actions: [
        {
          action: 'play',
          title: '🥋 Play Now',
          icon: '/brainrot-bosses/patapim.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('Kick Chain Brawler', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'play') {
    event.waitUntil(
      clients.openWindow('/brainrot-bosses/')
    );
  }
});

console.log('🥋 Kick Brawler Service Worker: Loaded and ready!');