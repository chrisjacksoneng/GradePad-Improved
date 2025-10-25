// Service Worker for GradePad
const CACHE_NAME = 'gradepad-v1';
const urlsToCache = [
  '/',
  '/gradepad/index.html',
  '/gradepad/grades.html',
  '/gradepad/styles/styles.css',
  '/gradepad/assets/images/gradepadlogo.png',
  '/gradepad/jsScripts/firebase.js',
  '/gradepad/jsScripts/auth.js',
  '/gradepad/jsScripts/main.js',
  '/gradepad/jsScripts/db.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
