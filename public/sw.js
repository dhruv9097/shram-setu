/**
 * ShramSetu service worker.
 *
 * The worker app has to open at a worksite with no signal. The shell is cached
 * on install; pages are tried over the network first and fall back to cache, so
 * a worker who opens the app offline still sees their screen and can mark
 * presence into the local queue.
 *
 * Presence data itself is never cached here — it lives in IndexedDB, written by
 * the app, and is replayed when the network returns.
 */
const CACHE = "shramsetu-v1";
const SHELL = ["/w/home", "/w", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // never serve a stale answer for a presence write or a live query
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit ?? caches.match("/w/home"))),
  );
});
