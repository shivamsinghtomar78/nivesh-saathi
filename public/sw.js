const CACHE_NAME = "nivesh-saathi-v3";
const API_CACHE_NAME = "nivesh-saathi-api-v3";
const APP_SHELL = ["/", "/compare", "/fds", "/chat", "/voice", "/login", "/icon.svg"];
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

function normalizePushPayload(rawPayload) {
  const payload = rawPayload || {};
  const data = payload.data || payload;
  const notification = payload.notification || {};
  const isFdAlert = data.type === "fd_maturity_alert";

  return {
    title:
      data.title ||
      notification.title ||
      (isFdAlert ? "FD maturity reminder" : "Nivesh Saathi rate alert"),
    body:
      data.body ||
      notification.body ||
      (isFdAlert
        ? "A tracked fixed deposit is near maturity."
        : "A watched FD rate has changed."),
    url: data.url || payload.fcmOptions?.link || (isFdAlert ? "/fds" : "/compare"),
    type: data.type || "rate_alert",
    fdId: data.fdId,
    alertId: data.alertId,
    milestone: data.milestone,
  };
}

self.addEventListener("push", (event) => {
  let rawPayload = null;
  try {
    rawPayload = event.data ? event.data.json() : null;
  } catch {
    rawPayload = null;
  }
  const data = normalizePushPayload(rawPayload);

  event.waitUntil(
    self.registration.showNotification(data.title || "Nivesh Saathi", {
      body: data.body || "A watched FD rate has changed.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/compare";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url.includes(targetUrl));
      if (existing) {
        return existing.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});
