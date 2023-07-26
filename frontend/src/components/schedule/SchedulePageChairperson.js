import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import DialogContentText from "@mui/material/DialogContentText";

import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { ScheduleTable } from "./ScheduleTable";
import { getAuthHeader, getToday, ConfirmDialog, HelpIcon } from "../Utils";

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
                  date: date,
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

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const helpMessage = (
    <DialogContentText>
      This page displays the schedule for the selected date.
      <br /> <br />
      If there are no shifts found for the selected date, you can create a
      default schedule based on the inputted parameters.
      <br /> <br />
      If there are shifts found for the selected date, you can view and edit the
      teams assigned to which courts at which hour. To edit a team assignment,
      simply change the team number in the text field of the corresponding cell.
      Any team assignment changes auto-save. You can also add hours to the
      schedule
    </DialogContentText>
  );

  useEffect(() => {
    fetch(`/api/get-schedule?date=${date}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setShifts(data))
      .then(() => setUpdated(false));
  }, [date, updated]);

  return (
    <div className="page">
      <ConfirmDialog
        message={`You are about to delete the schedule for ${date}. This action cannot be
        undone.`}
        url={`/api/delete-schedule?date=${date}`}
        body={JSON.stringify({
          date: date,
        })}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
        method="DELETE"
      />

      <div className="sxs" sx={{ mb: 2 }}>
        <Typography variant="h4">Schedule</Typography>
        &thinsp;
        <HelpIcon page="Schedule" message={helpMessage} />
      </div>

      <Box className="justify" sx={{ mb: 2 }}>
        <Box className="sxs">
          <Typography variant="body1">
            Showing schedule for: &thinsp;
          </Typography>
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
          ""
        ) : (
          <div className="sxs" style={{ float: "right" }}>
            <Button
              variant="outlined"
              sx={{ m: 1 }}
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Save Schedule" : "Edit Schedule"}
            </Button>

            <Button
              variant="contained"
              color="error"
              onClick={() => setOpen(true)}
            >
              Delete Schedule
            </Button>
          </div>
        )}
      </Box>

      {shifts.length === 0 ? (
        <CreateSchedule date={date} setUpdated={setUpdated} />
      ) : (
        <ScheduleTable
          shifts={shifts}
          date={date}
          readOnly={false}
          editing={editing}
          setUpdated={setUpdated}
        />
      )}
    </div>
  );
}
