import React, { useCallback, useEffect, useState } from "react";
import Edit from "@mui/icons-material/Edit";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Tooltip from "@mui/material/Tooltip";

import {
  Banners,
  BallkidLink,
  ConfirmDialog,
  HelpIcon,
  getAuthHeader,
  getDayFromHyphenated,
  getLocalStorage,
  getToday,
} from "../Utils";
import { ticketsPage, ticketsPageBallkid } from "../HelpMessages";
import { TICKET_LIMIT } from "../Consts";
import ScheduleCalendar from "../schedule/ScheduleCalendar";
import "../page-chrome.css";
import "../schedule/schedule-mobile.css";
import "./tickets-page.css";

// Round (TicketSession): one date's ticket form.
// Session (TicketOption): a session # ballkids pick (day / night / all day).
// Times are America/New_York.

const ET = "America/New_York";
const TONE_CLASS = {
  success: " tickets-card--tone-success",
  danger: " tickets-card--tone-danger",
  warning: " tickets-card--tone-warning",
  info: " tickets-card--tone-info",
};

function parseDeadlineMs(iso) {
  if (!iso) {
    return null;
  }
  const raw = String(iso).trim();
  // Naive API timestamps are Eastern wall times.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) {
    const match = raw.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
    );
    if (!match) {
      return null;
    }
    const [, y, mo, d, h, mi, s = "0"] = match;
    const asUtc = Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s)
    );
    const probe = new Date(asUtc);
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: ET,
        timeZoneName: "shortOffset",
      })
        .formatToParts(probe)
        .map((p) => [p.type, p.value])
    );
    const offset = parts.timeZoneName || "GMT-4";
    const offsetMatch = offset.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/);
    let offsetMinutes = -4 * 60;
    if (offsetMatch) {
      const hours = Number(offsetMatch[1]);
      const mins = Number(offsetMatch[2] || 0);
      offsetMinutes = hours * 60 + Math.sign(hours || 1) * mins;
    }
    return asUtc - offsetMinutes * 60 * 1000;
  }
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function isoToDatetimeLocal(iso) {
  const ms = parseDeadlineMs(iso);
  if (ms == null) {
    return "";
  }
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: ET,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(ms))
        .map((p) => [p.type, p.value])
    );
    const year = parts.year;
    const month = String(parts.month || "").padStart(2, "0");
    const day = String(parts.day || "").padStart(2, "0");
    let hour = Number(parts.hour);
    if (hour === 24) {
      hour = 0;
    }
    const minute = String(Number(parts.minute) || 0).padStart(2, "0");
    if (!year || !month || !day || Number.isNaN(hour)) {
      return "";
    }
    return `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${minute}`;
  } catch {
    return "";
  }
}

function datetimeLocalToApi(value) {
  if (!value || !value.includes("T")) {
    return "";
  }
  const [date, time] = value.split("T");
  if (!date || !time) {
    return "";
  }
  const [hh = "00", mm = "00", ss = "00"] = time.split(":");
  return `${date}T${hh}:${mm}:${String(ss).slice(0, 2)}`;
}

function formatEtParts(iso) {
  const ms = parseDeadlineMs(iso);
  if (ms == null) {
    return null;
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ET,
      weekday: "short",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value])
  );
  const dayPeriod = parts.dayPeriod ? ` ${parts.dayPeriod}` : "";
  return {
    date: `${parts.weekday} ${parts.month} ${parts.day}`,
    time: `${parts.hour}:${parts.minute}${dayPeriod}`,
  };
}

function formatEt(iso) {
  const parts = formatEtParts(iso);
  if (!parts) {
    return "";
  }
  return `${parts.date}, ${parts.time} ET`;
}

function formatEtShort(iso) {
  const ms = parseDeadlineMs(iso);
  if (ms == null) {
    return "";
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ET,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value])
  );
  const dayPeriod = parts.dayPeriod ? ` ${parts.dayPeriod}` : "";
  return `${parts.weekday}, ${parts.month} ${parts.day} at ${parts.hour}:${parts.minute}${dayPeriod} ET`;
}

function BallkidStatus({ kicker, title, children, tone }) {
  return (
    <div className={`tickets-card tickets-state${TONE_CLASS[tone] || ""}`}>
      {kicker ? <p className="tickets-state-kicker">{kicker}</p> : null}
      {title ? <h2 className="tickets-card-title">{title}</h2> : null}
      {children}
    </div>
  );
}

function canDeclineConfirmedWin(ticket, session) {
  if (!ticket || ticket.status !== "confirmed") {
    return false;
  }
  if (
    session &&
    Number(ticket.ticket_session) !== Number(session.id)
  ) {
    return false;
  }
  if (session?.waitlist_run_at || ticket.waitlist_run_at) {
    return false;
  }
  const deadline =
    session?.winner_confirm_by || ticket.winner_confirm_by || "";
  const deadlineMs = parseDeadlineMs(deadline);
  if (deadlineMs == null) {
    return false;
  }
  return Date.now() < deadlineMs;
}

function statusTone(status) {
  if (status === "confirmed") {
    return "success";
  }
  if (status === "denied" || status === "declined" || status === "expired") {
    return "danger";
  }
  if (status === "waitlist") {
    return "warning";
  }
  if (status === "requested") {
    return "info";
  }
  return null;
}

function formatTicketDate(isoDate) {
  if (!isoDate) {
    return "";
  }
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatLongTicketDate(isoDate) {
  if (!isoDate) {
    return "";
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Date(year, month - 1, day)
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
    })
    .replace(",", "");
}

function sessionDateLabel(session, ticket) {
  if (ticket?.option_label) {
    return ticket.option_label;
  }
  const options = session?.options || [];
  if (options.length === 1) {
    return options[0].label;
  }
  if (options.length > 1) {
    return "this session";
  }
  const dateLabel = formatTicketDate(session?.ticket_date);
  return dateLabel;
}

function newOption(overrides = {}) {
  return {
    key: `opt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    id: null,
    session_number: "",
    ticket_date: "",
    period: "all_day",
    pool_size: "0",
    ...overrides,
  };
}

function ticketWord(n) {
  return n === 1 ? "ticket" : "tickets";
}

function remainingQuotaCopy(remaining) {
  const left = Math.max(0, Number(remaining) || 0);
  if (left <= 0) {
    return `You've used all ${TICKET_LIMIT} ${ticketWord(TICKET_LIMIT)} for this tournament.`;
  }
  return `You have ${left} of ${TICKET_LIMIT} ${ticketWord(TICKET_LIMIT)} left this tournament.`;
}

