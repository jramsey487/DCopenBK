import React, { useEffect, useState } from "react";

import { Banners } from "../Utils";
import "./settings-pages.css";

export default function FeedbackPage() {
  const [contactEmail, setContactEmail] = useState("");

  useEffect(() => {
    fetch("/api/application-settings")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => setContactEmail(data.contact_email || ""))
      .catch(() => setContactEmail(""));
  }, []);

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
            {contactEmail ? (
              <a
                className="settings-link-card"
                href={`mailto:${contactEmail}`}
              >
                <span className="settings-link-card-title">Email the ballcrew</span>
                <span className="settings-link-card-desc">{contactEmail}</span>
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
