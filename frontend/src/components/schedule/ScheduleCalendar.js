import React, { useState } from "react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-first offset: 0 = Monday ... 6 = Sunday
function firstWeekdayOffset(year, month) {
  const jsDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  return (jsDay + 6) % 7;
}

function parseSlashDate(dateStr) {
  const [mm, dd, yyyy] = dateStr.split("/");
  return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
}

function formatSlashDate(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${mm}/${dd}/${year}`;
}

export default function ScheduleCalendar({ date, today, onSelect, onClose }) {
  const selected = parseSlashDate(date);
  const todayDate = parseSlashDate(today);

  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const numDays = daysInMonth(viewYear, viewMonth);
  const offset = firstWeekdayOffset(viewYear, viewMonth);

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);

  const isSelected = (d) =>
    selected.getFullYear() === viewYear &&
    selected.getMonth() === viewMonth &&
    selected.getDate() === d;

  const isToday = (d) =>
    todayDate.getFullYear() === viewYear &&
    todayDate.getMonth() === viewMonth &&
    todayDate.getDate() === d;

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const pick = (d) => {
    onSelect(formatSlashDate(viewYear, viewMonth, d));
    onClose();
  };

  const jumpToToday = () => {
    setViewYear(todayDate.getFullYear());
    setViewMonth(todayDate.getMonth());
    onSelect(today);
    onClose();
  };

  return (
    <>
      <div
        className="cal-backdrop"
        onClick={onClose}
        role="presentation"
      />
      <div className="mini-calendar" role="dialog" aria-label="Choose date">
        <div className="cal-header">
          <span className="cal-month-label">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <div className="cal-nav">
            <button
              type="button"
              className="cal-nav-btn"
              aria-label="Previous month"
              onClick={goPrevMonth}
            >
              ‹
            </button>
            <button
              type="button"
              className="cal-nav-btn"
              aria-label="Next month"
              onClick={goNextMonth}
            >
              ›
            </button>
          </div>
        </div>

        <div className="cal-weekdays">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>

        <div className="cal-grid">
          {cells.map((d, i) =>
            d === null ? (
              <span key={i} className="cal-cell cal-cell-empty" />
            ) : (
              <button
                key={i}
                type="button"
                className={`cal-cell${isSelected(d) ? " selected" : ""}${
                  isToday(d) && !isSelected(d) ? " is-today" : ""
                }`}
                onClick={() => pick(d)}
              >
                {d}
              </button>
            )
          )}
        </div>

        <div className="cal-footer">
          <button type="button" className="cal-today-btn" onClick={jumpToToday}>
            Today
          </button>
        </div>
      </div>
    </>
  );
}
