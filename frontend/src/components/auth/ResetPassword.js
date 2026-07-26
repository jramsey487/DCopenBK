import React, { useState } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";

import BallcrewLogo from "../BallcrewLogo";
import "./login.css";

async function handleSubmit(
  uid,
  token,
  password,
  confirmPassword,
  navigate,
  setErrorMsg,
  setLoading
) {
  setErrorMsg("");

  if (password !== confirmPassword) {
    setErrorMsg("Passwords do not match.");
    return;
  }

  setLoading(true);
  try {
    const response = await fetch("/accounts/users/reset_password_confirm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: uid,
        token: token,
        new_password: password,
        re_new_password: confirmPassword,
      }),
    });
    if (response.ok) {
      navigate("/reset-password-complete");
      return;
    }
    setErrorMsg("This reset link is invalid or has expired.");
  } catch {
    setErrorMsg("Could not reach the server. Is the backend running?");
  } finally {
    setLoading(false);
  }
}

export default function ResetPassword(props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const { uid, token } = useParams();
  const navigate = useNavigate();

  const canSubmit =
    password.length > 0 && confirmPassword.length > 0 && !loading;

  function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    handleSubmit(
      uid,
      token,
      password,
      confirmPassword,
      navigate,
      setErrorMsg,
      setLoading
    );
  }

  return (
    <div className="page login-shell">
      <div className="login-page">
        <div className="login-brand">
          <BallcrewLogo variant="crest" size={56} />
          <p className="login-brand-title">Mubadala DC Open Ballcrew</p>
        </div>

        <section className="login-card">
          <div className="login-accent-bar" aria-hidden="true" />
          <h1 className="login-card-title">Reset Password</h1>
          <p className="login-card-subtitle">
            Choose a new password for your account.
          </p>

          {errorMsg ? (
            <div className="login-alert error" role="alert">
              {errorMsg}
            </div>
          ) : null}

          <form className="login-form" onSubmit={onSubmit}>
            <div className="login-field">
              <label className="login-label" htmlFor="reset-password">
                New Password
              </label>
              <input
                id="reset-password"
                className="login-input"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="login-field">
              <label className="login-label" htmlFor="reset-confirm-password">
                Confirm New Password
              </label>
              <input
                id="reset-confirm-password"
                className="login-input"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="login-submit"
              disabled={!canSubmit}
            >
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </form>

          <div className="login-footer">
            <RouterLink className="login-forgot" to="/login">
              Back to Log In
            </RouterLink>
          </div>
        </section>
      </div>
    </div>
  );
}