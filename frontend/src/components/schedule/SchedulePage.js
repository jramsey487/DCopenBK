import React, { useState } from "react";

import ScheduleMobileView from "./ScheduleMobileView";
import { Banners, getToday } from "../Utils";
import { useApi } from "../api";

export default function SchedulePage() {
  const [date, setDate] = useState(getToday());
  const { data } = useApi(`/api/get-schedule?date=${date}`, { ttl: 15000 });

  return (
    <>
      <Banners />
      <ScheduleMobileView
        shifts={Array.isArray(data) ? data : []}
        date={date}
        setDate={setDate}
        loading={data === undefined}
      />
    </>
  );
}