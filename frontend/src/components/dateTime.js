import { END_DATE, START_DATE } from "./Consts";

export function getCurrentYear() {
  return new Date().getFullYear();
}

/** Convert `[year]-[month]-[day]T[24hour]:[minute]:…` → `3pm` / `3:30pm`. */
export function dayHourToStr(dayHour, showMinutes = false) {
  if (dayHour === null || dayHour === undefined) {
    return "";
  }

  const military_hour = parseInt(dayHour.slice(11, 13));
  const suffix = military_hour >= 12 ? "pm" : "am";
  const hour = ((military_hour + 11) % 12) + 1;

  const minutes = dayHour.slice(14, 16);
  if (showMinutes) {
    return `${hour}:${minutes}${suffix}`;
  }
  return `${hour}${suffix}`;
}

export function getDays() {
  // Note that these dates are 0-indexed!!
  const startDate = new Date(START_DATE);
  const endDate = new Date(END_DATE);

  const days = [];
  const date = startDate;
  while (date <= endDate) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return days;
}

/**
 * Duration string → hours as float.
 * Accepts `{days} {hours}:{minutes}:…` or `{hours}:{minutes}:…`.
 */
export function getTimeFloat(timeStr) {
  let day = 0;
  let hour = 0;
  let minute = 0;

  if (timeStr !== "" && timeStr !== null && timeStr !== undefined) {
    const hourStr = timeStr.split(":")[0];

    if (hourStr.length > 2) {
      day = parseInt(hourStr.split(" ")[0]);
      hour = parseInt(hourStr.split(" ")[1]);
    } else {
      hour = parseInt(hourStr);
    }

    minute = parseInt(timeStr.split(":")[1]);
  }

  return day * 24 + hour + minute / 60;
}

/** Hours float → `3 hrs 05 mins` (or compact `3:05`). */
export function getDurationStr(timeFloat, verbose = true) {
  if (timeFloat === null || isNaN(timeFloat)) {
    timeFloat = 0;
  }

  const hours = Math.floor(timeFloat);
  const mins = parseInt((timeFloat % 1) * 60).toLocaleString("en-US", {
    minimumIntegerDigits: 2,
  });

  return verbose ? hours + " hrs " + mins + " mins" : hours + ":" + mins;
}

/**
 * Clock time as `3:05 PM`.
 * String input: `{hour}:{minute}:…`. Float input: hours since midnight.
 */
export function getTimeStr(input) {
  if (
    input === null ||
    input === undefined ||
    input === "" ||
    Number.isNaN(input)
  ) {
    return "";
  }

  let military_hour;
  let minute;

  if (typeof input === "string" || input instanceof String) {
    const index = input.indexOf(":");
    military_hour = Number.parseInt(input.slice(0, index));
    minute = input.slice(index + 1, index + 3);
  } else {
    military_hour = Math.floor(input) % 24;
    minute = String(Math.round((input % 1) * 60)).padStart(2, "0");
  }

  const suffix = military_hour >= 12 ? " PM" : " AM";
  const hour = ((military_hour + 11) % 12) + 1;
  return `${hour}:${minute} ${suffix}`;
}

export function toPercent(val) {
  const percent = Number((val * 100).toFixed(1));
  return `${percent}%`;
}

/** True when shift start is this clock hour (teams / court assignment). */
export function isCurrentHour(hour) {
  if (!hour || hour.length < 13) {
    return false;
  }

  const shiftDate = hour.substring(0, 10);
  const shiftHour = parseInt(hour.substring(11, 13), 10);
  if (Number.isNaN(shiftHour)) {
    return false;
  }

  const nowDate = getToday("hyphen");
  const nowHours = new Date().getHours();

  return shiftHour === nowHours && shiftDate === nowDate;
}

/** Schedule row highlight: match the current 30-minute window. */
export function isCurrentScheduleSlot(hour) {
  if (!hour || hour.length < 16) {
    return false;
  }

  const shiftDate = hour.substring(0, 10);
  const shiftHour = parseInt(hour.substring(11, 13), 10);
  const shiftMinute = parseInt(hour.substring(14, 16), 10);
  if (Number.isNaN(shiftHour) || Number.isNaN(shiftMinute)) {
    return false;
  }

  const now = new Date();
  const nowDate = getToday("hyphen");
  if (shiftDate !== nowDate) {
    return false;
  }

  const shiftSlot = shiftHour * 60 + (shiftMinute >= 30 ? 30 : 0);
  const nowSlot = now.getHours() * 60 + (now.getMinutes() >= 30 ? 30 : 0);
  return shiftSlot === nowSlot;
}

/** True when a schedule start timestamp is on the half hour (:30). */
export function isHalfHourSlot(hour) {
  if (!hour || hour.length < 16) {
    return false;
  }
  return hour.substring(14, 16) === "30";
}

/**
 * Today as string.
 * slash: `MM/DD/YYYY`, hyphen: `YYYY-MM-DD`.
 * Ratings before 10am use yesterday.
 */
export function getToday(format = "slash", isForRating = false) {
  const today = new Date();
  if (isForRating && today.getHours() <= 10) {
    today.setDate(today.getDate() - 1);
  }

  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();

  if (format === "slash") {
    return `${mm}/${dd}/${yyyy}`;
  }
  if (format === "hyphen") {
    return `${yyyy}-${mm}-${dd}`;
  }
  return undefined;
}

/** `Wed, Jul 5` style dateStr → `M/D/YYYY` for current year. */
export function getDay(dateStr) {
  const yyyy = getCurrentYear();
  const date = new Date(`${dateStr.slice(5)}, ${yyyy}`);
  const dd = String(date.getDate());
  const mm = String(date.getMonth() + 1);
  return `${mm}/${dd}/${yyyy}`;
}

/** `YYYY-MM-DD` → `MM/DD/YYYY`. */
export function getDayFromHyphenated(dateStr) {
  if (dateStr === null || dateStr === undefined) {
    return null;
  }

  const yyyy = dateStr.slice(0, 4);
  const mm = dateStr.slice(5, 7);
  const dd = dateStr.slice(8);
  return `${mm}/${dd}/${yyyy}`;
}
