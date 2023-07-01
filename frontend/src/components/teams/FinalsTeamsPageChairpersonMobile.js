import React, { useState, useEffect } from "react";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import Close from "@mui/icons-material/Close";
import SwapVert from "@mui/icons-material/SwapVert";

import {
  getAuthHeader,
  Alerts,
  filterBallkids,
  SearchAndFilter,
  HideShowToggle,
  DraggableBallkidAndIcon,
} from "../Utils";
import { MATCH_TYPES, MARGINS } from "../Consts";

function Team({ team, assigned, setUpdated }) {
  const positions = ["Net", "Back"];

  return (
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
      <Card sx={{ mb: 2 }} elevation={1}>
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
              <Button
                size="small"
                onClick={(e) => {
                  fetch("/api/clear-team", {
                    method: "PATCH",
                    headers: getAuthHeader(),
                    body: JSON.stringify({
                      finals_team: team,
                    }),
                  })
                    .then((response) => response.json())
                    .then(() => setUpdated(true));
                }}
              >
                Clear
              </Button>
            )}
          </div>
          {positions.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1, mb: 1 }} />
              <div className="sxs">
                <Typography variant="subtitle1">{position}s</Typography>
                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                  (
                  {
                    assigned.filter(
                      (ballkid) =>
                        ballkid.finals_team === team &&
                        ballkid.finals_position === position
                    ).length
                  }
                  )
                </Typography>
              </div>
              {renderBallkidsOnTeam(assigned, team, position, setUpdated)}
            </div>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

function renderBallkidsOnTeam(assigned, team, position, setUpdated) {
  return (
    <div>
      {assigned.map((ballkid) =>
        ballkid.finals_team === team && ballkid.finals_position === position ? (
          <div key={`ballkid${ballkid.id}`} className="justify">
            {<DraggableBallkidAndIcon ballkid={ballkid} />}
            <div className="sxs">
              {ballkid.preferred_position.includes("/") ? (
                <Button
                  variant="outlined"
                  size="small"
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
                  sx={{ minWidth: 0 }}
                >
                  <SwapVert />
                </Button>
              ) : (
                ""
              )}
              <IconButton
                size="small"
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
                <Close />
              </IconButton>
            </div>
          </div>
        ) : (
          ""
        )
      )}
    </div>
  );
}

function renderTeams(assigned, teams, setUpdated) {
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

function renderAssignButton(ballkid, team, setUpdated) {
  return (
    <Button
      key={team}
      sx={{ m: 0.2 }}
      size="small"
      variant="outlined"
      onClick={(e) => {
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
          .then(() => setUpdated(true));
      }}
    >
      {team}
    </Button>
  );
}

function Unassigned({ unassigned, teams, setUpdated }) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();

  return unassigned.length === 0 ? (
    ""
  ) : (
    <div>
      <div className="sxs">
        <Typography variant="h5" sx={MARGINS}>
          Unassigned
        </Typography>
        <Typography variant="h6" sx={MARGINS}>
          &ensp; (
          {filterBallkids(unassigned, searchKeyword, filterGroup).length})
        </Typography>
      </div>

      <SearchAndFilter
        setSearchKeyword={setSearchKeyword}
        filterGroup={filterGroup}
        setFilterGroup={setFilterGroup}
      />

      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Preferred Position</TableCell>
              <TableCell align="right">Assign To Team</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filterBallkids(unassigned, searchKeyword, filterGroup).map(
              (ballkid) => (
                <TableRow key={ballkid.id}>
                  <TableCell component="th" scope="row">
                    {<DraggableBallkidAndIcon ballkid={ballkid} />}
                  </TableCell>
                  <TableCell>{ballkid.preferred_position}</TableCell>
                  <TableCell align="right">
                    {teams.map((team) =>
                      renderAssignButton(ballkid, team, setUpdated)
                    )}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

function Header() {
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <div>
      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />
      <div className="justify" style={{ marginBottom: 10 }}>
        <Typography variant="h4">Finals Teams</Typography>
        <HideShowToggle
          teamType="finals"
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </div>
    </div>
  );
}

export default function FinalsTeamsPageChairpersonMobile(props) {
  const [assigned, setAssigned] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [updated, setUpdated] = useState(false);

  const teams = Object.keys(MATCH_TYPES).map((key) => MATCH_TYPES[key]);

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setAssigned(data.filter((ballkid) => ballkid.finals_team));
        setUnassigned(data.filter((ballkid) => !ballkid.finals_team));
      })
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page">
      <Header />
      {renderTeams(assigned, teams, setUpdated)}
      <Unassigned
        unassigned={unassigned}
        teams={teams}
        setUpdated={setUpdated}
      />
    </div>
  );
}