function earliestOptionDate(options) {
  const dates = (options || []).map((o) => o.ticket_date).filter(Boolean).sort();
  return dates[0] || "";
}

function slashToIso(slash) {
  const [mm, dd, yyyy] = slash.split("/");
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function formatTicketDateDisplay(isoDate) {
  if (!isoDate) {
    return "Select date";
  }
  const [year, month, day] = isoDate.split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isoDateMinusDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function datetimeLocalTime(value, fallback) {
  if (!value || !value.includes("T")) {
    return fallback;
  }
  const match = String(value.split("T")[1] || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    return fallback;
  }
  const hour = Math.min(23, Number(match[1]));
  const minute = Math.min(59, Number(match[2]));
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return fallback;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function applyTicketDateDefaults(form, ticketDate) {
  const date = ticketDate || form.ticket_date;
  const next = {
    ...form,
    ticket_date: date || form.ticket_date,
    options: (form.options || []).map((option) => ({
      ...option,
      ticket_date: date || option.ticket_date,
    })),
  };
  if (!date) {
    return next;
  }
  const closeTime = datetimeLocalTime(form.closes_at, "11:00");
  const closeDate = isoDateMinusDays(date, 1);
  next.closes_at = `${closeDate}T${closeTime}`;
  const winnerTime = datetimeLocalTime(form.winner_confirm_by, "21:00");
  let winnerDate = closeDate;
  if (`${winnerDate}T${winnerTime}` <= next.closes_at) {
    winnerDate = date;
  }
  next.winner_confirm_by = `${winnerDate}T${winnerTime}`;
  return next;
}

function parseTimeParts(hhmm) {
  if (!hhmm || !hhmm.includes(":")) {
    return { hour: 11, minute: 0, ampm: "AM" };
  }
  const [hStr, mStr] = hhmm.split(":");
  const hour24 = Number(hStr);
  const minute = Number(String(mStr).slice(0, 2)) || 0;
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour, minute, ampm };
}

function to24hTime(hour, minute, ampm) {
  let hour24 = hour % 12;
  if (ampm === "PM") {
    hour24 += 12;
  }
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTimeDisplay(hhmm) {
  if (!hhmm) {
    return "Select time";
  }
  const { hour, minute, ampm } = parseTimeParts(hhmm);
  return `${hour}:${String(minute).padStart(2, "0")} ${ampm}`;
}

// Date / time pickers

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden>
      <circle
        cx="12"
        cy="12.5"
        r="8"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 8.5V12.5L15 14.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TIME_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TIME_MINUTES = [0, 15, 30, 45];
const TIME_AMPM = ["AM", "PM"];

function snapMinute(minute) {
  const options = TIME_MINUTES;
  let best = options[0];
  let bestDiff = Math.abs(minute - best);
  options.forEach((option) => {
    const diff = Math.abs(minute - option);
    if (diff < bestDiff) {
      best = option;
      bestDiff = diff;
    }
  });
  return best;
}

function TicketTimePicker({ value, onSelect, onClose }) {
  const parts = parseTimeParts(value);
  const minute = snapMinute(parts.minute);

  const pick = (patch) => {
    const next = {
      hour: parts.hour,
      minute,
      ampm: parts.ampm,
      ...patch,
    };
    onSelect(to24hTime(next.hour, next.minute, next.ampm));
  };

  return (
    <>
      <div className="cal-backdrop" onClick={onClose} role="presentation" />
      <div
        className="mini-calendar tickets-time-popover"
        role="dialog"
        aria-label="Choose time"
      >
        <div className="cal-header">
          <span className="cal-month-label">Time</span>
        </div>
        <div className="tickets-time-selects">
          <label className="tickets-time-select">
            <span className="tickets-field-label">Hour</span>
            <select
              className="tickets-select"
              value={parts.hour}
              onChange={(e) => pick({ hour: Number(e.target.value) })}
            >
              {TIME_HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
          </label>
          <label className="tickets-time-select">
            <span className="tickets-field-label">Minute</span>
            <select
              className="tickets-select"
              value={minute}
              onChange={(e) => pick({ minute: Number(e.target.value) })}
            >
              {TIME_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
          </label>
          <label className="tickets-time-select">
            <span className="tickets-field-label">AM/PM</span>
            <select
              className="tickets-select"
              value={parts.ampm}
              onChange={(e) => pick({ ampm: e.target.value })}
            >
              {TIME_AMPM.map((ampm) => (
                <option key={ampm} value={ampm}>
                  {ampm}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="tickets-time-popover-actions">
          <button
            type="button"
            className="tickets-btn tickets-btn--secondary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M3.5 9.5H20.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 3V6.5M16 3V6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TicketDateField({ value, onChange, label = "Date" }) {
  const [open, setOpen] = useState(false);
  const slash = value ? getDayFromHyphenated(value) : getToday("slash");

  return (
    <div
      className={
        open
          ? "tickets-field tickets-date-field tickets-date-field--open"
          : "tickets-field tickets-date-field"
      }
    >
      <span className="tickets-field-label">{label}</span>
      <div className="tickets-date-control">
        <button
          type="button"
          className="tickets-date-btn"
          aria-label="Choose ticket date"
          onClick={() => setOpen(true)}
        >
          <span
            className={
              value ? "tickets-date-btn-value" : "tickets-date-btn-placeholder"
            }
          >
            {formatTicketDateDisplay(value)}
          </span>
          <CalendarIcon />
        </button>
        {open ? (
          <ScheduleCalendar
            date={slash}
            today={getToday("slash")}
            onSelect={(dateStr) => onChange(slashToIso(dateStr))}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}

function TicketDateTimeField({
  value,
  onChange,
  label,
  defaultTime = "11:00",
}) {
  const [calOpen, setCalOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const datePart = value?.includes("T") ? value.split("T")[0] : "";
  const timePart = datetimeLocalTime(value, "");
  const slash = datePart ? getDayFromHyphenated(datePart) : getToday("slash");
  const pickerOpen = calOpen || timeOpen;

  const setTime = (nextTime) => {
    if (datePart) {
      onChange(`${datePart}T${nextTime}`);
    } else {
      onChange(`T${nextTime}`);
    }
  };

  return (
    <div
      className={
        pickerOpen
          ? "tickets-field tickets-date-field tickets-date-field--open"
          : "tickets-field tickets-date-field"
      }
    >
      <span className="tickets-field-label">{label}</span>
      <div className="tickets-date-control">
        <div className="tickets-datetime-row">
          <button
            type="button"
            className="tickets-date-btn"
            aria-label={`Choose ${label} date`}
            onClick={() => {
              setTimeOpen(false);
              setCalOpen(true);
            }}
          >
            <span
              className={
                datePart
                  ? "tickets-date-btn-value"
                  : "tickets-date-btn-placeholder"
              }
            >
              {formatTicketDateDisplay(datePart)}
            </span>
            <CalendarIcon />
          </button>
          <div className="tickets-time-field">
            <button
              type="button"
              className="tickets-date-btn"
              aria-label={`Choose ${label} time`}
              onClick={() => {
                setCalOpen(false);
                setTimeOpen(true);
              }}
            >
              <span
                className={
                  timePart
                    ? "tickets-date-btn-value"
                    : "tickets-date-btn-placeholder"
                }
              >
                {formatTimeDisplay(timePart)}
              </span>
              <ClockIcon />
            </button>
            {timeOpen ? (
              <TicketTimePicker
                value={timePart || defaultTime}
                onSelect={setTime}
                onClose={() => setTimeOpen(false)}
              />
            ) : null}
          </div>
        </div>
        {calOpen ? (
          <ScheduleCalendar
            date={slash}
            today={getToday("slash")}
            onSelect={(dateStr) => {
              const isoDate = slashToIso(dateStr);
              onChange(`${isoDate}T${timePart || defaultTime}`);
            }}
            onClose={() => setCalOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}

// Status labels for staff request tables and ballkid cards.
const STATUS_LABEL = {
  requested: "Requested",
  waitlist: "Waitlist",
  confirmed: "Confirmed",
  declined: "Declined",
  expired: "Expired",
  denied: "Denied",
};

const REQUEST_STATUS_SORT = {
  confirmed: 0,
  waitlist: 1,
  declined: 2,
  denied: 3,
};

function sortRequestTickets(tickets) {
  return [...tickets].sort((a, b) => {
    const aRank = REQUEST_STATUS_SORT[a.status] ?? 4;
    const bRank = REQUEST_STATUS_SORT[b.status] ?? 4;
    if (aRank !== bRank) {
      return aRank - bRank;
    }
    const byOrder = (a.order || 0) - (b.order || 0);
    if (byOrder) {
      return byOrder;
    }
    return (a.id || 0) - (b.id || 0);
  });
}

function jsonOrThrow(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("json")) {
    return response.text().then(() => {
      throw new Error(
        response.status >= 500
          ? "Server error while saving."
          : "Request failed"
      );
    });
  }
  return response.json().then((data) => {
    if (!response.ok) {
      const message = data.detail || data.Success || "Request failed";
      throw new Error(typeof message === "string" ? message : "Request failed");
    }
    return data;
  });
}

function optionsFromSession(session) {
  const options = session?.options || [];
  if (!options.length) {
    return [newOption()];
  }
  return options.map((o) => ({
    key: String(o.id),
    id: o.id,
    session_number: String(o.session_number),
    ticket_date: o.ticket_date,
    period: o.period || "all_day",
    pool_size: String(o.pool_size ?? 0),
  }));
}

function emptyRoundForm() {
  return {
    id: null,
    ticket_date: "",
    closes_at: "",
    winner_confirm_by: "",
    options: [newOption()],
  };
}

function formFromSession(session) {
  const options = optionsFromSession(session);
  return {
    id: session.id,
    ticket_date: session.ticket_date || earliestOptionDate(options),
    closes_at: isoToDatetimeLocal(session.closes_at),
    winner_confirm_by: isoToDatetimeLocal(session.winner_confirm_by),
    options,
  };
}

function formFingerprint(form) {
  return JSON.stringify({
    ticket_date: form.ticket_date || "",
    closes_at: form.closes_at || "",
    winner_confirm_by: form.winner_confirm_by || "",
    options: (form.options || []).map((o) => ({
      id: o.id || null,
      session_number: String(o.session_number ?? ""),
      period: o.period || "all_day",
      pool_size: String(o.pool_size ?? ""),
    })),
  });
}

function optionsPayload(form) {
  return form.options.map((o) => ({
    id: o.id || undefined,
    session_number: Number(o.session_number),
    ticket_date: form.ticket_date,
    period: o.period || "all_day",
    pool_size: Number(o.pool_size),
  }));
}

function sortOptions(options) {
  return [...(options || [])].sort((a, b) => {
    const byDate = (a.ticket_date || "").localeCompare(b.ticket_date || "");
    if (byDate) {
      return byDate;
    }
    return Number(a.session_number) - Number(b.session_number);
  });
}

function roundSortDate(session) {
  return earliestOptionDate(session?.options) || session?.ticket_date || "";
}

function sortedRounds(sessions, { pinLive = false } = {}) {
  return [...(sessions || [])].sort((a, b) => {
    if (pinLive) {
      const aLive = staffRoundState(a) === "live" ? 0 : 1;
      const bLive = staffRoundState(b) === "live" ? 0 : 1;
      if (aLive !== bLive) {
        return aLive - bLive;
      }
    }
    const byDate = roundSortDate(a).localeCompare(roundSortDate(b));
    if (byDate) {
      return byDate;
    }
    return (a.id || 0) - (b.id || 0);
  });
}

function todayEtIso() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ET,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function isPastRound(session, todayIso = todayEtIso()) {
  const date = roundSortDate(session);
  return Boolean(date) && date < todayIso;
}

function staffRoundState(session) {
  const now = Date.now();
  const closeMs = parseDeadlineMs(session?.closes_at);
  const declineMs = parseDeadlineMs(session?.winner_confirm_by);
  if (session?.is_live && (closeMs == null || now < closeMs)) {
    return "live";
  }
  if (!session?.lottery_run_at && !session?.is_live) {
    return "draft";
  }
  if (session?.lottery_run_at && declineMs != null && now < declineMs) {
    return "allocating";
  }
  if (session?.lottery_run_at) {
    return "finalized";
  }
  return "draft";
}

const STAFF_ROUND_BADGE = {
  draft: "Draft",
  live: "Live",
  allocating: "Allocating",
  finalized: "Finalized",
};

function roundTitle(session) {
  const options = sortOptions(session?.options);
  if (!options.length) {
    return session?.ticket_date
      ? formatLongTicketDate(session.ticket_date)
      : "Round";
  }
  const groups = [];
  options.forEach((option) => {
    if (!option.ticket_date || !option.session_number) {
      return;
    }
    const last = groups[groups.length - 1];
    const name = `Session ${option.session_number}`;
    if (last && last.date === option.ticket_date) {
      last.names.push(name);
    } else {
      groups.push({ date: option.ticket_date, names: [name] });
    }
  });
  if (!groups.length) {
    return formatLongTicketDate(session.ticket_date) || "Round";
  }
  return groups
    .map((group) => `${formatLongTicketDate(group.date)}: ${group.names.join(", ")}`)
    .join(", ");
}

function ticketsAccepted(ticket) {
  if (ticket.status === "confirmed") {
    return ticket.num_granted || 0;
  }
  return 0;
}

const PERIOD_SHORT = {
  day: "Day",
  night: "Night",
  all_day: "All day",
};

function optionRowLabel(option) {
  const n =
    option?.session_number != null && option.session_number !== ""
      ? `Session ${option.session_number}`
      : "Session";
  const period = PERIOD_SHORT[option?.period];
  return period ? `${n} · ${period}` : n;
}

function allocationCounts(source) {
  const total = Number(source?.pool_size) || 0;
  const leftover = Number(source?.unclaimed_count) || 0;
  return {
    total,
    allotted: Math.max(0, total - leftover),
    leftover,
  };
}

function roundAllocationRows(session) {
  const options = sortOptions(session?.options);
  if (options.length) {
    return options.map((option) => ({
      key: option.id || option.session_number,
      label: optionRowLabel(option),
      ...allocationCounts(option),
    }));
  }
  return [
    {
      key: "round",
      label: "Round",
      ...allocationCounts(session),
    },
  ];
}

function RoundAllocation({ session }) {
  const rows = roundAllocationRows(session);
  return (
    <div className="tickets-allocation">
      <table className="tickets-allocation-table">
        <thead>
          <tr>
            <th>Session</th>
            <th>Total</th>
            <th>Allotted</th>
            <th>Leftover</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td>{row.total}</td>
              <td>{row.allotted}</td>
              <td>{row.leftover}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function leftoverForTicket(ticket, session) {
  const optionId = ticket.ticket_option;
  const option = (session?.options || []).find(
    (o) => Number(o.id) === Number(optionId)
  );
  if (option) {
    return option.unclaimed_count ?? 0;
  }
  return session?.unclaimed_count ?? 0;
}

function waitlistAllocateGrant(ticket, session) {
  const leftover = leftoverForTicket(ticket, session);
  const remaining = Math.max(0, TICKET_LIMIT - (ticket.num_tickets || 0));
  const need = Math.min(ticket.num_requested || 0, remaining);
  if (need <= 0 || leftover <= 0) {
    return 0;
  }
  return Math.min(need, leftover);
}

function RequestsTable({ tickets, session, onRefresh }) {
  const [allocateTicket, setAllocateTicket] = useState(null);
  if (tickets.length === 0) {
    return <p className="tickets-hint">No requests yet.</p>;
  }
  const grant = allocateTicket
    ? waitlistAllocateGrant(allocateTicket, session)
    : 0;
  const grantWord = ticketWord(grant);
  const rows = sortRequestTickets(tickets);
  return (
    <div className="tickets-table-wrap">
      <table className="tickets-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Session</th>
            <th className="tickets-status-cell">Status</th>
            <th>Requested</th>
            <th>Granted</th>
            <th>Accepted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((ticket) => {
            const leftover = leftoverForTicket(ticket, session);
            const rowGrant = waitlistAllocateGrant(ticket, session);
            const canAllocate =
              leftover > 0 &&
              (ticket.status === "waitlist" || ticket.status === "denied");
            return (
              <tr key={ticket.id}>
                <td>
                  {getLocalStorage("group") === "ticketing" ? (
                    ticket.ballkid_name
                  ) : (
                    <BallkidLink
                      id={ticket.ballkid}
                      name={ticket.ballkid_name}
                    />
                  )}
                </td>
                <td>{ticket.option_label || "—"}</td>
                <td className="tickets-status-cell">
                  <span
                    className={`tickets-status tickets-status--${ticket.status}`}
                  >
                    {STATUS_LABEL[ticket.status] || ticket.status}
                  </span>
                </td>
                <td>{ticket.num_requested}</td>
                <td>{ticket.num_granted}</td>
                <td>{ticketsAccepted(ticket)}</td>
                <td>
                  {canAllocate ? (
                    <button
                      type="button"
                      className="tickets-btn tickets-btn--secondary tickets-btn--table"
                      disabled={rowGrant <= 0}
                      onClick={() => setAllocateTicket(ticket)}
                    >
                      Allocate
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ConfirmDialog
        message={
          allocateTicket
            ? `Allocating will confirm ${grant} ${grantWord} for ${
                allocateTicket.ballkid_name || "this ballkid"
              }${
                grant < (allocateTicket.num_requested || 0)
                  ? ` (they requested ${allocateTicket.num_requested}; ${grant} left)`
                  : ""
              }.`
            : ""
        }
        url="/api/allocate-tickets"
        body={{ id: allocateTicket?.id }}
        method="POST"
        open={Boolean(allocateTicket)}
        setOpen={(open) => {
          if (!open) {
            setAllocateTicket(null);
          }
        }}
        setUpdated={() => onRefresh()}
      />
    </div>
  );
}

function RoundEditor({
  form,
  setForm,
  onSubmit,
  saving,
  submitLabel,
  saveDisabled = false,
  lockSessions = false,
}) {
  const updateOption = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o, i) =>
        i === index ? { ...o, ...patch } : o
      ),
    }));
  };

  return (
    <form className="tickets-config" onSubmit={onSubmit}>
      <div className="tickets-round-date">
        <TicketDateField
          value={form.ticket_date}
          onChange={(ticketDate) =>
            setForm((prev) => applyTicketDateDefaults(prev, ticketDate))
          }
        />
      </div>
      <div className="tickets-options">
        {form.options.map((option, index) => (
          <div
            className={
              lockSessions
                ? "tickets-option-row tickets-option-row--locked"
                : "tickets-option-row"
            }
            key={option.key}
          >
            <label className="tickets-field tickets-session-number-field">
              <span className="tickets-field-label">Session #</span>
              <input
                type="number"
                min="1"
                required
                inputMode="numeric"
                placeholder="e.g. 11"
                value={option.session_number}
                disabled={lockSessions}
                onChange={(e) =>
                  updateOption(index, { session_number: e.target.value })
                }
              />
            </label>
            <label className="tickets-field">
              <span className="tickets-field-label">Period</span>
              <select
                className="tickets-select"
                value={option.period}
                disabled={lockSessions}
                onChange={(e) =>
                  updateOption(index, { period: e.target.value })
                }
              >
                <option value="all_day">All day</option>
                <option value="day">Day</option>
                <option value="night">Night</option>
              </select>
            </label>
            <label className="tickets-field">
              <span className="tickets-field-label">Total Allocation</span>
              <input
                type="number"
                min="0"
                required
                value={option.pool_size}
                onChange={(e) =>
                  updateOption(index, { pool_size: e.target.value })
                }
              />
            </label>
            {!lockSessions && form.options.length > 1 ? (
              <button
                type="button"
                className="tickets-btn tickets-btn--danger tickets-option-remove"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    options: prev.options.filter((_, i) => i !== index),
                  }))
                }
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {lockSessions ? null : (
        <div className="tickets-option-actions">
          <button
            type="button"
            className="tickets-btn tickets-btn--secondary"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                options: [
                  ...prev.options,
                  newOption({ ticket_date: prev.ticket_date }),
                ],
              }))
            }
          >
            Add session
          </button>
        </div>
      )}
      <div className="tickets-config-grid">
        <TicketDateTimeField
          label="Ticket requests close at"
          value={form.closes_at}
          defaultTime="11:00"
          onChange={(closes_at) =>
            setForm((prev) => ({ ...prev, closes_at }))
          }
        />
        <TicketDateTimeField
          label="Winners can decline until"
          value={form.winner_confirm_by}
          defaultTime="21:00"
          onChange={(winner_confirm_by) =>
            setForm((prev) => ({ ...prev, winner_confirm_by }))
          }
        />
      </div>
      <div className="tickets-actions">
        <button
          type="submit"
          className="tickets-btn"
          disabled={saving || saveDisabled}
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function SavedRound({
  session,
  tickets,
  onRefresh,
  setError,
  anotherLive,
}) {
  const [form, setForm] = useState(() => formFromSession(session));
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);

  const formStamp = `${session.id}:${session.closes_at}:${session.winner_confirm_by}:${(session.options || [])
    .map((o) => `${o.id}-${o.session_number}-${o.ticket_date}-${o.period}-${o.pool_size}`)
    .join(",")}`;

  useEffect(() => {
    setForm(formFromSession(session));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formStamp]);

  const dirty =
    formFingerprint(form) !== formFingerprint(formFromSession(session));

  const saveSession = (e) => {
    e.preventDefault();
    if (!dirty) {
      return;
    }
    setSaving(true);
    setError("");
    fetch("/api/ticket-session", {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify({
        id: session.id,
        closes_at: datetimeLocalToApi(form.closes_at),
        winner_confirm_by: datetimeLocalToApi(form.winner_confirm_by),
        options: optionsPayload(form),
      }),
    })
      .then(jsonOrThrow)
      .then(() => {
        setEditing(false);
        onRefresh();
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  const state = staffRoundState(session);
  const badge = STAFF_ROUND_BADGE[state];
  const showMakeLive = state === "draft" && !isPastRound(session);
  const canEdit = state !== "finalized";
  const closeLabel = formatEtShort(session.closes_at);
  const declineLabel = formatEtShort(session.winner_confirm_by);

  return (
    <div
      className={
        state === "live"
          ? "tickets-card tickets-card--round tickets-card--live"
          : "tickets-card tickets-card--round"
      }
    >
      <div className={`tickets-round-header tickets-round-header--${state}`}>
        <div className="tickets-round-heading">
          <h2 className="tickets-card-title">{roundTitle(session)}</h2>
          <span className={`tickets-round-badge tickets-round-badge--${state}`}>
            {badge}
          </span>
        </div>
        <div className="tickets-round-header-actions">
          {canEdit && editing ? (
            <button
              type="button"
              className="tickets-btn tickets-btn--secondary"
              onClick={() => {
                setForm(formFromSession(session));
                setEditing(false);
              }}
            >
              Cancel
            </button>
          ) : canEdit ? (
            <button
              type="button"
              className="tickets-btn tickets-btn--edit"
              onClick={() => {
                setForm(formFromSession(session));
                setEditing(true);
              }}
            >
              Edit
              <Edit className="tickets-btn-icon" fontSize="inherit" />
            </button>
          ) : null}
          {showMakeLive ? (
            anotherLive ? (
              <Tooltip title="Only one round can be live at a time">
                <span className="tickets-btn-tooltip-wrap">
                  <button
                    type="button"
                    className="tickets-btn tickets-btn--live"
                    disabled
                  >
                    Make live
                  </button>
                </span>
              </Tooltip>
            ) : (
              <button
                type="button"
                className="tickets-btn tickets-btn--live"
                onClick={() => setLiveOpen(true)}
              >
                Make live
              </button>
            )
          ) : null}
          <button
            type="button"
            className="tickets-btn tickets-btn--danger"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </button>
        </div>
      </div>
      {state === "live" && closeLabel ? (
        <p className="tickets-round-subtext">
          Accepting requests until {closeLabel}
        </p>
      ) : null}
      {state === "draft" ? (
        <p className="tickets-round-subtext">Not visible to ballkids yet</p>
      ) : null}
      {state === "allocating" ? (
        <p className="tickets-round-subtext">
          {declineLabel
            ? `Winners can decline until ${declineLabel} — leftover tickets go to the waitlist.`
            : "Winners can decline — leftover tickets go to the waitlist."}
        </p>
      ) : null}
      {state === "finalized" ? (
        <p className="tickets-round-subtext">Tickets confirmed for this date</p>
      ) : null}
      {canEdit && editing ? (
        <RoundEditor
          form={form}
          setForm={setForm}
          onSubmit={saveSession}
          saving={saving}
          submitLabel="Save changes"
          saveDisabled={!dirty}
          lockSessions={state !== "draft"}
        />
      ) : null}
      <RoundAllocation session={session} />
      <button
        type="button"
        className="tickets-requests-toggle"
        aria-expanded={showRequests}
        onClick={() => setShowRequests((open) => !open)}
      >
        <span className="tickets-requests-toggle-label">
          Requests
          {tickets.length ? (
            <span className="tickets-toggle-count"> ({tickets.length})</span>
          ) : null}
        </span>
        <ExpandMore
          className={
            showRequests
              ? "tickets-toggle-chevron tickets-toggle-chevron--open"
              : "tickets-toggle-chevron"
          }
          fontSize="small"
        />
      </button>
      {showRequests ? (
        <RequestsTable
          tickets={tickets}
          session={session}
          onRefresh={onRefresh}
        />
      ) : null}
      <ConfirmDialog
        message={`Making ${roundTitle(session)} live will show this ticket form to ballkids right away.`}
        url="/api/ticket-session"
        body={{ id: session.id, is_live: true }}
        method="PATCH"
        open={liveOpen}
        setOpen={setLiveOpen}
        setUpdated={() => onRefresh()}
      />
      <ConfirmDialog
        message={`Deleting ${roundTitle(session)} will remove this round and all of its ticket requests.`}
        url="/api/ticket-session"
        body={{ id: session.id }}
        method="DELETE"
        open={deleteOpen}
        setOpen={setDeleteOpen}
        setUpdated={() => onRefresh()}
      />
    </div>
  );
}

function StaffTickets({
  sessions,
  tickets,
  onRefresh,
  error,
  setError,
}) {
  const hasRounds = sessions.length > 0;
  const [form, setForm] = useState(emptyRoundForm);
  const [saving, setSaving] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const showCreate = creating || !hasRounds;

  const saveNewRound = (e) => {
    e.preventDefault();
    const date = form.ticket_date;
    if (
      date &&
      sessions.some((s) => (s.ticket_date || roundSortDate(s)) === date)
    ) {
      setError(
        "A round for this date already exists — edit it below."
      );
      return;
    }
    setSaving(true);
    setError("");
    fetch("/api/ticket-session", {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify({
        closes_at: datetimeLocalToApi(form.closes_at),
        winner_confirm_by: datetimeLocalToApi(form.winner_confirm_by),
        options: optionsPayload(form),
      }),
    })
      .then(jsonOrThrow)
      .then(() => {
        setForm(emptyRoundForm());
        setCreating(false);
        onRefresh();
      })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  const ticketsBySession = {};
  tickets.forEach((ticket) => {
    const key = ticket.ticket_session;
    if (!ticketsBySession[key]) {
      ticketsBySession[key] = [];
    }
    ticketsBySession[key].push(ticket);
  });

  const currentRounds = sortedRounds(
    sessions.filter((round) => staffRoundState(round) !== "finalized"),
    { pinLive: true }
  );
  const pastRounds = sortedRounds(
    sessions.filter((round) => staffRoundState(round) === "finalized")
  );

  const closeCreate = () => {
    setForm(emptyRoundForm());
    setCreating(false);
  };

  const errorBanner = error ? (
    <div className="tickets-error-banner" role="alert">
      <span className="tickets-error-banner-text">{error}</span>
      <button
        type="button"
        className="tickets-error-banner-close"
        aria-label="Dismiss"
        onClick={() => setError("")}
      >
        ×
      </button>
    </div>
  ) : null;

  const renderRounds = (rounds) =>
    rounds.map((round) => (
      <SavedRound
        key={round.id}
        session={round}
        tickets={ticketsBySession[round.id] || []}
        onRefresh={onRefresh}
        setError={setError}
        anotherLive={sessions.some((s) => s.is_live && s.id !== round.id)}
      />
    ));

  return (
    <>
      {errorBanner}
      <p className="tickets-hint">All times on this page are in Eastern Time.</p>
      {showCreate ? (
        <div className="tickets-card tickets-config">
          <div className="tickets-create-header">
            <h2 className="tickets-card-title">Create ticket round</h2>
            {hasRounds ? (
              <button
                type="button"
                className="tickets-btn tickets-btn--secondary"
                onClick={closeCreate}
              >
                Cancel
              </button>
            ) : null}
          </div>
          <RoundEditor
            form={form}
            setForm={setForm}
            onSubmit={saveNewRound}
            saving={saving}
            submitLabel="Save round"
          />
        </div>
      ) : null}

      <section className="tickets-bk-section">
        <div className="tickets-section-heading">
          <h2 className="tickets-bk-section-title">Upcoming rounds</h2>
          {hasRounds && !showCreate ? (
            <button
              type="button"
              className="tickets-btn"
              onClick={() => setCreating(true)}
            >
              New round
            </button>
          ) : null}
        </div>
        {currentRounds.length === 0 ? (
          <p className="tickets-bk-empty">No upcoming rounds.</p>
        ) : (
          renderRounds(currentRounds)
        )}
      </section>

      <section className="tickets-bk-section tickets-bk-section--past">
        <button
          type="button"
          className="tickets-section-toggle"
          aria-expanded={pastOpen}
          onClick={() => setPastOpen((open) => !open)}
        >
          <span className="tickets-bk-section-title">
            Finalized rounds
            {pastRounds.length ? (
              <span className="tickets-toggle-count">
                {" "}
                ({pastRounds.length})
              </span>
            ) : null}
          </span>
          <ExpandMore
            className={
              pastOpen
                ? "tickets-toggle-chevron tickets-toggle-chevron--open"
                : "tickets-toggle-chevron"
            }
            fontSize="small"
          />
        </button>
        {pastOpen ? (
          pastRounds.length === 0 ? (
            <p className="tickets-bk-empty">No finalized rounds yet.</p>
          ) : (
            renderRounds(pastRounds)
          )
        ) : null}
      </section>
    </>
  );
}

function confirmedGrantCopy(ticket, { includeSession = true } = {}) {
  const requested = ticket.num_requested || 0;
  const granted = ticket.num_granted || 0;
  const grantWord = ticketWord(granted);
  const partial = requested > granted && granted > 0;
  const sessionBit = includeSession ? " to this session" : "";
  if (partial) {
    return (
      <>
        Your request was{" "}
        <strong>
          partially confirmed for {granted} {grantWord}
        </strong>
        {sessionBit}.
      </>
    );
  }
  return `You're confirmed for ${granted} ${grantWord}${sessionBit}.`;
}

function requestOutcomeCopy(ticket, session, { past = false } = {}) {
  const requested = ticket.num_requested || 0;
  const reqWord = ticketWord(requested);
  const current =
    !past &&
    session &&
    Number(ticket.ticket_session) === Number(session.id)
      ? session
      : null;
  switch (ticket.status) {
    case "requested":
      return current?.closes_at
        ? `You requested ${requested} ${reqWord}. You can edit or cancel this request until ${formatEt(current.closes_at)}.`
        : `You requested ${requested} ${reqWord}.`;
    case "waitlist":
      if (current && !current.waitlist_run_at && !ticket.waitlist_run_at) {
        return `You're on the waitlist for this session. Keep checking back until ${formatEtShort(current.winner_confirm_by || ticket.winner_confirm_by)} in case a spot opens up.`;
      }
      return "You weren't selected for this session.";
    case "confirmed":
      return canDeclineConfirmedWin(ticket, current) ? (
        <>
          {confirmedGrantCopy(ticket)}
          {` Can't make it? Decline by ${formatEtShort(current.winner_confirm_by)}.`}
        </>
      ) : (
        confirmedGrantCopy(ticket, { includeSession: false })
      );
    case "declined":
      return "You declined this offer.";
    case "expired":
      return "This offer expired.";
    case "denied":
      return "You weren't selected for this session.";
    default:
      return "";
  }
}

function noFormCopy(session, phase, remaining) {
  if (remaining <= 0) {
    return "You've used all allocated tickets for this tournament. No further requests can be submitted.";
  }
  if (session && phase && phase !== "open") {
    return "The request window for these tickets is closed.";
  }
  return "Form will appear here when a round is made live.";
}

function BallkidTickets({
  session,
  tickets,
  remaining,
  onRefresh,
  onTicketSaved,
  error,
  setError,
}) {
  const myTickets = tickets || [];
  const options = session?.options || [];
  const [num, setNum] = useState("1");
  const [optionId, setOptionId] = useState(
    options[0] ? String(options[0].id) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const phase = session?.phase;
  const sessionTicket = session
    ? myTickets.find((ticket) => Number(ticket.ticket_session) === Number(session.id))
    : null;
  const pastTickets = myTickets.filter(
    (ticket) =>
      !session || Number(ticket.ticket_session) !== Number(session.id)
  );
  const actionTicket = myTickets.find((ticket) =>
    canDeclineConfirmedWin(ticket, session)
  );
  const canEdit =
    Boolean(session) &&
    phase === "open" &&
    sessionTicket?.status === "requested";
  const canRequest =
    Boolean(session) &&
    phase === "open" &&
    remaining > 0 &&
    !sessionTicket;
  const showForm = canRequest || (canEdit && editing);
  const editDirty =
    canEdit &&
    (String(num) !== String(sessionTicket?.num_requested ?? "") ||
      (options.length > 0 &&
        String(optionId) !== String(sessionTicket?.ticket_option ?? "")));

  const resetEditForm = () => {
    if (sessionTicket) {
      setNum(String(sessionTicket.num_requested || 1));
      if (sessionTicket.ticket_option) {
        setOptionId(String(sessionTicket.ticket_option));
      }
    }
  };

  useEffect(() => {
    setEditing(false);
  }, [session?.id, sessionTicket?.id]);

  useEffect(() => {
    if (canEdit && sessionTicket) {
      setNum(String(sessionTicket.num_requested || 1));
      if (sessionTicket.ticket_option) {
        setOptionId(String(sessionTicket.ticket_option));
      }
      return;
    }
    if (remaining > 0) {
      setNum(String(Math.min(Number(num) || 1, remaining)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, canEdit, sessionTicket?.id, sessionTicket?.num_requested, sessionTicket?.ticket_option]);

  useEffect(() => {
    if (options.length && !options.some((o) => String(o.id) === optionId)) {
      setOptionId(String(options[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const requestTickets = (e) => {
    e.preventDefault();
    if (canEdit && !editDirty) {
      return;
    }
    setSubmitting(true);
    setError("");
    fetch("/api/request-tickets", {
      method: canEdit ? "PATCH" : "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        num_requested: Number(num),
        option_id: optionId ? Number(optionId) : undefined,
      }),
    })
      .then(jsonOrThrow)
      .then((ticket) => {
        setEditing(false);
        onTicketSaved?.(ticket);
      })
      .catch((err) => setError(err.message))
      .finally(() => setSubmitting(false));
  };

  const closes = formatEtParts(session?.closes_at);
  const maxRequestable = canEdit
    ? Math.max(remaining, Number(sessionTicket?.num_requested) || 1, 1)
    : Math.max(remaining, 1);

  let currentPanel;
  if (actionTicket) {
    currentPanel = (
      <BallkidStatus
        tone="success"
        kicker="Confirmed"
        title={
          actionTicket.option_label ||
          sessionDateLabel(session, actionTicket)
        }
      >
        <p className="tickets-state-copy">
          {confirmedGrantCopy(actionTicket)}
          <br />
          {`Can't make it? Decline by `}
          <strong>{formatEtShort(session?.winner_confirm_by)}</strong>.
        </p>
        <div className="tickets-actions">
          <button
            type="button"
            className="tickets-btn"
            disabled={submitting}
            onClick={() => setDeclineOpen(true)}
          >
            Decline
          </button>
        </div>
        {error ? <p className="tickets-error">{error}</p> : null}
      </BallkidStatus>
    );
  } else if (canEdit && !editing) {
    currentPanel = (
      <BallkidStatus
        tone="info"
        kicker="Requested"
        title={
          sessionTicket.option_label ||
          sessionDateLabel(session, sessionTicket)
        }
      >
        <p className="tickets-state-copy">
          {requestOutcomeCopy(sessionTicket, session)}
        </p>
        <div className="tickets-actions">
          <button
            type="button"
            className="tickets-btn tickets-btn--edit"
            onClick={() => {
              resetEditForm();
              setEditing(true);
            }}
          >
            Edit
            <Edit className="tickets-btn-icon" fontSize="inherit" />
          </button>
          <button
            type="button"
            className="tickets-btn tickets-btn--danger"
            onClick={() => setCancelOpen(true)}
          >
            Cancel request
          </button>
        </div>
        {error ? <p className="tickets-error">{error}</p> : null}
      </BallkidStatus>
    );
  } else if (showForm) {
    currentPanel = (
      <form className="tickets-card tickets-state" onSubmit={requestTickets}>
        <h2 className="tickets-card-title">{roundTitle(session)}</h2>
        <p className="tickets-state-copy tickets-state-copy--spaced">
          {canEdit
            ? `You can edit or cancel your request until ${closes?.date} at ${closes?.time} ET.`
            : `Ticket request form closes on ${closes?.date} at ${closes?.time} ET.`}
        </p>
        {options.length ? (
          <fieldset className="tickets-radios">
            <legend>Which session?</legend>
            {options.map((option) => (
              <label
                key={option.id}
                className={
                  String(option.id) === optionId
                    ? "tickets-radio tickets-radio--selected"
                    : "tickets-radio"
                }
              >
                <input
                  type="radio"
                  name="ticket-option"
                  value={option.id}
                  checked={String(option.id) === optionId}
                  onChange={() => setOptionId(String(option.id))}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        <label className="tickets-field">
          How many?
          <select
            className="tickets-select"
            value={num}
            onChange={(e) => setNum(e.target.value)}
          >
            {Array.from({ length: maxRequestable }, (_, i) => i + 1).map(
              (n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              )
            )}
          </select>
        </label>
        <div className="tickets-actions">
          <button
            type="submit"
            className="tickets-btn"
            disabled={
              submitting ||
              (options.length > 0 && !optionId) ||
              (canEdit && !editDirty)
            }
          >
            {submitting
              ? "Saving…"
              : canEdit
                ? "Save changes"
                : "Submit request"}
          </button>
          {canEdit ? (
            <button
              type="button"
              className="tickets-btn tickets-btn--secondary"
              disabled={submitting}
              onClick={() => {
                resetEditForm();
                setEditing(false);
                setError("");
              }}
            >
              Back
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="tickets-btn tickets-btn--danger"
              disabled={submitting}
              onClick={() => setCancelOpen(true)}
            >
              Cancel request
            </button>
          ) : null}
        </div>
        {error ? <p className="tickets-error">{error}</p> : null}
      </form>
    );
  } else if (sessionTicket && session) {
    const outcome = requestOutcomeCopy(sessionTicket, session);
    currentPanel = (
      <BallkidStatus
        tone={statusTone(sessionTicket.status)}
        kicker={STATUS_LABEL[sessionTicket.status] || sessionTicket.status}
        title={
          sessionTicket.option_label ||
          sessionDateLabel(session, sessionTicket)
        }
      >
        {outcome ? (
          <p className="tickets-state-copy">{outcome}</p>
        ) : null}
      </BallkidStatus>
    );
  } else {
    currentPanel = (
      <BallkidStatus title="Ticket form for upcoming session is not available">
        <p className="tickets-state-copy">
          {noFormCopy(session, phase, remaining)}
        </p>
      </BallkidStatus>
    );
  }

  return (
    <>
      <p
        className={
          remaining > 0 ? "tickets-quota" : "tickets-quota tickets-quota--none"
        }
      >
        {remainingQuotaCopy(remaining)}
      </p>
      <p className="tickets-hint">Times are in Eastern Time.</p>
      <section className="tickets-bk-section">
        <h2 className="tickets-bk-section-title">Current form</h2>
        {currentPanel}
      </section>
      <section className="tickets-bk-section">
        <h2 className="tickets-bk-section-title">Past requests</h2>
        {pastTickets.length ? (
          pastTickets.map((ticket) => {
            const outcome = requestOutcomeCopy(ticket, null, { past: true });
            return (
              <BallkidStatus
                key={ticket.id}
                tone={statusTone(ticket.status)}
                kicker={STATUS_LABEL[ticket.status] || ticket.status}
                title={ticket.option_label}
              >
                {outcome ? (
                  <p className="tickets-state-copy">{outcome}</p>
                ) : null}
              </BallkidStatus>
            );
          })
        ) : (
          <p className="tickets-bk-empty">You don't have any past requests.</p>
        )}
      </section>
      <ConfirmDialog
        message={`Declining will remove ${
          actionTicket?.num_granted === 1
            ? "this ticket"
            : `these ${actionTicket?.num_granted} tickets`
        } from your tournament total so ${
          actionTicket?.num_granted === 1 ? "it" : "they"
        } can go to the waitlist.`}
        url="/api/confirm-tickets"
        body={{ accept: false }}
        method="POST"
        open={declineOpen}
        setOpen={setDeclineOpen}
        setUpdated={() => onRefresh()}
      />
      <ConfirmDialog
        message="Cancelling will withdraw your ticket request for this round. You can submit a new request until the form closes."
        url="/api/request-tickets"
        body={{}}
        method="DELETE"
        open={cancelOpen}
        setOpen={setCancelOpen}
        setUpdated={() => {
          setEditing(false);
          onRefresh();
        }}
      />
    </>
  );
}

export default function TicketsPage() {
  const group = getLocalStorage("group");
  const canManage = group === "chairperson" || group === "ticketing";
  const [session, setSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [remaining, setRemaining] = useState(TICKET_LIMIT);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    return Promise.all([
      fetch("/api/ticket-session", { headers: getAuthHeader() }).then((r) =>
        r.json()
      ),
      fetch("/api/ticket-list", { headers: getAuthHeader() }).then((r) =>
        r.json()
      ),
    ])
      .then(([sessionPayload, ticketList]) => {
        setSession(sessionPayload.session);
        setSessions(
          Array.isArray(sessionPayload.sessions)
            ? sessionPayload.sessions
            : sessionPayload.session
              ? [sessionPayload.session]
              : []
        );
        setRemaining(sessionPayload.remaining ?? TICKET_LIMIT);
        setTickets(Array.isArray(ticketList) ? ticketList : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const applyTicketSaved = useCallback(
    (ticket) => {
      if (ticket?.id) {
        setTickets((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const idx = list.findIndex((t) => Number(t.id) === Number(ticket.id));
          if (idx >= 0) {
            const next = list.slice();
            next[idx] = { ...next[idx], ...ticket };
            return next;
          }
          return [ticket, ...list];
        });
      }
      // Reconcile in the background; UI already reflects the save.
      refresh();
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className={canManage ? "page tickets-page" : "page tickets-page tickets-page--ballkid"}>
      <Banners />
      <div className="cut-page-top-bar">
        <div className="cut-page-top-bar__title">
          <h1 className="tickets-title">Tickets</h1>
          <HelpIcon
            page="Tickets"
            message={canManage ? ticketsPage : ticketsPageBallkid}
          />
        </div>
      </div>

      {!loaded ? (
        <p className="tickets-hint">Loading…</p>
      ) : canManage ? (
        <StaffTickets
          sessions={sessions}
          tickets={tickets}
          onRefresh={refresh}
          error={error}
          setError={setError}
        />
      ) : (
        <BallkidTickets
          session={session}
          tickets={tickets}
          remaining={remaining}
          onRefresh={refresh}
          onTicketSaved={applyTicketSaved}
          error={error}
          setError={setError}
        />
      )}
    </div>
  );
}
