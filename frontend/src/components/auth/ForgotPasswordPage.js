import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";

import BallcrewLogo from "../BallcrewLogo";
import "./login.css";

async function handleSubmit(email, navigate, setErrorMsg, setLoading) {
  setErrorMsg("");
  setLoading(true);
  try {
    const response = await fetch("/accounts/users/reset_password/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (response.ok) {
      navigate("/reset-email-sent");
      return;
    }
    setErrorMsg(
      "No account found for that email. Try another address or contact a chairperson."
    );
  } catch {
    setErrorMsg("Could not reach the server. Is the backend running?");
  } finally {
    setLoading(false);
  }
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const canSubmit = email.trim().length > 0 && !loading;

  function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    handleSubmit(email.trim().toLowerCase(), navigate, setErrorMsg, setLoading);
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
          <h1 className="login-card-title">Forgot Password</h1>
          <p className="login-card-subtitle">
            Enter your account email to send reset
            instructions.
          </p>

          {errorMsg ? (
            <div className="login-alert error" role="alert">
              {errorMsg}
            </div>
          ) : null}

          <form className="login-form" onSubmit={onSubmit}>
            <div className="login-field">
              <label className="login-label" htmlFor="forgot-email">
                Email
              </label>
              <input
                id="forgot-email"
                className="login-input"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="login-submit"
              disabled={!canSubmit}
            >
              {loading ? "Sending…" : "Send reset link"}
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
