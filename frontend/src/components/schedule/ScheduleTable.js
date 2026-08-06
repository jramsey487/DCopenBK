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
  isCurrentScheduleSlot,
  isHalfHourSlot,
  dayHourToStr,
  ConfirmDialog,
} from "../Utils";
import { Tooltip } from "@mui/material";
import "./schedule-table.css";

function ShiftScheduleButtons({ hour, setUpdated }) {
  return (
    <div>
      <Tooltip title="Shift schedule up by 30 minutes">
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

      <Tooltip title="Shift schedule down by 30 minutes">
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
      className="schedule-table-team-input"
      variant="outlined"
      size="small"
      value={team}
      inputProps={{
        inputMode: "numeric",
        "aria-label": `Team for ${court} at this time`,
      }}
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
      className="schedule-table-court-input"
      variant="outlined"
      size="small"
      defaultValue={court}
      inputProps={{
        "aria-label": "Court name",
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
    <div
      className={`schedule-table${editing ? " schedule-table--editing" : ""}${
        readOnly ? " schedule-table--readonly" : ""
      }`}
    >
      <Grid container className="schedule-table-grid">
        <Grid item xs={11.5} className="schedule-table-main">
          <TableContainer className="schedule-table-container">
            <Table className="schedule-table-grid-inner" style={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  {readOnly ? (
                    ""
                  ) : (
                    <TableCell align="center" className="schedule-table-col-shift" />
                  )}
                  <TableCell align="center" className="schedule-table-col-time">
                    Time
                  </TableCell>
                  {courts.map((court) =>
                    readOnly ? (
                      <TableCell
                        key={court}
                        align="center"
                        className="schedule-table-col-court"
                      >
                        {court}
                      </TableCell>
                    ) : editing ? (
                      <TableCell
                        key={court}
                        align="center"
                        className="schedule-table-col-court"
                      >
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
                    className={[
                      isHalfHourSlot(hour) ? "schedule-row--half" : "",
                      isCurrentScheduleSlot(hour) ? "schedule-row--current" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {readOnly ? (
                      ""
                    ) : (
                      <TableCell align="center" className="schedule-table-col-shift">
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

                    <TableCell align="center" className="schedule-table-col-time">
                      {dayHourToStr(hour, isHalfHourSlot(hour))}
                    </TableCell>
                    {courts.map((court) => {
                      const teamStr =
                        hourCourtToTeam[hour + "-" + court] > 0
                          ? hourCourtToTeam[hour + "-" + court]
                          : "";

                      return (
                        <TableCell
                          key={court}
                          align="center"
                          className="schedule-table-col-court"
                        >
                          {readOnly || !editing ? (
                            teamStr ? (
                              <span className={`chip t${teamStr} schedule-table-team-chip`}>
                                {teamStr}
                              </span>
                            ) : (
                              <span className="schedule-table-empty-cell">—</span>
                            )
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

        <Grid item xs={0.5} className="schedule-table-side">
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
        <div className="schedule-table-hour-actions">
          <HourButtons date={date} courts={courts} setUpdated={setUpdated} />
        </div>
      )}
    </div>
  );
}
