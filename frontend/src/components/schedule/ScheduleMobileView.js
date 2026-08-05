import React, { useState, useEffect, useMemo } from "react";

import {
  getAuthHeader,
  getLocalStorage,
  getToday,
  dayHourToStr,
  isCurrentScheduleSlot,
  isHalfHourSlot,
  ConfirmDialog,
} from "../Utils";
import { ICON_DICT } from "../Consts";
import ScheduleCalendar from "./ScheduleCalendar";
import { TeamsChairpersonPageHeader } from "../teams/TeamsChairpersonShared";
import { schedule, scheduleNonchairperson } from "../HelpMessages";
import "./schedule-mobile.css";
import "../teams/teams-page.css";

function parseSlashDate(dateStr) {
  const [mm, dd, yyyy] = dateStr.split("/");
  return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
}

function formatShortDate(dateStr) {
  const d = parseSlashDate(dateStr);
  const dy = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mo = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${dy[d.getDay()]} ${mo[d.getMonth()]} ${d.getDate()}`;
}

function shiftSlashDate(dateStr, days) {
  const d = parseSlashDate(dateStr);
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function formatTimeLabel(hour) {
  const label = dayHourToStr(hour, isHalfHourSlot(hour));
  if (!label) {
    return "";
  }
  const suffix = label.slice(-2);
  const num = label.slice(0, -2);
  return `${num} ${suffix}`;
}

function buildTeamRoster(ballkids) {
  const roster = {};
  ballkids.forEach((ballkid) => {
    const team = ballkid.current_team;
    if (!team) {
      return;
    }
    if (!roster[team]) {
      roster[team] = [];
    }
    roster[team].push({
      name: `${ballkid.first_name} ${ballkid.last_name}`,
      pos: ballkid.position === "Net" ? "Net" : "Back",
      isCaptain: ballkid.is_captain,
    });
  });
  Object.values(roster).forEach((members) => {
    members.sort((a, b) => a.name.localeCompare(b.name));
  });
  return roster;
}

function memberInitials(fullName) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function TeamSheetMember({ member }) {
  return (
    <li className="sheet-member">
      <span className="sheet-member-avatar" aria-hidden="true">
        {memberInitials(member.name)}
      </span>
      <span className="sheet-member-name">{member.name}</span>
      {member.isCaptain ? (
        <span className="sheet-member-captain" title="Captain" aria-label="Captain">
          {ICON_DICT.captain}
        </span>
      ) : null}
    </li>
  );
}

function TeamSheetSection({ label, members }) {
  if (!members?.length) {
    return null;
  }
  return (
    <section className="sheet-section">
      <h3 className="sheet-section-label">
        {label}
        <span className="sheet-section-count">{members.length}</span>
      </h3>
      <ul className="sheet-member-list">
        {members.map((member) => (
          <TeamSheetMember key={member.name} member={member} />
        ))}
      </ul>
    </section>
  );
}

function TeamSheet({ team, members, open, onClose }) {
  const roster = members || [];
  const nets = roster.filter((m) => m.pos === "Net");
  const backs = roster.filter((m) => m.pos !== "Net");

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`schedule-sheet-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        role="presentation"
      />
      <div
        className={`schedule-sheet${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-team-sheet-title"
      >
        <div className="pop-handle" aria-hidden="true" />
        <header className="sheet-header">
          <div className="sheet-header-text">
            <h2 id="schedule-team-sheet-title" className="sheet-title">
              Team {team}
            </h2>
            <p className="sheet-subtitle">
              {roster.length === 0
                ? "No one checked in on this team"
                : `${roster.length} checked in today`}
            </p>
          </div>
          <button
            type="button"
            className="sheet-close"
            onClick={onClose}
            aria-label="Close team roster"
          >
            ×
          </button>
        </header>
        <div className="sheet-body">
          {roster.length === 0 ? (
            <p className="sheet-empty">
              Assignments update when ballkids check in and teams are set.
            </p>
          ) : (
            <>
              <TeamSheetSection label="Nets" members={nets} />
              <TeamSheetSection label="Backs" members={backs} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

function EndCourtButton({ court, setUpdated }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ConfirmDialog
        message={`You are about to end ${court} and unassign all teams from this court for future shifts.`}
        url="/api/end-court"
        body={{ court: court }}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
      />
      <span className="mobile-tooltip-wrap" data-tooltip="End Court">
        <button
          type="button"
          className="mobile-end-court-btn"
          aria-label={`End ${court}`}
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle
              cx="7"
              cy="7"
              r="6"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M4.5 4.5l5 5M9.5 4.5l-5 5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </span>
    </>
  );
}

function ShiftHourButtons({ hour, setUpdated }) {
  const shift = (direction) => {
    fetch("/api/shift-schedule", {
      method: "PATCH",
      headers: getAuthHeader(),
      body: JSON.stringify({ direction, hour }),
    })
      .then((response) => response.json())
      .then(() => setUpdated(true));
  };

  return (
    <div className="mobile-shift-btns">
      <button
        type="button"
        className="mobile-shift-btn"
        aria-label="Shift schedule up by 30 minutes"
        onClick={() => shift("up")}
      >
        <svg viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M1 6l4-4 4 4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        className="mobile-shift-btn"
        aria-label="Shift schedule down by 30 minutes"
        onClick={() => shift("down")}
      >
        <svg viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M1 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

export default function ScheduleMobileView({
  shifts,
  date,
  setDate,
  chairpersonActions,
  emptyContent,
  isChairperson = false,
  setUpdated,
}) {
  const [myShiftsOn, setMyShiftsOn] = useState(false);
  const [teamRoster, setTeamRoster] = useState({});
  const [myName, setMyName] = useState("");
  const [sheetTeam, setSheetTeam] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isToday = date === getToday();

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) =>
        setTeamRoster(
          buildTeamRoster(
            data.filter(
              (ballkid) =>
                ballkid.is_checked_in === true && ballkid.current_team > 0
            )
          )
        )
      );

    const pk = getLocalStorage("ballkid_id");
    if (!pk) {
      return;
    }
    fetch(`/api/get-ballkid/${pk}/${pk}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((ballkid) =>
        setMyName(`${ballkid.first_name} ${ballkid.last_name}`)
      );
  }, []);

  const { hours, courts, hourCourtToTeam } = useMemo(() => {
    const teamMap = Object.assign(
      {},
      ...shifts.map((shift) => ({
        [shift.start + "-" + shift.court]: shift.team,
      }))
    );
    const hourList = shifts
      .map((shift) => shift.start)
      .filter((v, i, a) => a.indexOf(v) === i);
    const courtList = shifts
      .map((shift) => shift.court)
      .filter((v, i, a) => a.indexOf(v) === i);
    return {
      hours: hourList,
      courts: courtList,
      hourCourtToTeam: teamMap,
    };
  }, [shifts]);

  const isMyTeam = (teamNum) => {
    if (!myName || !teamRoster[teamNum]) {
      return false;
    }
    return teamRoster[teamNum].some((m) => m.name === myName);
  };

  const chipClass = (teamNum) => {
    const classes = ["chip", `t${teamNum}`];
    if (!myShiftsOn) {
      return classes.join(" ");
    }
    if (isMyTeam(teamNum)) {
      classes.push("mine");
    } else {
      classes.push("dimmed");
    }
    return classes.join(" ");
  };

  const closeSheet = () => setSheetTeam(null);
  const showScrollHint = courts.length > 4;

  const scheduleToolbar = (
    <div className="schedule-header-controls">
      <div className="date-picker-wrap">
        <div className="date-group">
          <button
            type="button"
            className="date-arrow"
            aria-label="Previous day"
            onClick={() => setDate(shiftSlashDate(date, -1))}
          >
            ‹
          </button>
          <button
            type="button"
            className="date-center"
            onClick={() => setCalendarOpen(true)}
          >
            {formatShortDate(date)}
          </button>
          <button
            type="button"
            className="date-arrow"
            aria-label="Next day"
            onClick={() => setDate(shiftSlashDate(date, 1))}
          >
            ›
          </button>
        </div>
        <button
          type="button"
          className={`cal-toggle-btn${calendarOpen ? " on" : ""}`}
          aria-label="Open calendar"
          onClick={() => setCalendarOpen(true)}
        >
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect
              x="1.5"
              y="2.5"
              width="11"
              height="10"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <path
              d="M1.5 5.5h11"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <path
              d="M4 1.2v2.6M10 1.2v2.6"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {calendarOpen ? (
          <ScheduleCalendar
            date={date}
            today={getToday()}
            onSelect={setDate}
            onClose={() => setCalendarOpen(false)}
          />
        ) : null}
      </div>
      <button
        type="button"
        className={`my-shifts-btn${myShiftsOn ? " on" : ""}`}
        onClick={() => setMyShiftsOn(!myShiftsOn)}
      >
        <svg viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <circle
            cx="6.5"
            cy="4"
            r="2.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M1 12c0-3.038 2.462-5.5 5.5-5.5S12 8.962 12 12"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        My shifts
      </button>
    </div>
  );

  return (
    <div className="schedule-page-shell teams-page-shell">
      <div className="page schedule-page ballkid-list-page teams-chairperson-page">
        <TeamsChairpersonPageHeader
          title="Schedule"
          helpPage="Schedule"
          helpMessage={isChairperson ? schedule : scheduleNonchairperson}
          titleExtra={
            isToday ? <span className="today-badge">Today</span> : null
          }
          actions={
            chairpersonActions ? (
              <div className="teams-chairperson-actions">{chairpersonActions}</div>
            ) : null
          }
          toolbar={scheduleToolbar}
        />

        {shifts.length === 0 ? (
          emptyContent ? (
            <div className="schedule-empty">{emptyContent}</div>
          ) : (
            <div className="empty-message">No schedule found.</div>
          )
        ) : (
          <div className="schedule-body">
            {showScrollHint ? (
              <div className="scroll-hint">
                <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M2 6h8M7 3l3 3-3 3"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Scroll to see all courts
              </div>
            ) : null}

            <div
              className="grid-outer"
              style={{ "--court-count": courts.length }}
            >
              <div className="grid-wrap">
                <table className="grid-table">
                  <colgroup>
                    <col className="col-time" />
                    {courts.map((court) => (
                      <col key={court} className="col-court" />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Time</th>
                      {courts.map((court) => (
                      <th key={court} className="cth">
                        <span className="cth-inner">
                          <span className="court-head-label">{court}</span>
                          {isChairperson ? (
                            <EndCourtButton court={court} setUpdated={setUpdated} />
                          ) : null}
                        </span>
                      </th>
                    ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((hour) => {
                      const isNow = isCurrentScheduleSlot(hour);
                      const isHalf = isHalfHourSlot(hour);
                      const rowClass = [
                        isNow ? "now-row" : "",
                        isHalf ? "schedule-row--half" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <tr key={hour} className={rowClass || undefined}>
                          <td className={`time-cell${isNow ? " now" : ""}`}>
                            {isNow ? (
                              <span className="now-label">
                                <span className="now-pip" />
                                {formatTimeLabel(hour)}
                              </span>
                            ) : (
                              formatTimeLabel(hour)
                            )}
                            {isChairperson ? (
                              <ShiftHourButtons
                                hour={hour}
                                setUpdated={setUpdated}
                              />
                            ) : null}
                          </td>
                          {courts.map((court) => {
                            const team =
                              hourCourtToTeam[hour + "-" + court] > 0
                                ? hourCourtToTeam[hour + "-" + court]
                                : null;
                            return (
                              <td key={court} className="team-cell">
                                {team ? (
                                  <div className="chip-wrap">
                                    <button
                                      type="button"
                                      className={chipClass(team)}
                                      onClick={() => setSheetTeam(team)}
                                    >
                                      {team}
                                    </button>
                                  </div>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <TeamSheet
          team={sheetTeam}
          members={sheetTeam ? teamRoster[sheetTeam] : []}
          open={sheetTeam !== null}
          onClose={closeSheet}
        />
      </div>
    </div>
  );
}