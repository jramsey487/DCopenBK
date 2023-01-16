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
import { MATCH_TYPES } from "../Consts";

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

function Team(props) {
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
          finals_team: props.team,
        }),
      })
        .then((response) => response.json())
        .then(() => props.setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Grid item xs={6} sm={6} md={4} lg={3} xl={2} ref={dropRef}>
      <Card sx={{ mb: 2 }} elevation={isOver ? 10 : 1}>
        <CardContent>
          <div className="justify">
            <Typography variant="h6">{props.team}</Typography>
            <Button
              size="small"
              onClick={(e) => {
                fetch("/api/clear-finals-team", {
                  method: "PATCH",
                  headers: getAuthHeader(),
                  body: JSON.stringify({
                    finals_team: props.team,
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

function renderBallkidsOnTeam(assigned, team, position, setUpdated) {
  return (
    <div>
      {assigned.map((ballkid) =>
        ballkid.finals_team == team && ballkid.finals_position == position ? (
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
                          ballkid.finals_position == "Back" ? "Net" : "Back",
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
          assigned={assigned}
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
          finals_team: "",
        }),
      })
        .then((response) => response.json())
        .then(() => props.setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return props.unassigned.length == 0 ? (
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
                    renderAssignButton(ballkid, team, props.setUpdated)
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
  const [showFinalsTeams, setShowFinalsTeams] = useState(null);
  const showMessage = "Finals teams are now visible to ballkids and captains.";
  const hideMessage = "Finals teams are now hidden from ballkids and captains.";

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/show-finals-teams", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setShowFinalsTeams(data["show_finals_teams"]));
  }, []);

  return showFinalsTeams == null ? (
    <Typography variant="h4" sx={{ mb: 1 }}>
      Finals Teams
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
        <Typography variant="h4">Finals Teams</Typography>
        <div className="sxs">
          <Typography variant="body1">Hide</Typography>
          <Switch
            defaultChecked={showFinalsTeams}
            onClick={(e) => {
              fetch("/api/show-finals-teams", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  show_finals_teams: e.target.checked,
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

export default function FinalsTeamsPageChairperson(props) {
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
