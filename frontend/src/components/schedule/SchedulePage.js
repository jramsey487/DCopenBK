import React, { useState, useEffect } from "react";

import ScheduleMobileView from "./ScheduleMobileView";
import { Banners, getAuthHeader, getToday } from "../Utils";
import { cacheGet, cacheSet } from "../apiCache";

function scheduleCacheKey(date) {
  return `schedule:${date}`;
}

export default function SchedulePage() {
  const [date, setDate] = useState(getToday());
  const [shifts, setShifts] = useState(() => {
    const cached = cacheGet(scheduleCacheKey(getToday()));
    return cached != null ? cached : null;
  });

  useEffect(() => {
    let cancelled = false;
    const cached = cacheGet(scheduleCacheKey(date));
    setShifts(cached != null ? cached : null);

    fetch("/api/get-schedule?date=" + date, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        const next = Array.isArray(data) ? data : [];
        cacheSet(scheduleCacheKey(date), next);
        if (!cancelled) {
          setShifts(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShifts((prev) => (prev == null ? [] : prev));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <>
      <Banners />
      <ScheduleMobileView
        shifts={shifts ?? []}
        date={date}
        setDate={setDate}
        loading={shifts == null}
      />
    </>
  );
}
