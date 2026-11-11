// Karteikarten – Offline-Speicher.
// Prinzip: immer zuerst aus dem Netz laden (neueste Karten), nur ohne Netz aus dem Speicher.
// Kein skipWaiting/claim: eine neue sw.js übernimmt erst beim nächsten App-Start, ohne Meldung.
const VERSION = "2026-11-11-1";
const CACHE = "karteikarten-" + VERSION;
const CORE = ["./", "index.html", "cards.js", "stoff.js", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k.startsWith("karteikarten-") && k !== "karteikarten-fonts").map(k => caches.delete(k)))));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req, { cache: "no-cache" }).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          const key = req.mode === "navigate" ? "./" : url.pathname.replace(/^.*\/karteikarten\//, "") || "./";
          caches.open(CACHE).then(c => c.put(key, copy));
        }
        return res;
      }).catch(() => caches.open(CACHE).then(c =>
        (req.mode === "navigate" ? c.match("./") : c.match(req, { ignoreSearch: true }))
          .then(r => r || c.match(url.pathname.replace(/^.*\/karteikarten\//, ""), { ignoreSearch: true }))
      ))
    );
  } else if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.open("karteikarten-fonts").then(c => c.match(req).then(r => r || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
  }
});
