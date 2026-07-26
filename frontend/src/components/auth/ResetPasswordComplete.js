import React from "react";
import { Link as RouterLink } from "react-router-dom";

import BallcrewLogo from "../BallcrewLogo";
import "./login.css";

export default function ForgotPasswordComplete(props) {
  return (
    <div className="page login-shell">
      <div className="login-page">
        <div className="login-brand">
          <BallcrewLogo variant="crest" size={56} />
          <p className="login-brand-title">Mubadala DC Open Ballcrew</p>
        </div>

        <section className="login-card">
          <div className="login-accent-bar" aria-hidden="true" />
          <h1 className="login-card-title">Password Reset Complete</h1>
          <p className="login-card-subtitle">
            Your password has been reset. You can log in now with your new
            password.
          </p>

          <div className="login-footer">
            <RouterLink className="login-forgot" to="/login">
              Log In
            </RouterLink>
          </div>
        </section>
      </div>
    </div>
  );
}