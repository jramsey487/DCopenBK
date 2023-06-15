import React from "react";

import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TextField from "@mui/material/TextField";

import Add from "@mui/icons-material/Add";

import { getAuthHeader, isCurrentHour, dayHourToStr } from "../Utils";

export function ScheduleTable({ shifts, date, readOnly, setUpdated }) {
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
              <TableRow
                key={hour}
                sx={{ backgroundColor: isCurrentHour(hour) ? "lightblue" : "" }}
              >
                <TableCell align="center">{dayHourToStr(hour)}</TableCell>
                {courts.map((court) => {
                  const teamStr =
                    hourCourtToTeam[hour + "-" + court] > 0
                      ? hourCourtToTeam[hour + "-" + court]
                      : "";

                  return (
                    <TableCell key={court} align="center">
                      {readOnly ? (
                        teamStr
                      ) : (
                        <TextField
                          variant="standard"
                          defaultValue={teamStr}
                          InputProps={{
                            inputProps: {
                              style: { textAlign: "center" },
                            },
                          }}
                          style={{ width: 25 }}
                          onChange={(e) =>
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
                              .then((data) => setUpdated(true))
                          }
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
      {readOnly ? (
        ""
      ) : (
        <IconButton
          sx={{ mt: 1 }}
          onClick={(e) => {
            fetch("/api/add-hour", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                day: date,
                num_courts: courts.length,
              }),
            })
              .then((response) => response.json())
              .then((data) => setUpdated(true));
          }}
        >
          <Add />
        </IconButton>
      )}
    </div>
  );
}
