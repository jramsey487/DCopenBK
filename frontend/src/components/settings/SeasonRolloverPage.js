import React, { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

import { Banners, ConfirmDialog, getAuthHeader } from "../Utils";
import "./season-rollover.css";

const STATE_LABEL = { done: "Done", ready: "Ready", locked: "Locked" };

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function formatWhen(iso) {
  if (!iso) {
    return "";
  }
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StepCard({ number, title, state, children }) {
  return (
    <section className={`rollover-step rollover-step--${state}`}>
      <div className="rollover-step__head">
        <span className="rollover-step__num">
          {state === "done" ? "✓" : number}
        </span>
        <h2 className="rollover-step__title">{title}</h2>
        <span className={`rollover-chip rollover-chip--${state}`}>
          {STATE_LABEL[state]}
        </span>
      </div>
      <div className="rollover-step__body">{children}</div>
    </section>
  );
}

export default function SeasonRolloverPage() {
  const [status, setStatus] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);

  const [exporting, setExporting] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  const refresh = useCallback(() => {
    return fetch("/api/season-rollover", { headers: getAuthHeader() })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setStatus(data);
        setLoadError("");
      })
      .catch(() => setLoadError("Could not load the season status."));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const exportData = () => {
    setExporting(true);
    setNotice(null);
    fetch("/api/download", { method: "GET", headers: getAuthHeader() })
      .then((response) => {
        if (!response.ok) {
          throw new Error();
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "dcopenbk-data.zip");
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
        setNotice({ severity: "success", text: "Data exported." });
        return refresh();
      })
      .catch(() =>
        setNotice({ severity: "error", text: "Could not export the data." })
      )
      .finally(() => setExporting(false));
  };

  const createTournament = () => {
    setNotice(null);
    if (!startDate || !endDate) {
      setNotice({ severity: "error", text: "Start and end dates are required." });
      return;
    }
    if (startDate >= endDate) {
      setNotice({
        severity: "error",
        text: "Tournament start date must be before the end date.",
      });
      return;
    }
    setCreating(true);
    fetch("/api/get-tournament", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({ year: status.year, start: startDate, end: endDate }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.detail || "Could not create the tournament.");
        }
        setNotice({ severity: "success", text: "Tournament created." });
        return refresh();
      })
      .catch((err) =>
        setNotice({ severity: "error", text: err.message })
      )
      .finally(() => setCreating(false));
  };

  const openApplications = () => {
    setOpening(true);
    setNotice(null);
    fetch("/api/application-settings", {
      method: "PATCH",
      headers: getAuthHeader(),
      body: JSON.stringify({ is_open: true }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error();
        }
        setNotice({ severity: "success", text: "Applications are now open." });
        return refresh();
      })
      .catch(() =>
        setNotice({ severity: "error", text: "Could not open applications." })
      )
      .finally(() => setOpening(false));
  };

  if (loadError) {
    return (
      <div className="page rollover-shell">
        <Banners />
        <div className="rollover-page">
          <div className="rollover-alert rollover-alert--error">{loadError}</div>
          <Button variant="outlined" onClick={refresh}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (status === null) {
    return (
      <div className="page rollover-shell">
        <div className="rollover-page rollover-loading">
          <CircularProgress size={28} />
        </div>
      </div>
    );
  }

  const exportDone = status.export.done;
  const tournamentDone =
    status.tournament.exists && status.tournament.has_dates;
  const tryoutDone = Boolean(status.tryouts?.done);
  const archiveDone = status.archive.done;
  const appsDone =
    status.applications.is_open && tournamentDone && tryoutDone;

  const states = {
    export: exportDone ? "done" : "ready",
    tournament: tournamentDone ? "done" : "ready",
    archive: archiveDone
      ? "done"
      : exportDone && tournamentDone && tryoutDone
      ? "ready"
      : "locked",
    tryouts: tryoutDone ? "done" : tournamentDone ? "ready" : "locked",
    applications: appsDone
      ? "done"
      : archiveDone && tournamentDone && tryoutDone
      ? "ready"
      : "locked",
  };

  const allDone =
    exportDone && tournamentDone && tryoutDone && archiveDone && appsDone;
  return (
    <div className="page rollover-shell">
      <Banners />

      <div className="rollover-page">
        <header className="rollover-header">
          <h1 className="rollover-title">Start a new season</h1>
          <p className="rollover-subtitle">
            Work through these steps in order. Each one checks the real state of
            the data, so you can leave and come back. This archives{" "}
            <strong>{status.season_year}</strong> and prepares the configured
            upcoming tournament in <strong>{status.target_year}</strong>. You can
            set up next season before January.
          </p>
        </header>

        {notice ? (
          <div className={`rollover-alert rollover-alert--${notice.severity}`}>
            {notice.text}
          </div>
        ) : null}

        <StepCard number={1} title="Back up the data" state={states.export}>
          <p className="rollover-text">
            Downloads every table as a zip of CSV files. Archiving is the point
            of no return for this season's roster, so a recent backup (within{" "}
            {status.export.fresh_days} days) is required first.
          </p>
          {status.export.last_at ? (
            <p className="rollover-meta">
              Last export: {formatWhen(status.export.last_at)}
            </p>
          ) : null}
          <LoadingButton
            variant={exportDone ? "outlined" : "contained"}
            size="small"
            loading={exporting}
            onClick={exportData}
          >
            {exportDone ? "Export again" : "Export all data"}
          </LoadingButton>
        </StepCard>

        <StepCard
          number={2}
          title={`Create the ${status.year} tournament`}
          state={states.tournament}
        >
          {tournamentDone ? (
            <>
              <p className="rollover-text">
                Tournament {status.year}: {status.tournament.start_date} to{" "}
                {status.tournament.end_date}.
              </p>
              <Button
                component={RouterLink}
                to="/tournament-settings"
                size="small"
                variant="outlined"
              >
                Edit in Tournament Settings
              </Button>
            </>
          ) : status.tournament.exists ? (
            <p className="rollover-text">
              A {status.year} tournament exists but is missing its dates. Set
              them in{" "}
              <RouterLink to="/tournament-settings">Tournament Settings</RouterLink>
              .
            </p>
          ) : (
            <>
              <p className="rollover-text">
                Set the upcoming tournament dates before archiving, so the rollover is
                anchored to the season you are preparing.
              </p>
              <div className="rollover-fields">
                <label className="rollover-field">
                  <span className="rollover-field__label">Start date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </label>
                <label className="rollover-field">
                  <span className="rollover-field__label">End date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </label>
              </div>
              <LoadingButton
                variant="contained"
                size="small"
                loading={creating}
                onClick={createTournament}
              >
                Create tournament
              </LoadingButton>
            </>
          )}
        </StepCard>

        <StepCard number={3} title="Set tryout dates and locations" state={states.tryouts}>
          {tryoutDone ? (
            <p className="rollover-text">
              {status.tryouts.complete_slots} tryout session
              {status.tryouts.complete_slots === 1 ? "" : "s"} configured.
              {status.tryouts.dates.map((date, index) =>
                date && status.tryouts.locations[index]
                  ? ` ${date} — ${status.tryouts.locations[index]}.`
                  : ""
              ).join("")}
            </p>
          ) : (
            <>
              <p className="rollover-text">
                Configure at least one tryout date and its location. Any session
                with a date or location must have both before applications can open.
              </p>
              {states.tryouts === "locked" ? (
                <p className="rollover-meta">Set the tournament dates first.</p>
              ) : null}
            </>
          )}
          <Button
            component={RouterLink}
            to="/tournament-settings"
            size="small"
            variant={tryoutDone ? "outlined" : "contained"}
          >
            {tryoutDone ? "Edit tryout settings" : "Set tryout dates and locations"}
          </Button>
        </StepCard>

        <StepCard number={4} title="Archive last season's ballcrew" state={states.archive}>
          {archiveDone ? (
            <p className="rollover-text">No active ballkids. Nothing to archive.</p>
          ) : (
            <>
              <p className="rollover-text">
                Archives all <strong>{plural(status.archive.active_count, "active ballkid")}</strong>.
                Ticket counts, last-day settings and comments are cleared. Past
                years' histories and ratings stay.
              </p>
              {states.archive === "locked" ? (
                <p className="rollover-meta">
                  Finish steps 1, 2, and 3 first.
                </p>
              ) : null}
              <Button
                variant="contained"
                color="error"
                size="small"
                disabled={states.archive === "locked"}
                onClick={() => setArchiveOpen(true)}
              >
                Archive all ballkids
              </Button>
            </>
          )}
          <ConfirmDialog
            message={`You are about to archive all ${plural(
              status.archive.active_count,
              "active ballkid"
            )}.`}
            url="/api/archive-all"
            body={{}}
            method="PATCH"
            open={archiveOpen}
            setOpen={setArchiveOpen}
            setUpdated={refresh}
          />
        </StepCard>

        <StepCard number={5} title="Open applications" state={states.applications}>
          <Button
            component={RouterLink}
            to="/application-launch"
            size="small"
            variant="outlined"
            sx={{ mb: 1 }}
          >
            Application Launch &amp; Invitations
          </Button>
          {appsDone ? (
            <p className="rollover-text">
              Applications are open.{" "}
              {status.applications.pending_review > 0
                ? `${plural(status.applications.pending_review, "application")} waiting for review.`
                : "No applications waiting for review yet."}
            </p>
          ) : (
            <>
              <p className="rollover-text">
                Opens the public application form.
                {status.applications.interest_waiting > 0
                  ? ` ${plural(
                      status.applications.interest_waiting,
                      "person"
                    )} on the interest list haven't been emailed the link yet; send it from Review Applications afterwards.`
                  : ""}
              </p>
              {states.applications === "locked" ? (
                <p className="rollover-meta">
                  Finish the tournament dates, tryout settings, and archive steps first.
                </p>
              ) : null}
              <LoadingButton
                variant="contained"
                size="small"
                loading={opening}
                disabled={states.applications === "locked"}
                onClick={openApplications}
              >
                Open applications
              </LoadingButton>
            </>
          )}
        </StepCard>

        {allDone ? (
          <section className="rollover-finish">
            <h2 className="rollover-finish__title">You're set for {status.year}</h2>
            <p className="rollover-text">
              Everything above is recorded in the audit log.
            </p>
            <div className="rollover-links">
              <Button component={RouterLink} to="/applications" size="small" variant="outlined">
                Review applications
              </Button>
              <Button component={RouterLink} to="/action-log" size="small" variant="outlined">
                View audit log
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
