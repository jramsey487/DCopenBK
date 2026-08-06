import React, { useEffect, useState } from "react";

import {
  getAuthHeader,
  isCurrentScheduleSlot,
  isHalfHourSlot,
  dayHourToStr,
  ConfirmDialog,
} from "../Utils";
import "./schedule-table.css";

function TeamCell({ teamStr, hour, court, setUpdated }) {
  const [team, setTeam] = useState(teamStr ?? "");

  useEffect(() => {
    setTeam(teamStr ?? "");
  }, [teamStr, hour, court]);

  return (
    <input
      className="sched-edit-team-input"
      type="text"
      inputMode="numeric"
      aria-label={`Team for ${court || "court"} at this time`}
      value={team}
      onChange={(e) => {
        const next = e.target.value.replace(/[^\d]/g, "");
        setTeam(next);
        fetch("/api/update-schedule", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            hour,
            court,
            team: next,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    />
  );
}

function CourtHeader({ court, date, setUpdated, canDelete }) {
  const [name, setName] = useState(court);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setName(court);
  }, [court]);

  const commitName = (newName) => {
    const trimmed = newName.trim();
    if (trimmed === court) {
      return;
    }
    fetch("/api/update-court-name", {
      method: "PATCH",
      headers: getAuthHeader(),
      body: JSON.stringify({
        date,
        oldName: court,
        newName: trimmed,
      }),
    })
      .then((response) => response.json())
      .then(() => setUpdated(true));
  };

  return (
    <div className="sched-edit-court-head">
      <ConfirmDialog
        message={`You are about to delete court “${
          court || "Untitled"
        }” and remove all of its shifts for this day.`}
        url="/api/update-court-name"
        body={{ date, oldName: court, newName: "" }}
        open={deleteOpen}
        setOpen={setDeleteOpen}
        setUpdated={setUpdated}
      />
      <input
        className="sched-edit-court-input"
        type="text"
        aria-label="Court name"
        value={name}
        placeholder="Court"
        onChange={(e) => setName(e.target.value)}
        onBlur={() => commitName(name)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.target.blur();
          }
        }}
      />
      {canDelete ? (
        <button
          type="button"
          className="sched-edit-court-delete"
          aria-label={`Delete ${court || "court"}`}
          title="Delete court"
          onClick={() => setDeleteOpen(true)}
        >
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 3.5h8M5.5 3.5V2.5h3v1M5 6v4.5M7 6v4.5M9 6v4.5M4 3.5l.5 8h5l.5-8"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

function EditToolbar({ date, courts, setUpdated }) {
  const addHour = () => {
    fetch("/api/add-hour", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        date,
        num_courts: courts.length,
      }),
    })
      .then((response) => response.json())
      .then(() => setUpdated(true));
  };

  const deleteHour = () => {
    fetch("/api/delete-hour", {
      method: "DELETE",
      headers: getAuthHeader(),
      body: JSON.stringify({ date }),
    })
      .then((response) => response.json())
      .then(() => setUpdated(true));
  };

  return (
    <div className="sched-edit-toolbar">
      <button type="button" className="sched-edit-tool-btn" onClick={addHour}>
        <span className="sched-edit-tool-icon" aria-hidden>
          +
        </span>
        Add hour
      </button>
      <button
        type="button"
        className="sched-edit-tool-btn sched-edit-tool-btn--danger"
        onClick={deleteHour}
      >
        <span className="sched-edit-tool-icon" aria-hidden>
          −
        </span>
        Remove last hour
      </button>
    </div>
  );
}

function AddCourtButton({ date, setUpdated }) {
  return (
    <button
      type="button"
      className="sched-edit-add-court"
      onClick={() => {
        fetch("/api/add-court", {
          method: "POST",
          headers: getAuthHeader(),
          body: JSON.stringify({ date }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      <span className="sched-edit-tool-icon" aria-hidden>
        +
      </span>
      Add court
    </button>
  );
}

export function ScheduleTable({ shifts, date, setUpdated }) {
  const hourCourtToTeam = Object.assign(
    {},
    ...shifts.map((shift) => ({
      [shift.start + "-" + shift.court]: shift.team,
    }))
  );
  const hours = shifts
    .map((shift) => shift.start)
    .filter((v, i, a) => a.indexOf(v) === i);
  const courts = shifts
    .map((shift) => shift.court)
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="sched-edit-board">
      <div className="sched-edit-board-scroll">
        <div
          className="sched-edit-grid"
          style={{
            gridTemplateColumns: `108px repeat(${Math.max(
              courts.length,
              1
            )}, minmax(88px, 1fr)) 140px`,
          }}
        >
          <div className="sched-edit-corner">Time</div>
          {courts.map((court, index) => (
            <div
              key={`head-${court || "new"}-${index}`}
              className="sched-edit-head-cell"
            >
              <CourtHeader
                court={court}
                date={date}
                setUpdated={setUpdated}
                canDelete={courts.length > 1}
              />
            </div>
          ))}
          <div className="sched-edit-head-cell sched-edit-head-cell--add">
            <AddCourtButton date={date} setUpdated={setUpdated} />
          </div>

          {hours.map((hour) => {
            const isHalf = isHalfHourSlot(hour);
            const isCurrent = isCurrentScheduleSlot(hour);
            const rowClass = [
              "sched-edit-row",
              isHalf ? "is-half" : "",
              isCurrent ? "is-current" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <React.Fragment key={hour}>
                <div className={`sched-edit-time ${rowClass}`}>
                  {dayHourToStr(hour, isHalf)}
                </div>
                {courts.map((court, index) => {
                  const teamVal = hourCourtToTeam[hour + "-" + court];
                  const teamStr = teamVal > 0 ? String(teamVal) : "";
                  return (
                    <div
                      key={`${hour}-${court}-${index}`}
                      className={`sched-edit-cell ${rowClass}`}
                    >
                      <TeamCell
                        teamStr={teamStr}
                        hour={hour}
                        court={court}
                        setUpdated={setUpdated}
                      />
                    </div>
                  );
                })}
                <div
                  className={`sched-edit-cell sched-edit-cell--spacer ${rowClass}`}
                  aria-hidden
                />
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <EditToolbar date={date} courts={courts} setUpdated={setUpdated} />
    </div>
  );
}
