// Kitchen Pass service worker — minimal app-shell cache.
// Keeps the UI installable and lets it reopen offline; live data (Firestore,
// DUPR, Excel import) still needs a connection as usual.

const CACHE_NAME = "kitchen-pass-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(SHELL_FILES);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// Network-first for the app shell so updates show up quickly; fall back to
// cache when offline. Cross-origin requests (Firebase, SheetJS CDN) are left
// alone entirely.
self.addEventListener("fetch", function(event){
  var url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;
  if(event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).then(function(response){
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
      return response;
    }).catch(function(){
      return caches.match(event.request).then(function(cached){
        return cached || caches.match("./index.html");
      });
    })
  );
});
