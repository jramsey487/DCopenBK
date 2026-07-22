import React, { useState, useEffect } from "react";

import ScheduleMobileView from "./ScheduleMobileView";
import { Banners, getAuthHeader, getToday } from "../Utils";

export default function SchedulePage(props) {
  const [shifts, setShifts] = useState([]);
  const [date, setDate] = useState(getToday());

  useEffect(() => {
    fetch("/api/get-schedule?date=" + date, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setShifts(data));
  }, [date]);

  return (
    <>
      <Banners />
      <ScheduleMobileView shifts={shifts} date={date} setDate={setDate} />
    </>
  );
}
