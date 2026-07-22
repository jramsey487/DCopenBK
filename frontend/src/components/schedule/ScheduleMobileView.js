import React, { useState, useEffect, useMemo } from "react";

import {
  getAuthHeader,
  getLocalStorage,
  getToday,
  dayHourToStr,
  isCurrentHour,
} from "../Utils";
import ScheduleCalendar from "./ScheduleCalendar";
import "./schedule-mobile.css";

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
  const label = dayHourToStr(hour);
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

function TeamSheet({ team, members, open, onClose }) {
  return (
    <>
      <div
        className={`schedule-sheet-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        role="presentation"
      />
      <div className={`schedule-sheet${open ? " open" : ""}`}>
        <div className="pop-handle" aria-hidden="true" />
        <div className="sheet-title">Team {team}</div>
        {(members || []).map((member) => (
          <div className="pop-member" key={member.name}>
            <span className="pop-name">{member.name}</span>
            <div className="pop-right">
              {member.isCaptain ? (
                <span className="cap-star" aria-label="Captain">
                  ⭐
                </span>
              ) : null}
              <span className={member.pos === "Net" ? "pos-n" : "pos-b"}>
                {member.pos}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function ScheduleMobileView({
  shifts,
  date,
  setDate,
  chairpersonActions,
  emptyContent,
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

  return (
    <div className="schedule-page-shell">
      <div className="page schedule-page">
        <div className="page-header">
          <div className="title-row">
            <span className="page-title">Schedule</span>
            {isToday ? <span className="today-badge">Today</span> : null}
          </div>
          <div className="controls-row">
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
                  <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M4 1.2v2.6M10 1.2v2.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
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
            <div className="ctrl-divider" />
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
          {chairpersonActions ? (
            <div className="chairperson-actions">{chairpersonActions}</div>
          ) : null}
        </div>

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
                          {court}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((hour) => {
                      const isNow = isCurrentHour(hour);
                      return (
                        <tr
                          key={hour}
                          className={isNow ? "now-row" : undefined}
                        >
                          <td className={`time-cell${isNow ? " now" : ""}`}>
                            {isNow ? (
                              <span className="now-label">
                                <span className="now-pip" />
                                {formatTimeLabel(hour)}
                              </span>
                            ) : (
                              formatTimeLabel(hour)
                            )}
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
