import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";

import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { ScheduleTable } from "./ScheduleTable";
import { HelpIcon, TournamentBanner, getAuthHeader, getToday } from "../Utils";
import { scheduleNonchairperson } from "../HelpMessages";

export default function SchedulePage(props) {
  const [shifts, setShifts] = useState([]);
  const [date, setDate] = useState(getToday());

  useEffect(() => {
    fetch("/api/get-schedule?date=" + date, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setShifts(data));
  }, [date]);

  return (
    <div className="page">
      <TournamentBanner />

      <Box className="sxs" sx={{ mb: 1 }}>
        <Typography variant="h4">Schedule</Typography>
        &thinsp;
        <HelpIcon page="Schedule" message={scheduleNonchairperson} />
      </Box>

      <Box className="sxs" sx={{ mb: 2 }}>
        <Typography variant="body1">Showing schedule for: &thinsp;</Typography>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DatePicker
            renderInput={(props) => (
              <TextField sx={{ mx: 2 }} variant="standard" {...props} />
            )}
            label="Date"
            value={date}
            mask={"__/__/____"}
            onChange={(newValue) => {
              setDate(newValue.toLocaleString());
            }}
          />
        </LocalizationProvider>
      </Box>

      {shifts.length === 0 ? (
        <Typography variant="body1">No schedule found.</Typography>
      ) : (
        <ScheduleTable shifts={shifts} readOnly={true} />
      )}
    </div>
  );
}
