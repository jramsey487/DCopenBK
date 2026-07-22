import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";

import BallcrewLogo from "../BallcrewLogo";
import { handleChange, setSessionFromLogin } from "../Utils";
import "./login.css";

async function submitPassword(
  state,
  setSuccessMsg,
  setErrorMsg,
  setToken,
  navigate,
  setSubmitting
) {
  setSuccessMsg("");
  setErrorMsg("");
  setSubmitting(true);
  try {
    const response = await fetch("/accounts/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: state.username,
        password: state.password,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setErrorMsg("Incorrect username or password.");
      return;
    }
    setSessionFromLogin(setToken, state.username, data);
    setSuccessMsg("Logged in");
    if (window.location.pathname === "/login") {
      navigate("/teams");
    }
  } catch {
    setErrorMsg("Could not reach the server. Is the backend running?");
  } finally {
    setSubmitting(false);
  }
}

export default function LoginPage(props) {
  const [state, setState] = useState({
    username: "",
    password: "",
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const setToken = props.setToken;
  const navigate = useNavigate();

  const canSubmit =
    state.username.trim().length > 0 &&
    state.password.length > 0 &&
    !submitting;

  function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    submitPassword(
      state,
      setSuccessMsg,
      setErrorMsg,
      setToken,
      navigate,
      setSubmitting
    );
  }

  return (
    <div className="page login-shell">
      <div className="login-page">
        <div className="login-brand">
          <BallcrewLogo variant="crest" height={60} />
          <p className="login-brand-title">Mubadala DC Open Ballcrew</p>
        </div>

        <section className="login-card">
          <div className="login-accent-bar" aria-hidden="true" />
          <h1 className="login-card-title">Log In</h1>

          {successMsg ? (
            <div className="login-alert success" role="status">
              {successMsg}
            </div>
          ) : null}
          {errorMsg ? (
            <div className="login-alert error" role="alert">
              {errorMsg}
            </div>
          ) : null}

          <form className="login-form" onSubmit={onSubmit}>
            <div className="login-field">
              <label className="login-label" htmlFor="login-username">
                Username
              </label>
              <input
                id="login-username"
                className="login-input"
                name="username"
                autoComplete="username"
                required
                value={state.username}
                onChange={(e) => handleChange(e, state, setState)}
              />
            </div>
            <div className="login-field">
              <label className="login-label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                className="login-input"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={state.password}
                onChange={(e) => handleChange(e, state, setState)}
              />
            </div>
            <button
              type="submit"
              className="login-submit"
              disabled={!canSubmit}
            >
              {submitting ? "Signing In…" : "Sign In"}
            </button>
          </form>

          <div className="login-footer">
            <RouterLink className="login-forgot" to="/forgot-password">
              Forgot password?
            </RouterLink>
          </div>
        </section>
      </div>
    </div>
  );
}
