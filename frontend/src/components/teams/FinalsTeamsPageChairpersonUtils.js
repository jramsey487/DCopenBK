import React, { useState, useEffect } from "react";
import { useDrop } from "react-dnd";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";

import RemoveCircleOutline from "@mui/icons-material/RemoveCircleOutline";
import SwapVert from "@mui/icons-material/SwapVert";

import {
  getAuthHeader,
  Alerts,
  HideShowToggle,
  DraggableBallkidAndIcon,
  ConfirmDialog,
  HelpIcon,
} from "../Utils";
import { finalsTeams } from "../HelpMessages";
import { POSITIONS } from "../Consts";
import { Tooltip } from "@mui/material";

function Team({ team, assigned, setUpdated }) {
  const [clearOpen, setClearOpen] = useState(false);

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          finals_team: team,
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Grid item xs={12} sm={6} md={6} lg={6} xl={3} ref={dropRef}>
      <ConfirmDialog
        message={`You are about to clear Team ${team} and unassign all ${
          assigned.length
        } ballkid${assigned.length > 1 ? "s" : ""}.`}
        url={"/api/clear-team"}
        body={{
          finals_team: team,
        }}
        open={clearOpen}
        setOpen={setClearOpen}
        setUpdated={setUpdated}
      />

      <Card sx={{ mb: 2 }} elevation={isOver ? 10 : 1}>
        <CardContent>
          <div className="justify">
            <div className="sxs">
              <Typography variant="h6">{team}</Typography>
              <Typography variant="subtitle1" sx={{ ml: 1 }}>
                ({assigned.length})
              </Typography>
            </div>

            {assigned.length === 0 ? (
              ""
            ) : (
              <Button size="small" onClick={(e) => setClearOpen(true)}>
                Clear
              </Button>
            )}
          </div>

          {POSITIONS.map((position) => (
            <div key={position}>
              <Divider sx={{ my: 1 }} />
              <div className="sxs">
                <Typography variant="subtitle1">{position}s</Typography>
                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                  (
                  {
                    assigned.filter(
                      (ballkid) => ballkid.finals_position === position
                    ).length
                  }
                  )
                </Typography>
              </div>
              {renderBallkidsOnTeam(
                assigned.filter(
                  (ballkid) => ballkid.finals_position === position
                ),
                setUpdated
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

function renderBallkidsOnTeam(assigned, setUpdated) {
  return (
    <div>
      {assigned.map((ballkid) => (
        <div key={`ballkid${ballkid.id}`} className="justify">
          {<DraggableBallkidAndIcon ballkid={ballkid} />}

          <div className="sxs">
            {!ballkid.preferred_position.includes("/") ? (
              ""
            ) : (
              <Tooltip title="Switch">
                <IconButton
                  size="small"
                  sx={{ p: 0.5 }}
                  onClick={(e) => {
                    fetch("/api/update-ballkid", {
                      method: "PATCH",
                      headers: getAuthHeader(),
                      body: JSON.stringify({
                        first_name: ballkid.first_name,
                        last_name: ballkid.last_name,
                        finals_position:
                          ballkid.finals_position === "Back" ? "Net" : "Back",
                      }),
                    })
                      .then((response) => response.json())
                      .then(() => setUpdated(true));
                  }}
                >
                  <SwapVert color="secondary" />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Unassign">
              <IconButton
                size="small"
                sx={{ p: 0.5 }}
                onClick={(e) => {
                  fetch("/api/update-ballkid", {
                    method: "PATCH",
                    headers: getAuthHeader(),
                    body: JSON.stringify({
                      first_name: ballkid.first_name,
                      last_name: ballkid.last_name,
                      finals_team: "",
                    }),
                  })
                    .then((response) => response.json())
                    .then(() => setUpdated(true));
                }}
              >
                <RemoveCircleOutline color="primary" />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      ))}
    </div>
  );
}

export function renderTeams(assigned, teams, setUpdated) {
  return (
    <Grid container spacing={2}>
      {teams.map((team) => (
        <Team
          key={team}
          team={team}
          assigned={assigned.filter((ballkid) => ballkid.finals_team === team)}
          setUpdated={setUpdated}
        />
      ))}
    </Grid>
  );
}

export function Header() {
  const [tournament, setTournament] = useState();

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setTournament(data));
  });

  return tournament === null || tournament === undefined ? (
    ""
  ) : (
    <div>
      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />

      <div className="justify" sx={{ mb: 1 }}>
        <div className="sxs">
          <Typography variant="h4">Finals Teams</Typography>
          &thinsp;
          <HelpIcon page="Finals Teams" message={finalsTeams} />
        </div>

        <HideShowToggle
          teamType="finals"
          defaultShow={tournament["show_finals_teams"]}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </div>
    </div>
  );
}
