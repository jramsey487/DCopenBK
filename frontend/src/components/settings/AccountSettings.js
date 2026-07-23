import React, { useState } from "react";

import { Banners, getAuthHeader } from "../Utils";
import "./account-settings.css";

function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    oldPassword.length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    !submitting;

  function handleSubmit(e) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setSubmitting(true);
    fetch("/accounts/users/set_password/", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        new_password: password,
        re_new_password: confirmPassword,
        current_password: oldPassword,
      }),
    })
      .then(async (response) => {
        if (response.ok) {
          setSuccessMsg("Password updated successfully.");
          setOldPassword("");
          setPassword("");
          setConfirmPassword("");
          return;
        }
        let message = "Could not change password. Check your current password.";
        try {
          const data = await response.json();
          const detail =
            data?.current_password?.[0] ||
            data?.new_password?.[0] ||
            data?.re_new_password?.[0] ||
            data?.detail;
          if (detail) {
            message = String(detail);
          }
        } catch {
          /* ignore */
        }
        setErrorMsg(message);
      })
      .catch(() => {
        setErrorMsg("Something went wrong. Please try again.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <div className="account-settings-card">
      {successMsg ? (
        <div className="account-settings-alert success" role="status">
          {successMsg}
        </div>
      ) : null}
      {errorMsg ? (
        <div className="account-settings-alert error" role="alert">
          {errorMsg}
        </div>
      ) : null}

      <form className="account-settings-form" onSubmit={handleSubmit}>
        <div className="account-settings-field">
          <label className="account-settings-label" htmlFor="acct-old-password">
            Current password
          </label>
          <input
            id="acct-old-password"
            className="account-settings-input"
            type="password"
            autoComplete="current-password"
            value={oldPassword}
            required
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>
        <div className="account-settings-field">
          <label className="account-settings-label" htmlFor="acct-new-password">
            New password
          </label>
          <input
            id="acct-new-password"
            className="account-settings-input"
            type="password"
            autoComplete="new-password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="account-settings-field">
          <label
            className="account-settings-label"
            htmlFor="acct-confirm-password"
          >
            Confirm new password
          </label>
          <input
            id="acct-confirm-password"
            className="account-settings-input"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            required
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="account-settings-submit"
          disabled={!canSubmit}
        >
          {submitting ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function AccountSettings() {
  return (
    <div className="page account-settings-shell">
      <Banners />
      <div className="account-settings-page">
        <header className="account-settings-header">
          <h1 className="account-settings-title">Account Settings</h1>
          <p className="account-settings-subtitle">
            Keep your account secure with a strong password.
          </p>
        </header>
        <ChangePassword />
      </div>
    </div>
  );
}
