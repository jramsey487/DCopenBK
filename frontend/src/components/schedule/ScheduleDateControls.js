import React, { useState } from "react";

import { getToday } from "../Utils";
import ScheduleCalendar, {
  formatShortDate,
  shiftSlashDate,
} from "./ScheduleCalendar";

export default function ScheduleDateControls({ date, setDate }) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
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
          <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.1" />
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
  );
}
