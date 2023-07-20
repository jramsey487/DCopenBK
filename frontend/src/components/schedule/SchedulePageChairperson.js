import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";

import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { ScheduleTable } from "./ScheduleTable";
import { getAuthHeader, getToday, Alerts, HelpIcon } from "../Utils";

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

function ConfirmDeleteScheduleDialog({ date, open, setOpen, setUpdated }) {
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>Confirm Delete Schedule</DialogTitle>
      <DialogContent>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />

        <DialogContentText>
          You are about to delete the schedule for {date}. This action cannot be
          undone. Do you wish to proceed?
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() =>
            fetch(`/api/delete-schedule?date=${date}`, {
              method: "DELETE",
              headers: getAuthHeader(),
              body: JSON.stringify({
                date: date,
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Schedule deleted!");
                setTimeout(() => {
                  setOpen(false);
                  setSuccessMsg("");
                  setUpdated(true);
                }, 2000);
              } else {
                setErrorMsg("Error deleting schedule.");
              }
            })
          }
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SchedulePageChairperson(props) {
  const [shifts, setShifts] = useState([]);
  const [updated, setUpdated] = useState(false);
  const [date, setDate] = useState(getToday());

  const [open, setOpen] = useState(false);

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
      <ConfirmDeleteScheduleDialog
        date={date}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
      />

      <div className="sxs" sx={{ mb: 2 }}>
        <Typography variant="h4">Schedule</Typography>
        &thinsp;
        <HelpIcon page="Schedule" message={helpMessage} />
      </div>

      <Box className="justify">
        <Box className="sxs" sx={{ mb: 2 }}>
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
          <Button
            variant="contained"
            color="error"
            onClick={() => setOpen(true)}
          >
            Delete Schedule
          </Button>
        )}
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
