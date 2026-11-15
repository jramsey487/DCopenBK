const VERSION = "v2";
const SHELL_CACHE = `dcopenbk-shell-${VERSION}`;
const ASSET_CACHE = `dcopenbk-assets-${VERSION}`;
const API_CACHE = `dcopenbk-api-${VERSION}`;
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE, API_CACHE];

// Read-only endpoints worth having at a venue with bad wifi. live-scores is
// deliberately excluded: a stale score is worse than no score.
const CACHEABLE_API = new Set([
  "list",
  "sorted-list",
  "get-schedule",
  "get-next-shifts",
  "calc-num-teams",
  "get-tournament",
  "court-notes",
  "team-pairs",
  "banner-list",
]);

const API_TIMEOUT_MS = 5000;
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add("/"))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("dcopenbk-") && !KNOWN_CACHES.includes(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

// The page tells us to drop cached API data on login/logout so a shared
// device never shows the previous user's data.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_API_CACHE") {
    event.waitUntil(caches.delete(API_CACHE));
  }
});

async function networkFirst(request, cacheName, cacheKey, timeoutMs) {
  const cache = await caches.open(cacheName);
  const network = fetch(request).then((response) => {
    if (response && response.ok) {
      cache.put(cacheKey, response.clone());
    }
    return response;
  });
  network.catch(() => {}); // avoid unhandled rejection if we fall back to cache

  try {
    return await Promise.race([
      network,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
      ),
    ]);
  } catch (error) {
    const cached = await cache.match(cacheKey, { ignoreVary: true });
    if (cached) {
      return cached;
    }
    return network; // nothing cached: surface the real network result/error
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // SPA navigations: the same index.html serves every route.
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, SHELL_CACHE, new Request("/"), NAV_TIMEOUT_MS)
    );
    return;
  }

  // Hashed build assets never change for a given URL.
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    const name = url.pathname.slice("/api/".length).split("/")[0];
    if (CACHEABLE_API.has(name)) {
      event.respondWith(
        networkFirst(request, API_CACHE, new Request(url.href), API_TIMEOUT_MS)
      );
    }
  }
});

// ---------------------------------------------------------------- push

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { title: "DC Open Ballcrew", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "DC Open Ballcrew";
  const options = {
    body: payload.body || "You have a new DC Open Ballcrew update.",
    icon: "/favicon.png",
    badge: "/favicon-32.png",
    tag: payload.tag || "dcopenbk-notification",
    renotify: true,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });

      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch (error) {
              // Some browsers can't navigate an existing window; focusing is enough.
            }
          }
          return;
        }
      }

      if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    })()
  );
});