import React, { useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  IconButton,
  Button,
  Link,
  Table,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Switch,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { getAuthHeader, Icons, Alerts } from "../Utils";

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

export function Team(props) {
  const positions = ["Back", "Net"];

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          current_team: props.team,
        }),
      })
        .then((response) => response.json())
        .then(() => props.setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2} ref={dropRef}>
      <Card sx={{ mb: 2 }} elevation={isOver ? 10 : 1}>
        <CardContent>
          <div className="justify">
            <Typography variant="h6">Team {props.team}</Typography>
            <Button
              size="small"
              onClick={(e) => {
                fetch("/api/clear-team", {
                  method: "PATCH",
                  headers: getAuthHeader(),
                  body: JSON.stringify({
                    current_team: props.team,
                  }),
                })
                  .then((response) => response.json())
                  .then(() => props.setUpdated(true));
              }}
            >
              Clear
            </Button>
          </div>
          {positions.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1, mb: 1 }} />
              <Typography variant="subtitle1">{position}s:</Typography>
              {renderBallkidsOnTeam(
                props.assigned,
                props.team,
                position,
                props.setUpdated
              )}
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

function Unassigned(props) {
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
        .then(() => props.setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return props.unassigned.length === 0 ? (
    ""
  ) : (
    <div>
      <Typography variant="h5" sx={{ mt: 2, mb: 2 }}>
        Unassigned
      </Typography>
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
            {props.unassigned.map((ballkid) => (
              <TableRow key={ballkid.id}>
                <TableCell component="th" scope="row">
                  {<DraggableBallkidAndIcon ballkid={ballkid} />}
                </TableCell>
                <TableCell>{ballkid.preferred_position}</TableCell>
                <TableCell align="right">
                  {props.teams.map((team) =>
                    renderAssignButton(ballkid, team, team, props.setUpdated)
                  )}
                  {renderAssignButton(
                    ballkid,
                    "New Team",
                    props.teams.length + 1,
                    props.setUpdated
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

function Header(props) {
  const [showTeams, setShowTeams] = useState(null);
  const showMessage = "Teams are now visible to ballkids and captains.";
  const hideMessage = "Teams are now hidden from ballkids and captains.";

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/show-teams", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setShowTeams(data["show_teams"]));
  }, []);

  return showTeams == null ? (
    <Typography variant="h4" sx={{ mb: 1 }}>
      Current Teams
    </Typography>
  ) : (
    <div>
      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />
      <div className="justify" style={{ marginBottom: 10 }}>
        <Typography variant="h4">Current Teams</Typography>
        <div className="sxs">
          <Typography variant="body1">Hide</Typography>
          <Switch
            defaultChecked={showTeams}
            onClick={(e) => {
              fetch("/api/show-teams", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  show_teams: e.target.checked,
                }),
              }).then((response) => {
                if (response.ok) {
                  setSuccessMsg(e.target.checked ? showMessage : hideMessage);
                } else {
                  setErrorMsg("Team visibility setting not updated.");
                }
              });
            }}
          />
          <Typography variant="body1">Show</Typography>
        </div>
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
