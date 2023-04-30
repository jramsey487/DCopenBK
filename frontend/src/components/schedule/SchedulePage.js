import React, { useState, useEffect } from "react";
import {
  TextField,
  Typography,
  Table,
  TableContainer,
  Box,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { getAuthHeader, getToday } from "../Utils";

function dayHourToStr(day_hour) {
  const military_hour = parseInt(day_hour.slice(11, 13));
  const suffix = military_hour >= 12 ? "pm" : "am";
  const hour = ((military_hour + 11) % 12) + 1;
  return hour + suffix;
}

function ScheduleTable(props) {
  const shifts = props.shifts;
  const hourCourtToTeam = Object.assign(
    {},
    ...shifts.map((shift) => ({
      [dayHourToStr(shift["start"]) + "-" + shift["court"]]: shift["team"],
    }))
  );
  const hours = shifts
    .map((shift) => dayHourToStr(shift["start"]))
    .filter((v, i, a) => a.indexOf(v) === i);
  const courts = shifts
    .map((shift) => shift["court"])
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div>
      <TableContainer>
        <Table style={{ tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" width="20px">
                Time
              </TableCell>
              {courts.map((court) => (
                <TableCell key={court} align="center" width="50px">
                  {court}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {hours.map((hour) => (
              <TableRow key={hour}>
                <TableCell align="center">{hour}</TableCell>
                {courts.map((court) => (
                  <TableCell key={court} align="center">
                    {hourCourtToTeam[hour + "-" + court] > 0
                      ? hourCourtToTeam[hour + "-" + court]
                      : ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default function SchedulePage(props) {
  const [shifts, setShifts] = useState([]);
  const [updated, setUpdated] = useState(false);
  const [date, setDate] = useState(getToday());

  useEffect(() => {
    fetch("/api/get-schedule?day=" + date, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setShifts(data))
      .then(() => setUpdated(false));
  }, [date, updated]);

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 2 }}>
        Schedule
      </Typography>
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
        <ScheduleTable shifts={shifts} date={date} setUpdated={setUpdated} />
      )}
    </div>
  );
}
