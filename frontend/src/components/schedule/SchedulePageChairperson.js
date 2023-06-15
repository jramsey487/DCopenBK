import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";

import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { ScheduleTable } from "./ScheduleTable";
import { getAuthHeader, getToday } from "../Utils";

function CreateSchedule({ date, setUpdated }) {
  const [numCourts, setNumCourts] = useState(5);
  const [numTeams, setNumTeams] = useState(10);
  const [startHour, setStartHour] = useState("12:00");
  const [numHours, setNumHours] = useState(12);

  const minWidth = 250;

  return (
    <div>
      <Typography variant="body1">No schedule found.</Typography>

      <Grid
        container
        spacing={2}
        alignItems="center"
        direction="column"
        justifyContent="center"
      >
        <Grid item>
          <Typography variant="h6" sx={{ mt: 2 }}>
            Create Day's Schedule
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <TextField
            id="start"
            label="Start Time of Matches"
            variant="standard"
            type="time"
            required={true}
            defaultValue="12:00"
            style={{ minWidth: minWidth }}
            onChange={(e) => setStartHour(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            id="numCourts"
            label="Number of Courts Running"
            variant="standard"
            type="number"
            defaultValue={5}
            required={true}
            style={{ minWidth: minWidth }}
            onChange={(e) => setNumCourts(parseInt(e.target.value))}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            id="numTeams"
            label="Number of Ballkid Teams"
            variant="standard"
            type="number"
            defaultValue={10}
            required={true}
            style={{ minWidth: minWidth }}
            onChange={(e) => setNumTeams(parseInt(e.target.value))}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            id="numHours"
            label="Number of Hours"
            variant="standard"
            type="number"
            defaultValue={12}
            required={true}
            style={{ minWidth: minWidth }}
            onChange={(e) => setNumHours(parseInt(e.target.value))}
          />
        </Grid>

        <Grid item xs={12}>
          <Button
            color="primary"
            variant="contained"
            onClick={(e) => {
              fetch("/api/create-schedule", {
                method: "POST",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  day: date,
                  start_hour: startHour,
                  num_courts: numCourts,
                  num_hours: numHours,
                  num_teams: numTeams,
                }),
              })
                .then((response) => response.json())
                .then((data) => setUpdated(true));
            }}
          >
            Create Schedule
          </Button>
        </Grid>
      </Grid>
    </div>
  );
}

export default function SchedulePageChairperson(props) {
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
        <CreateSchedule date={date} setUpdated={setUpdated} />
      ) : (
        <ScheduleTable
          shifts={shifts}
          date={date}
          readOnly={false}
          setUpdated={setUpdated}
        />
      )}
    </div>
  );
}
