import React, { useState, useEffect } from "react";

import Button from "@mui/material/Button";

import { ScheduleTable } from "./ScheduleTable";
import ScheduleMobileView from "./ScheduleMobileView";
import ScheduleDateControls from "./ScheduleDateControls";
import {
  getAuthHeader,
  getToday,
  ConfirmDialog,
  Banners,
} from "../Utils";
import { schedule } from "../HelpMessages";
import { TeamsChairpersonPageHeader } from "../teams/TeamsChairpersonShared";
import { cacheGet, cacheSet } from "../apiCache";
import "./schedule-mobile.css";
import "./schedule-table.css";
import "../teams/teams-page.css";

function scheduleCacheKey(date) {
  return `schedule:${date}`;
}

function CreateSchedule({ date, setUpdated }) {
  const [numCourts, setNumCourts] = useState(5);
  const [numTeams, setNumTeams] = useState(10);
  const [startHour, setStartHour] = useState("11:00");
  const [numHours, setNumHours] = useState(12);
  const [submitting, setSubmitting] = useState(false);

  const courtsError = !(numCourts >= 1 && numCourts <= 5);
  const teamsError = !(numTeams >= 1);
  const hoursError = !(numHours >= 1 && numHours < 24);
  const canSubmit =
    !courtsError && !teamsError && !hoursError && !!startHour && !submitting;

  const toInt = (value) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleCreate = () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    fetch("/api/create-schedule", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        date: date,
        start_hour: startHour,
        num_courts: numCourts,
        num_hours: numHours,
        num_teams: numTeams,
      }),
    })
      .then((response) => response.json())
      .then(() => setUpdated(true))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="create-schedule-card">
      <div className="cs-header">
        <div className="cs-icon">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect
              x="2.5"
              y="4"
              width="15"
              height="13.5"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path d="M2.5 8h15" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M6.5 2.2v3.2M13.5 2.2v3.2"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M10 10.5v4M8 12.5h4"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <div className="cs-title">Create Day's Schedule</div>
          <div className="cs-subtitle">
            No schedule found for {date}. Set one up below.
          </div>
        </div>
      </div>

      <div className="cs-grid">
        <label className="cs-field">
          <span className="cs-label">Start Time of Matches</span>
          <input
            type="time"
            className="cs-input"
            defaultValue={startHour}
            required
            onChange={(e) => setStartHour(e.target.value)}
          />
        </label>

        <label className="cs-field">
          <span className="cs-label">Courts Running</span>
          <input
            type="number"
            className={`cs-input${courtsError ? " error" : ""}`}
            defaultValue={numCourts}
            min={1}
            max={5}
            required
            onChange={(e) => setNumCourts(toInt(e.target.value))}
          />
          {courtsError ? (
            <span className="cs-error">Must have 1–5 initial courts</span>
          ) : null}
        </label>

        <label className="cs-field">
          <span className="cs-label">Ballkid Teams</span>
          <input
            type="number"
            className={`cs-input${teamsError ? " error" : ""}`}
            defaultValue={numTeams}
            min={1}
            required
            onChange={(e) => setNumTeams(toInt(e.target.value))}
          />
          {teamsError ? (
            <span className="cs-error">Must have at least 1 team</span>
          ) : null}
        </label>

        <label className="cs-field">
          <span className="cs-label">Number of Hours</span>
          <input
            type="number"
            className={`cs-input${hoursError ? " error" : ""}`}
            defaultValue={numHours}
            min={1}
            max={23}
            required
            onChange={(e) => setNumHours(toInt(e.target.value))}
          />
          {hoursError ? (
            <span className="cs-error">Must be &gt; 0 and &lt; 24 hours</span>
          ) : null}
        </label>
      </div>

      <button
        type="button"
        className="cs-submit-btn"
        disabled={!canSubmit}
        onClick={handleCreate}
      >
        {submitting ? "Creating…" : "Create Schedule"}
      </button>
    </div>
  );
}

