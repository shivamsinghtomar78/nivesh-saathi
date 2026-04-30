const CACHE_NAME = "nivesh-saathi-v3";
const API_CACHE_NAME = "nivesh-saathi-api-v3";
const APP_SHELL = ["/", "/compare", "/chat", "/voice", "/login", "/icon.svg"];
const OFFLINE_DATA_URLS = ["/api/fd-rates?limit=8"];
const STATIC_EXTENSIONS = [
  ".css",
  ".js",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".woff",
  ".woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.addAll(APP_SHELL))
        .catch(() => undefined),
      caches
        .open(API_CACHE_NAME)
        .then((cache) => cache.addAll(OFFLINE_DATA_URLS))
        .catch(() => undefined),
    ])
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
});

function isCacheableStatic(url) {
  return (
    url.origin === self.location.origin &&
    STATIC_EXTENSIONS.some((extension) => url.pathname.endsWith(extension))
  );
}

function isOfflineDataRequest(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname === "/api/fd-rates" || url.pathname.startsWith("/api/jargon/"))
  );
}

function staleWhileRevalidate(request) {
  return caches.open(API_CACHE_NAME).then((cache) =>
    cache.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() =>
          cached ||
          new Response(
            JSON.stringify({
              ok: false,
              offline: true,
              error: "Offline and no cached data is available yet.",
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          )
        );

      return cached || networkFetch;
    })
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (isOfflineDataRequest(url)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  if (!isCacheableStatic(url)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      });
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : {
        title: "Nivesh Saathi rate alert",
        body: "A watched FD rate has changed.",
      };

  event.waitUntil(
    self.registration.showNotification(data.title || "Nivesh Saathi", {
      body: data.body || "A watched FD rate has changed.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url || "/compare" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/compare";
  event.waitUntil(clients.openWindow(targetUrl));
});
