import React, { useState } from "react";

import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";

import AddCircle from "@mui/icons-material/AddCircle";
import RemoveCircle from "@mui/icons-material/RemoveCircle";
import KeyboardDoubleArrowDown from "@mui/icons-material/KeyboardDoubleArrowDown";
import KeyboardDoubleArrowUp from "@mui/icons-material/KeyboardDoubleArrowUp";
import EventBusy from "@mui/icons-material/EventBusy";

import {
  getAuthHeader,
  isCurrentHour,
  dayHourToStr,
  ConfirmDialog,
} from "../Utils";
import { Tooltip } from "@mui/material";

function ShiftScheduleButtons({ hour, setUpdated }) {
  return (
    <div>
      <Tooltip title="Shift Schedule Up">
        <IconButton
          color="primary"
          sx={{ m: 0, p: 0 }}
          onClick={() =>
            fetch("/api/shift-schedule", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                direction: "up",
                hour: hour,
              }),
            })
              .then((response) => response.json())
              .then(() => setUpdated(true))
          }
        >
          <KeyboardDoubleArrowUp />
        </IconButton>
      </Tooltip>

      <Tooltip title="Shift Schedule Down">
        <IconButton
          color="primary"
          sx={{ m: 0, p: 0 }}
          onClick={() => {
            fetch("/api/shift-schedule", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                direction: "down",
                hour: hour,
              }),
            })
              .then((response) => response.json())
              .then(() => setUpdated(true));
          }}
        >
          <KeyboardDoubleArrowDown />
        </IconButton>
      </Tooltip>
    </div>
  );
}

function TeamTextField({ teamStr, hour, court, setUpdated }) {
  const [team, setTeam] = useState(teamStr);

  return (
    <TextField
      variant="standard"
      value={team}
      InputProps={{
        inputProps: {
          style: { textAlign: "center" },
        },
      }}
      style={{ width: 25 }}
      onChange={(e) => {
        setTeam(e.target.value);
        fetch("/api/update-schedule", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            hour: hour,
            court: court,
            team: e.target.value,
          }),
        })
          .then((response) => response.json())
          .then((data) => setUpdated(true));
      }}
    />
  );
}

function CourtTextField({ court, date, setUpdated }) {
  return (
    <TextField
      variant="standard"
      defaultValue={court}
      InputProps={{
        inputProps: {
          style: {
            textAlign: "center",
            fontSize: "14px",
            fontWeight: "bold",
          },
        },
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          fetch("/api/update-court-name", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              date: date,
              oldName: court,
              newName: e.target.value,
            }),
          })
            .then((response) => response.json())
            .then((data) => setUpdated(true));
        }
      }}
    />
  );
}

function AddCourtButton({ date, setUpdated }) {
  return (
    <Tooltip title="Add Court">
      <IconButton
        sx={{ mt: 1 }}
        color="primary"
        onClick={() => {
          fetch("/api/add-court", {
            method: "POST",
            headers: getAuthHeader(),
            body: JSON.stringify({
              date: date,
            }),
          })
            .then((response) => response.json())
            .then((data) => setUpdated(true));
        }}
      >
        <AddCircle />
      </IconButton>
    </Tooltip>
  );
}

function HourButtons({ date, courts, setUpdated }) {
  return (
    <div className="sxs">
      <Tooltip title="Add Hour">
        <IconButton
          sx={{ pl: 2, pr: 1, mt: 1 }}
          color="primary"
          onClick={(e) => {
            fetch("/api/add-hour", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                date: date,
                num_courts: courts.length,
              }),
            })
              .then((response) => response.json())
              .then(() => setUpdated(true));
          }}
        >
          <AddCircle />
        </IconButton>
      </Tooltip>

      <Tooltip title="Delete Last Hour">
        <IconButton
          sx={{ p: 0, mt: 1 }}
          color="primary"
          onClick={(e) => {
            fetch("/api/delete-hour", {
              method: "DELETE",
              headers: getAuthHeader(),
              body: JSON.stringify({
                date: date,
              }),
            })
              .then((response) => response.json())
              .then(() => setUpdated(true));
          }}
        >
          <RemoveCircle />
        </IconButton>
      </Tooltip>
    </div>
  );
}

function CourtHeading({ court, setUpdated }) {
  const [open, setOpen] = useState(false);

  return (
    <TableCell align="center" width="50px">
      <ConfirmDialog
        message={`You are about to end ${court} and unassign all teams from this court for future shifts.`}
        url="/api/end-court"
        body={{
          court: court,
        }}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
      />
      {court}
      <Tooltip title="End Court">
        <IconButton onClick={() => setOpen(true)}>
          <EventBusy fontSize="small" color="warning" />
        </IconButton>
      </Tooltip>
    </TableCell>
  );
}

export function ScheduleTable({ shifts, date, readOnly, editing, setUpdated }) {
  const hourCourtToTeam = Object.assign(
    {},
    ...shifts.map((shift) => ({
      [shift["start"] + "-" + shift["court"]]: shift["team"],
    }))
  );
  const hours = shifts
    .map((shift) => shift["start"])
    .filter((v, i, a) => a.indexOf(v) === i);
  const courts = shifts
    .map((shift) => shift["court"])
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div>
      <Grid container>
        <Grid item xs={11.5}>
          <TableContainer>
            <Table style={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  {readOnly ? (
                    ""
                  ) : (
                    <TableCell align="center" width="10px"></TableCell>
                  )}
                  <TableCell align="center" width="20px">
                    Time
                  </TableCell>
                  {courts.map((court) =>
                    readOnly ? (
                      <TableCell key={court} align="center" width="50px">
                        {court}
                      </TableCell>
                    ) : editing ? (
                      <TableCell key={court} align="center" width="50px">
                        <CourtTextField
                          court={court}
                          date={date}
                          setUpdated={setUpdated}
                        />
                      </TableCell>
                    ) : (
                      <CourtHeading
                        key={court}
                        court={court}
                        setUpdated={setUpdated}
                      />
                    )
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {hours.map((hour) => (
                  <TableRow
                    key={hour}
                    sx={{
                      backgroundColor: isCurrentHour(hour) ? "lightblue" : "",
                    }}
                  >
                    {readOnly ? (
                      ""
                    ) : (
                      <TableCell align="center">
                        {editing ? (
                          ""
                        ) : (
                          <ShiftScheduleButtons
                            hour={hour}
                            setUpdated={setUpdated}
                          />
                        )}
                      </TableCell>
                    )}

                    <TableCell align="center">{dayHourToStr(hour)}</TableCell>
                    {courts.map((court) => {
                      const teamStr =
                        hourCourtToTeam[hour + "-" + court] > 0
                          ? hourCourtToTeam[hour + "-" + court]
                          : "";

                      return (
                        <TableCell key={court} align="center">
                          {readOnly || !editing ? (
                            teamStr
                          ) : (
                            <TeamTextField
                              teamStr={teamStr}
                              hour={hour}
                              court={court}
                              setUpdated={setUpdated}
                            />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={0.5}>
          {readOnly || !editing ? (
            ""
          ) : (
            <AddCourtButton date={date} setUpdated={setUpdated} />
          )}
        </Grid>
      </Grid>

      {readOnly || !editing ? (
        ""
      ) : (
        <HourButtons date={date} courts={courts} setUpdated={setUpdated} />
      )}
    </div>
  );
}
