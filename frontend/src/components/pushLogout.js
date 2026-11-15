import { getAuthHeader } from "./Utils";

/**
 * Best-effort removal of this browser's push subscription during logout.
 *
 * Capture the auth headers before the caller clears localStorage. Only send a
 * DELETE when this browser has an endpoint; an empty endpoint would remove
 * every device registered to the account.
 */
export function removeDeviceSubscriptionOnLogout() {
  try {
    if (
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    // getAuthHeader reads the current token synchronously. The caller clears
    // localStorage immediately after invoking this function.
    const headers = getAuthHeader();

    void (async () => {
      let subscription = null;

      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        subscription =
          (await registration?.pushManager?.getSubscription()) || null;

        if (!subscription?.endpoint) {
          return;
        }

        try {
          await fetch("/api/notification-subscribe", {
            method: "DELETE",
            headers,
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        } finally {
          // Always remove the browser-side subscription, even if the server
          // request fails. A stale server record will be cleaned up on send.
          await subscription.unsubscribe();
        }
      } catch {
        // Logout must never be blocked by push cleanup or browser support.
      }
    })();
  } catch {
    // Logout must never be blocked by push cleanup or missing auth state.
  }
}
