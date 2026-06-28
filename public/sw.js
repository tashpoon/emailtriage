// Minimal service worker — enables PWA installability
// Caches the app shell on install for offline splash screen

const CACHE_NAME = 'email-triage-v1'
const PRECACHE = ['/', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Network-first for API calls, cache-first for static assets
  if (event.request.url.includes('/api/')) {
    return // let network handle API calls natively
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
