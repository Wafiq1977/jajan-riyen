/* Service Worker Jajan Riyen — PWA offline shell.
 * Strategi:
 *  - Navigasi halaman & API : network-first (selalu data terbaru, fallback cache saat offline)
 *  - Aset statis (_next/static, icons, gambar): cache-first (aman, ber-hash)
 */
const CACHE = "jajanriyen-v1";
const OFFLINE_ALLOW = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(OFFLINE_ALLOW))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStatic = url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/");
  const isImage = url.pathname.startsWith("/products/") || url.pathname.startsWith("/banners/") || url.pathname.startsWith("/uploads/");
  const isNav = request.mode === "navigate";

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
    return;
  }

  if (isNav || isImage || url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && (isNav || isImage)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || (isNav ? caches.match("/") : Response.error())))
    );
  }
});
