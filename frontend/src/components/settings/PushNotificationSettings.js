import React, { useEffect, useState } from "react";

import { getAuthHeader } from "../Utils";
import "./push-notification-settings.css";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushNotificationSettings() {
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/notification-settings", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then(setSettings)
      .catch(() => setError("Could not load notification settings."));
  }, []);

  async function updatePreference(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
    try {
      const response = await fetch("/api/notification-settings", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error();
      setSettings(await response.json());
    } catch {
      setError("Could not save that notification setting.");
    }
  }

  async function enableNotifications() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
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

      const settingsResponse = await fetch("/api/notification-settings", {
        headers: getAuthHeader(),
      });
      setSettings(await settingsResponse.json());
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
      const response = await fetch("/api/notification-subscribe", {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (!response.ok) throw new Error();

      const registration = await navigator.serviceWorker?.getRegistration("/");
      const subscription = await registration?.pushManager?.getSubscription();
      if (subscription) await subscription.unsubscribe();

      setSettings((current) => ({ ...current, subscribed: false }));
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

  return (
    <div className="push-settings-card">
      <h2 className="push-settings-title">Notifications</h2>
      <p className="push-settings-description">
        Get a reminder 10 minutes before your shift and a notification when your team assignment changes.
      </p>

      {message ? <div className="push-settings-message">{message}</div> : null}
      {error ? <div className="push-settings-error">{error}</div> : null}

      <div className="push-settings-actions">
        {settings.subscribed ? (
          <button type="button" className="push-settings-button secondary" onClick={disableNotifications} disabled={busy}>
            {busy ? "Saving…" : "Disable notifications"}
          </button>
        ) : (
          <button type="button" className="push-settings-button" onClick={enableNotifications} disabled={busy}>
            {busy ? "Enabling…" : "Enable notifications"}
          </button>
        )}
      </div>

      <div className="push-settings-preferences">
        <label>
          <input
            type="checkbox"
            checked={settings.shift_reminders_enabled}
            onChange={(event) => updatePreference("shift_reminders_enabled", event.target.checked)}
            disabled={!settings.subscribed || busy}
          />
          Shift reminders — 10 minutes before your shift
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.team_changes_enabled}
            onChange={(event) => updatePreference("team_changes_enabled", event.target.checked)}
            disabled={!settings.subscribed || busy}
          />
          Team assignment changes — after the assignment is stable for 5 minutes
        </label>
      </div>
    </div>
  );
}
