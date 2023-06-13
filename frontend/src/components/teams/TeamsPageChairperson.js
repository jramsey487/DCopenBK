import React, { useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import Close from "@mui/icons-material/Close";

import {
  getAuthHeader,
  Icons,
  Alerts,
  SearchAndFilter,
  filterBallkids,
  HideShowToggle,
} from "../Utils";
import { MARGINS } from "../Consts";

function DraggableBallkidAndIcon(props) {
  const ballkid = props.ballkid;
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ballkid",
    item: { ...ballkid },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="sxs">
        <Link variant="body2" href={`ballkid/${ballkid.id}`}>
          {ballkid.first_name} {ballkid.last_name}
        </Link>
        &thinsp;
        <Icons ballkid={ballkid} margin={0} />
      </div>
    </div>
  );
}

function renderBallkidsOnTeam(assigned, teamNum, position, setUpdated) {
  return (
    <div>
      {assigned.map((ballkid) =>
        ballkid.current_team === teamNum && ballkid.position === position ? (
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
                        position: ballkid.position === "Back" ? "Net" : "Back",
                      }),
                    })
                      .then((response) => response.json())
                      .then(() => setUpdated(true));
                  }}
                >
                  Switch
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
                      current_team: 0,
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

export function Team({ team, assigned, setUpdated }) {
  const positions = ["Net", "Back"];

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          current_team: team,
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2} ref={dropRef}>
      <Card sx={{ mb: 2 }} elevation={isOver ? 10 : 1}>
        <CardContent>
          <div className="justify">
            <div className="sxs">
              <Typography variant="h6">Team {team}</Typography>
              <Typography variant="subtitle1">
                &ensp; (
                {
                  assigned.filter((ballkid) => ballkid.current_team === team)
                    .length
                }
                )
              </Typography>
            </div>
            <Button
              size="small"
              onClick={(e) => {
                fetch("/api/clear-team", {
                  method: "PATCH",
                  headers: getAuthHeader(),
                  body: JSON.stringify({
                    current_team: team,
                  }),
                })
                  .then((response) => response.json())
                  .then(() => setUpdated(true));
              }}
            >
              Clear
            </Button>
          </div>
          {positions.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1, mb: 1 }} />
              <Typography variant="subtitle1">{position}s:</Typography>
              {renderBallkidsOnTeam(assigned, team, position, setUpdated)}
            </div>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

function renderTeams(assigned, teams, setUpdated) {
  return assigned.length > 0 ? (
    <Grid container spacing={2}>
      {teams.map((team) => (
        <Team
          key={team}
          team={team}
          assigned={assigned}
          setUpdated={setUpdated}
        />
      ))}
    </Grid>
  ) : (
    <Typography variant="body1">
      There are currently no teams assigned.
    </Typography>
  );
}

function renderAssignButton(ballkid, buttonString, teamNum, setUpdated) {
  return (
    <Button
      key={teamNum}
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
            current_team: teamNum,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      {buttonString}
    </Button>
  );
}

function Unassigned({ unassigned, teams, setUpdated }) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          current_team: 0,
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
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

      {unassigned.length === 0 ? (
        <Typography variant="body1">
          There are currently no checked in ballkids who are unassigned.
        </Typography>
      ) : (
        <div>
          <SearchAndFilter
            setSearchKeyword={setSearchKeyword}
            filterGroup={filterGroup}
            setFilterGroup={setFilterGroup}
          />

          <TableContainer
            component={Paper}
            ref={dropRef}
            elevation={isOver ? 10 : 1}
          >
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
                          renderAssignButton(ballkid, team, team, setUpdated)
                        )}
                        {renderAssignButton(
                          ballkid,
                          "New Team",
                          teams.length + 1,
                          setUpdated
                        )}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}
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
        <Typography variant="h4">Current Teams</Typography>
        <HideShowToggle
          teamType=""
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </div>
    </div>
  );
}

export default function TeamsPageChairperson(props) {
  const [assigned, setAssigned] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [updated, setUpdated] = useState(false);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setAssigned(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === true && ballkid.current_team > 0
          )
        );
        setUnassigned(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === true && ballkid.current_team === 0
          )
        );
      });

    fetch("/api/calc-num-teams", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTeams(data["teams"]))
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
