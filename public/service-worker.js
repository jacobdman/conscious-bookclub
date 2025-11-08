const CACHE_NAME = 'cbc-app-v1';
const VERSION_URL = '/version.json';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching static assets');
      // Cache the main page and critical assets
      // Note: Static assets with hashed names will be cached on first fetch
      return Promise.all([
        cache.add('/').catch(() => {}),
        cache.add('/manifest.json').catch(() => {}),
        cache.add(VERSION_URL).catch(() => {}),
      ]).catch((error) => {
        console.log('Service Worker: Cache addAll error:', error);
        // Don't fail installation if some files can't be cached
      });
    })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Network-first strategy for API calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request);
        })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Listen for skip waiting message from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skipping waiting and activating');
    self.skipWaiting();
  }
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');

  let notificationData = {
    title: 'Notification',
    body: 'You have a new notification',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {},
      };
    } catch (e) {
      console.error('Service Worker: Error parsing push data:', e);
    }
  }

  event.waitUntil(
      self.registration.showNotification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        data: notificationData.data,
        tag: 'cbc-notification',
        requireInteraction: false,
      })
  );
});

// Notification click event - handle when user clicks on notification
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  // Open or focus the app
  event.waitUntil(
      clients.matchAll({type: 'window', includeUncontrolled: true}).then((clientList) => {
        // If app is already open, focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Check for version updates periodically
self.addEventListener('sync', (event) => {
  if (event.tag === 'version-check') {
    event.waitUntil(checkVersion());
  }
});

async function checkVersion() {
  try {
    const response = await fetch(VERSION_URL, { cache: 'no-store' });
    const versionData = await response.json();
    console.log('Service Worker: Current version:', versionData.version);
    // Version check is handled by the client-side UpdatePrompt component
  } catch (error) {
    console.error('Service Worker: Error checking version:', error);
  }
}

