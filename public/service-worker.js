/* eslint-disable no-restricted-globals */
/* Service Worker file - uses service worker globals (self, caches, clients, location) */
const CACHE_NAME = 'cbc-app-v0.1.8';
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
        // Don't cache HTML (index.html) - use network-first strategy instead
        // This ensures users get the latest version when service worker updates
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
          return Promise.resolve();
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

  // Skip service worker and version.json requests
  if (url.pathname === '/service-worker.js' || url.pathname === '/version.json') {
    return;
  }

  // Network-first strategy for HTML files (index.html, root path, etc.)
  // This ensures users always get the latest version when the service worker updates
  // HTML files are NOT cached to prevent serving old versions after updates
  if (url.pathname === '/' || url.pathname === '/index.html' || 
      (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache HTML - always fetch fresh to ensure users get latest version
          return response;
        })
        .catch(() => {
          // If network fails, try cache as fallback (offline support)
          return caches.match(request);
        })
    );
    return;
  }

  // Network-first strategy for API calls
  // Only cache GET requests - POST/PUT/DELETE cannot be cached
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache GET requests (POST/PUT/DELETE cannot be cached)
          if (request.method === 'GET') {
            // Clone the response for caching
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache (only for GET requests)
          if (request.method === 'GET') {
            return caches.match(request);
          }
          // For non-GET requests, return error response
          return new Response('Network error', { status: 503 });
        })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // If we have a cached response, verify it's not HTML before using it
      if (cachedResponse) {
        const contentType = cachedResponse.headers.get('content-type');
        // If cached response is HTML but request is for a static asset, fetch fresh
        if (contentType && contentType.includes('text/html') && 
            (url.pathname.startsWith('/static/') || 
             url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/))) {
          // Bad cache - delete it and fetch fresh
          caches.open(CACHE_NAME).then((cache) => {
            cache.delete(request);
          });
        } else {
          return cachedResponse;
        }
      }

      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Don't cache HTML responses - they should use network-first strategy
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          // Don't cache HTML - return it but don't store it
          return response;
        }

        // Clone the response for caching (only for non-HTML static assets)
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch((error) => {
        console.error('Service Worker: Fetch error:', error);
        // If fetch fails and we have a cached response, return it
        return caches.match(request);
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
  console.log('Service Worker: Push notification received', event);

  let notificationData = {
    title: 'Notification',
    body: 'You have a new notification',
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Service Worker: Parsed push data:', data);
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: data.data || {},
      };
    } catch (e) {
      console.error('Service Worker: Error parsing push data:', e);
      // Try to get text data as fallback
      try {
        const text = event.data.text();
        console.log('Service Worker: Push data as text:', text);
      } catch (textError) {
        console.error('Service Worker: Could not read push data:', textError);
      }
    }
  } else {
    console.warn('Service Worker: Push event has no data');
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    tag: 'cbc-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  console.log('Service Worker: Showing notification:', notificationData.title, notificationOptions);

  event.waitUntil(
      self.registration.showNotification(notificationData.title, notificationOptions)
          .then(() => {
            console.log('Service Worker: Notification displayed successfully');
          })
          .catch((error) => {
            console.error('Service Worker: Error showing notification:', error);
          })
  );
});

// Notification click event - handle when user clicks on notification
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  // Determine the route based on notification data
  const notificationData = event.notification.data || {};
  const route = notificationData.route || '/';
  const baseUrl = self.location.origin;

  // Open or focus the app
  event.waitUntil(
      self.clients.matchAll({type: 'window', includeUncontrolled: true}).then((clientList) => {
        // If app is already open, navigate to the route and focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.startsWith(baseUrl) && 'focus' in client) {
            // Navigate to the route if needed
            const targetUrl = baseUrl + route;
            if (client.url !== targetUrl && 'navigate' in client) {
              try {
                client.navigate(targetUrl);
              } catch (e) {
                // If navigate fails, fall back to opening new window
                console.log('Navigate failed, opening new window:', e);
                if (self.clients.openWindow) {
                  return self.clients.openWindow(targetUrl);
                }
              }
            }
            return client.focus();
          }
        }
        // Otherwise, open a new window with the route
        if (self.clients.openWindow) {
          return self.clients.openWindow(baseUrl + route);
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

