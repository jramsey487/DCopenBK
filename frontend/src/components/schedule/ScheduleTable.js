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

import Add from "@mui/icons-material/Add";
import KeyboardDoubleArrowDown from "@mui/icons-material/KeyboardDoubleArrowDown";
import KeyboardDoubleArrowUp from "@mui/icons-material/KeyboardDoubleArrowUp";
import Delete from "@mui/icons-material/Delete";

import { getAuthHeader, isCurrentHour, dayHourToStr } from "../Utils";
import { Tooltip } from "@mui/material";

function ActionIcons({ hour, setUpdated }) {
  return (
    <div>
      <Tooltip title="Shift Schedule Up">
        <IconButton
          sx={{ m: 0, p: 0 }}
          onClick={() => {
            fetch("/api/shift-schedule", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                direction: "up",
                hour: hour,
              }),
            })
              .then((response) => response.json())
              .then(() => setUpdated(true));
          }}
        >
          <KeyboardDoubleArrowUp color="primary" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Shift Schedule Down">
        <IconButton
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
          <KeyboardDoubleArrowDown color="primary" />
        </IconButton>
      </Tooltip>

      {/* <Tooltip title="Delete Hour">
        <IconButton
          onClick={() => {
            fetch("/api/delete-hour", {
              method: "DELETE",
              headers: getAuthHeader(),
              body: JSON.stringify({
                rain_delay: true,
                hour: hour,
              }),
            });
          }}
        >
          <Delete color="error" />
        </IconButton>
      </Tooltip> */}
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

export function ScheduleTable({ shifts, date, readOnly, setUpdated }) {
  console.log(shifts);

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
                  <TableCell align="center" width="10px"></TableCell>
                  <TableCell align="center" width="20px">
                    Time
                  </TableCell>
                  {courts.map((court) => (
                    <TableCell key={court} align="center" width="50px">
                      {readOnly ? (
                        court
                      ) : (
                        <CourtTextField
                          court={court}
                          date={date}
                          setUpdated={setUpdated}
                        />
                      )}
                    </TableCell>
                  ))}
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
                    <TableCell align="center">
                      <ActionIcons hour={hour} setUpdated={setUpdated} />
                    </TableCell>

                    <TableCell align="center">{dayHourToStr(hour)}</TableCell>
                    {courts.map((court) => {
                      const teamStr =
                        hourCourtToTeam[hour + "-" + court] > 0
                          ? hourCourtToTeam[hour + "-" + court]
                          : "";

                      return (
                        <TableCell key={court} align="center">
                          {teamStr}
                          {/* {readOnly ? (
                            teamStr
                          ) : (
                            <TeamTextField
                              teamStr={teamStr}
                              hour={hour}
                              court={court}
                              setUpdated={setUpdated}
                            />
                          )} */}
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
          {readOnly ? (
            ""
          ) : (
            <Tooltip title="Add Court">
              <IconButton
                sx={{ mt: 1 }}
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
                <Add />
              </IconButton>
            </Tooltip>
          )}
        </Grid>
      </Grid>

      {readOnly ? (
        ""
      ) : (
        <Tooltip title="Add Hour">
          <IconButton
            sx={{ mt: 1 }}
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
                .then((data) => setUpdated(true));
            }}
          >
            <Add />
          </IconButton>
        </Tooltip>
      )}
    </div>
  );
}
