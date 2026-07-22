import React from "react";

import { Banners } from "../Utils";
import "./settings-pages.css";

export default function FeedbackPage() {
  return (
    <div className="page settings-shell">
      <Banners />

      <div className="settings-page">
        <header className="settings-header">
          <h1 className="settings-title">Feedback</h1>
          <p className="settings-subtitle">
            Share thoughts on the tournament, captains, or this site—we read
            everything.
          </p>
        </header>

        <section className="settings-card">
          <p className="settings-body-text">
            Feedback can be anonymous or sent by email. Choose whichever you
            prefer.
          </p>

          <div className="settings-link-stack">
            <a
              className="settings-link-card"
              href="https://forms.gle/J9BH4jC94RxWzMm79"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="settings-link-card-title">
                Submit anonymous feedback
              </span>
              <span className="settings-link-card-desc">
                Opens our Google Form in a new tab
              </span>
            </a>
            <a
              className="settings-link-card"
              href="mailto:mubadalacitiopenballcrew@gmail.com"
            >
              <span className="settings-link-card-title">Email the ballcrew</span>
              <span className="settings-link-card-desc">
                mubadalacitiopenballcrew@gmail.com
              </span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
