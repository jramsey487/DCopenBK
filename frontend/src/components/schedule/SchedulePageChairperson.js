import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { ScheduleTable } from "./ScheduleTable";
import ScheduleMobileView from "./ScheduleMobileView";
import {
  getAuthHeader,
  getToday,
  ConfirmDialog,
  HelpIcon,
  Banners,
} from "../Utils";
import { schedule } from "../HelpMessages";

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

export default function SchedulePageChairperson(props) {
  const [shifts, setShifts] = useState([]);
  const [updated, setUpdated] = useState(false);
  const [date, setDate] = useState(getToday());

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch(`/api/get-schedule?date=${date}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setShifts(data))
      .then(() => setUpdated(false));
  }, [date, updated]);

  const chairpersonActions =
    shifts.length === 0 ? null : (
      <>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Save Schedule" : "Edit Schedule"}
        </Button>
        <Button
          variant="contained"
          color="error"
          size="small"
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
          shifts={shifts}
          date={date}
          setDate={setDate}
          chairpersonActions={chairpersonActions}
          emptyContent={<CreateSchedule date={date} setUpdated={setUpdated} />}
        />
      </>
    );
  }

  return (
    <div className="page">
      <Banners />
      {deleteDialog}

      <div className="sxs" sx={{ mb: 2 }}>
        <Typography variant="h4">Schedule</Typography>
        &thinsp;
        <HelpIcon page="Schedule" message={schedule} />
      </div>

      <Box className="justify" sx={{ mb: 2 }}>
        <Box className="sxs">
          <Typography variant="body1">
            Showing schedule for: &thinsp;
          </Typography>
          <LocalizationProvider dateAdapter={AdapterLuxon}>
            <DatePicker
              renderInput={(props) => (
                <TextField sx={{ mx: 2 }} variant="standard" {...props} />
              )}
              label="Date"
              value={date}
              mask={"__/__/____"}
              onChange={(newValue) => {
                setDate(newValue.toLocaleString());
              }}
            />
          </LocalizationProvider>
        </Box>
        {shifts.length === 0 ? (
          ""
        ) : (
          <div className="sxs" style={{ float: "right" }}>
            <Button
              variant="outlined"
              sx={{ m: 1 }}
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Save Schedule" : "Edit Schedule"}
            </Button>

            <Button
              variant="contained"
              color="error"
              onClick={() => setOpen(true)}
            >
              Delete Schedule
            </Button>
          </div>
        )}
      </Box>

      {shifts.length === 0 ? (
        <CreateSchedule date={date} setUpdated={setUpdated} />
      ) : (
        <ScheduleTable
          shifts={shifts}
          date={date}
          readOnly={false}
          editing={editing}
          setUpdated={setUpdated}
        />
      )}
    </div>
  );
}
