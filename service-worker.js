const CACHE_NAME = "medq-cache-v3";

/* Core app shell — always precached so the app itself opens offline.
   Uses cache.add() per file (not addAll) so one missing/renamed file
   (e.g. icon-192.png if it hasn't been added yet) doesn't break the
   whole install. */
const shellUrls = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        shellUrls.map(url =>
          cache.add(url).catch(err => {
            console.warn("Skipped caching (not found yet):", url);
          })
        )
      );
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

/* Runtime caching: every quiz page (and any asset it uses) gets cached
   automatically the first time it's opened while online. No need to
   list new .html files here as you add more topics. */
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(networkResponse => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.url.startsWith(self.location.origin)
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline and this exact file was never cached.
        // For page navigations, fall back to the cached app shell
        // instead of returning nothing (which crashes with ERR_FAILED).
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return new Response("", { status: 503, statusText: "Offline" });
      });
    })
  );
});
