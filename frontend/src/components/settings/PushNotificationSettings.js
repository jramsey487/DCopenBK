import React, { useEffect, useState } from "react";

import { getAuthHeader } from "../Utils";
import "./push-notification-settings.css";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

async function getLocalSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager?.getSubscription()) || null;
}

// Loads server settings, telling the server which device (endpoint) is asking
// so it can report whether *this* device is subscribed.
async function loadSettings() {
  let endpoint = "";
  if (isPushSupported()) {
    endpoint = (await getLocalSubscription())?.endpoint || "";
  }
  const query = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : "";
  const response = await fetch(`/api/notification-settings${query}`, {
    headers: getAuthHeader(),
  });
  if (!response.ok) throw new Error("Could not load notification settings.");
  return response.json();
}

export default function PushNotificationSettings() {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load notification settings.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function updatePreference(field, value) {
    setError("");
    setSettings((current) => ({ ...current, [field]: value }));
    try {
      const response = await fetch("/api/notification-settings", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      // The PATCH response doesn't know which device we are; keep that flag.
      setSettings((current) => ({
        ...current,
        ...data,
        device_subscribed: current.device_subscribed,
      }));
    } catch {
      setError("Could not save that notification setting.");
      try {
        setSettings(await loadSettings());
      } catch {
        /* keep what we have */
      }
    }
  }

  async function enableNotifications() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (!isPushSupported()) {
        throw new Error("This browser does not support push notifications.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const keyResponse = await fetch("/api/notification-subscribe", {
        headers: getAuthHeader(),
      });
      const keyData = await keyResponse.json();
      if (!keyResponse.ok || !keyData.public_key) {
        throw new Error("Push notifications are not configured on the server yet.");
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.public_key),
        });
      }

      const saveResponse = await fetch("/api/notification-subscribe", {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!saveResponse.ok) throw new Error("Could not save the push subscription.");

      setSettings(await loadSettings());
      setMessage("Notifications are enabled on this device.");
    } catch (err) {
      setError(err.message || "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const subscription = await getLocalSubscription();
      const response = await fetch("/api/notification-subscribe", {
        method: "DELETE",
        headers: getAuthHeader(),
        body: JSON.stringify({ endpoint: subscription?.endpoint || "" }),
      });
      if (!response.ok) throw new Error();

      if (subscription) await subscription.unsubscribe();

      setSettings(await loadSettings());
      setMessage("Notifications are disabled on this device.");
    } catch {
      setError("Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (!settings || !settings.configured) {
    return null;
  }

  const supported = isPushSupported();
  const needsIosInstall = !supported && isIos() && !isStandalone();

  return (
    <div className="push-settings-card">
      <h2 className="push-settings-title">Notifications</h2>
      <p className="push-settings-description">
        Get a reminder 10 minutes before your shift and a notification when your team assignment changes.
      </p>

      {message ? <div className="push-settings-message">{message}</div> : null}
      {error ? <div className="push-settings-error">{error}</div> : null}

      {needsIosInstall ? (
        <div className="push-settings-message">
          On iPhone and iPad, notifications only work from the Home Screen app. Tap
          the Share button in Safari, choose “Add to Home Screen”, then open the app
          from your Home Screen and enable notifications here.
        </div>
      ) : !supported ? (
        <div className="push-settings-error">
          This browser does not support push notifications.
        </div>
      ) : (
        <div className="push-settings-actions">
          {settings.device_subscribed ? (
            <button
              type="button"
              className="push-settings-button secondary"
              onClick={disableNotifications}
              disabled={busy}
            >
              {busy ? "Saving…" : "Disable notifications on this device"}
            </button>
          ) : (
            <button
              type="button"
              className="push-settings-button"
              onClick={enableNotifications}
              disabled={busy}
            >
              {busy ? "Enabling…" : "Enable notifications on this device"}
            </button>
          )}
        </div>
      )}

      <div className="push-settings-preferences">
        <label>
          <input
            type="checkbox"
            checked={settings.shift_reminders_enabled}
            onChange={(event) =>
              updatePreference("shift_reminders_enabled", event.target.checked)
            }
            disabled={!settings.subscribed || busy}
          />
          Shift reminders — 10 minutes before your shift
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.team_changes_enabled}
            onChange={(event) =>
              updatePreference("team_changes_enabled", event.target.checked)
            }
            disabled={!settings.subscribed || busy}
          />
          Team assignment changes — after the assignment is stable for 5 minutes
        </label>
      </div>
    </div>
  );
}