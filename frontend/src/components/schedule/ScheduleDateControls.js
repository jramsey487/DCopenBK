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
          aria-label="Choose date"
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