export default function SchedulePageChairperson() {
  const [date, setDate] = useState(getToday());
  const [shifts, setShifts] = useState(() => {
    const cached = cacheGet(scheduleCacheKey(getToday()));
    return cached != null ? cached : null;
  });
  const [updated, setUpdated] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = cacheGet(scheduleCacheKey(date));
    if (cached != null) {
      setShifts(cached);
    } else {
      setShifts(null);
    }

    fetch(`/api/get-schedule?date=${date}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        const next = Array.isArray(data) ? data : [];
        cacheSet(scheduleCacheKey(date), next);
        if (!cancelled) {
          setShifts(next);
          setUpdated(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShifts((prev) => (prev == null ? [] : prev));
          setUpdated(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [date, updated]);

  const loading = shifts == null;
  const shiftList = shifts ?? [];

  const chairpersonActions =
    loading || shiftList.length === 0 ? null : (
      <>
        <Button
          variant="outlined"
          size="small"
          className="teams-chairperson-action-btn teams-chairperson-action-btn--unassign"
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Save Schedule" : "Edit Schedule"}
        </Button>
        <Button
          variant="outlined"
          size="small"
          className="teams-chairperson-action-btn teams-chairperson-action-btn--checkout"
          onClick={() => setOpen(true)}
        >
          Delete Schedule
        </Button>
      </>
    );

  const deleteDialog = (
    <ConfirmDialog
      message={`You are about to delete the schedule for ${date}. This action cannot be
        undone.`}
      url={`/api/delete-schedule?date=${date}`}
      body={{
        date: date,
      }}
      open={open}
      setOpen={setOpen}
      setUpdated={setUpdated}
      method="DELETE"
    />
  );

  if (!editing) {
    return (
      <>
        <Banners />
        {deleteDialog}
        <ScheduleMobileView
          shifts={shiftList}
          date={date}
          setDate={setDate}
          chairpersonActions={chairpersonActions}
          emptyContent={<CreateSchedule date={date} setUpdated={setUpdated} />}
          isChairperson={true}
          setUpdated={setUpdated}
          loading={loading}
        />
      </>
    );
  }

  return (
    <>
      <Banners />
      {deleteDialog}
      <div className="schedule-page-shell teams-page-shell">
        <div className="page schedule-page ballkid-list-page teams-chairperson-page schedule-page--editing">
          <TeamsChairpersonPageHeader
            title="Schedule"
            helpPage="Schedule"
            helpMessage={schedule}
            titleExtra={
              <span
                className="today-badge schedule-editing-badge"
                aria-live="polite"
              >
                Editing
              </span>
            }
            actions={
              loading || shiftList.length === 0 ? null : (
                <div className="teams-chairperson-actions">
                  <Button
                    variant="outlined"
                    size="small"
                    className="teams-chairperson-action-btn teams-chairperson-action-btn--unassign"
                    onClick={() => setEditing(false)}
                  >
                    Save Schedule
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    className="teams-chairperson-action-btn teams-chairperson-action-btn--checkout"
                    onClick={() => setOpen(true)}
                  >
                    Delete Schedule
                  </Button>
                </div>
              )
            }
            toolbar={
              <div className="schedule-header-controls">
                <ScheduleDateControls date={date} setDate={setDate} />
              </div>
            }
          />

          <div className="schedule-body schedule-edit-body">
            <p className="schedule-edit-hint">
              Edit team numbers in each cell. Rename a court in the header, or
              delete it with the trash button. Use Add court next to the court
              names.
            </p>

            {loading ? (
              <div className="empty-message">Loading schedule…</div>
            ) : shiftList.length === 0 ? (
              <CreateSchedule date={date} setUpdated={setUpdated} />
            ) : (
              <div className="schedule-edit-table-wrap">
                <ScheduleTable
                  shifts={shiftList}
                  date={date}
                  setUpdated={setUpdated}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}