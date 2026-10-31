// Service worker de Físico: guarda la app (mismo origen) para que abra como app instalada y sin internet.
// Cada vez que se toca index.html se sube este número: así el teléfono baja la versión nueva sola.
const CACHE = "fisico-v2";
const ARCHIVOS = [".", "index.html", "manifest.webmanifest", "icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k.startsWith("fisico-") && k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Sólo archivos propios (mismo origen): primero la red (siempre lo último) y, sin internet, lo guardado.
// Todo lo externo —Firebase, el SDK de jsdelivr, Google Fonts— va directo a la red para no romper la sync.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});

// Al tocar el aviso de "terminó el descanso", vuelve a la app.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
      for (const w of ws) if ("focus" in w) return w.focus();
      return self.clients.openWindow ? self.clients.openWindow(".") : null;
    })
  );
});
