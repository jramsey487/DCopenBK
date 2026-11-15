/** Ask the service worker to forget cached API responses (login/logout). */
export function clearOfflineCache() {
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_API_CACHE" });
    }
  } catch {
    /* best effort */
  }
}