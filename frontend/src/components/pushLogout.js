import { getAuthHeader } from "./authStorage";

/**
 * Called on logout: removes THIS device's push subscription from the server so
 * the next person to use the device doesn't receive the previous user's
 * shift reminders / team changes.
 *
 * Only the server record is removed. The browser keeps its own subscription
 * and notification permission, so the same person can re-enable on their next
 * login with one tap (no new permission prompt).
 *
 * Call this BEFORE localStorage.clear(): the auth header is read
 * synchronously here, then the request finishes in the background. Never
 * throws and never blocks logout.
 */
export function removeDeviceSubscriptionOnLogout() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return Promise.resolve();
    }

    // Read the token now, before the caller clears storage.
    const headers = getAuthHeader();

    return (async () => {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager?.getSubscription();
      if (!subscription) {
        return;
      }
      await fetch("/api/notification-subscribe", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    })().catch(() => {
      // Best effort only; logout must always succeed.
    });
  } catch {
    return Promise.resolve();
  }
}