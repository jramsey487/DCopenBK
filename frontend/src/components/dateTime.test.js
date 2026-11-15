import {
  getDays,
  parseIsoDateLocal,
  localDateToIso,
  dayHourToStr,
  getTimeFloat,
  getDurationStr,
  toPercent,
  isHalfHourSlot,
} from "./dateTime";

describe("dateTime helpers", () => {
  test("getDays is inclusive of both endpoints", () => {
    expect(getDays("2026-07-19", "2026-07-27")).toHaveLength(9);
  });

  test("getDays returns [] when start is after end", () => {
    expect(getDays("2026-07-27", "2026-07-19")).toEqual([]);
  });

  test("parseIsoDateLocal rejects impossible dates", () => {
    expect(parseIsoDateLocal("2026-02-30")).toBeNull();
    expect(parseIsoDateLocal("")).toBeNull();
  });

  test("parseIsoDateLocal reads the local calendar day from a datetime", () => {
    const d = parseIsoDateLocal("2026-07-19T10:00:00");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(19);
  });

  test("localDateToIso round-trips calendar parts", () => {
    expect(localDateToIso(new Date(2026, 6, 5))).toBe("2026-07-05");
    expect(localDateToIso(null)).toBe("");
  });

  test("dayHourToStr formats 12-hour times", () => {
    expect(dayHourToStr("2026-07-19T15:00:00")).toBe("3pm");
    expect(dayHourToStr("2026-07-19T15:30:00", true)).toBe("3:30pm");
    expect(dayHourToStr("2026-07-19T00:00:00")).toBe("12am");
  });

  test("getTimeFloat handles days and plain durations", () => {
    expect(getTimeFloat("1 02:30:00")).toBe(26.5);
    expect(getTimeFloat("03:15:00")).toBe(3.25);
    expect(getTimeFloat("")).toBe(0);
  });

  test("getDurationStr", () => {
    expect(getDurationStr(3.5)).toBe("3 hrs 30 mins");
    expect(getDurationStr(3.5, false)).toBe("3:30");
  });

  test("toPercent", () => {
    expect(toPercent(0.1234)).toBe("12.3%");
  });

  test("isHalfHourSlot", () => {
    expect(isHalfHourSlot("2026-07-19T10:30:00")).toBe(true);
    expect(isHalfHourSlot("2026-07-19T10:00:00")).toBe(false);
  });
});