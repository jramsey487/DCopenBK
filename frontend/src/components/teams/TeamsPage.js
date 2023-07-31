import React, { useState, useEffect } from "react";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";

import {
  CourtAssignment,
  getAuthHeader,
  isCurrentHour,
  BallkidAndIcon,
  HelpIcon,
  TournamentBanner,
} from "../Utils";
import { ON_COURT_GREEN, POSITIONS } from "../Consts";
import { Box } from "@mui/material";
import { teamsNonchairperson } from "../HelpMessages";

function Team({ team, assigned, nextShifts }) {
  const isCurrentlyOn =
    nextShifts.length > 0 && isCurrentHour(nextShifts[0]["start"]);

  return (
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
      <Card
        sx={{ mb: 2, backgroundColor: isCurrentlyOn ? ON_COURT_GREEN : "" }}
      >
        <CardContent>
          <div className="justify">
            <div className="sxs">
              <Typography variant="h6">Team {team}</Typography>
              <Typography variant="subtitle1" sx={{ ml: 1 }}>
                ({assigned.length})
              </Typography>
            </div>
            <CourtAssignment nextShifts={nextShifts} />
          </div>

          {POSITIONS.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1, mb: 1 }} />
              <div className="sxs">
                <Typography variant="subtitle1">{position}s</Typography>
                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                  (
                  {
                    assigned.filter((ballkid) => ballkid.position === position)
                      .length
                  }
                  )
                </Typography>
              </div>

              {assigned.map((ballkid) =>
                ballkid.current_team === team &&
                ballkid.position === position ? (
                  <BallkidAndIcon key={ballkid.id} ballkid={ballkid} />
                ) : (
                  ""
                )
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

export default function TeamsPage(props) {
  const [assigned, setAssigned] = useState([]);
  const [teams, setTeams] = useState([]);
  const [nextShifts, setNextShifts] = useState([]);
  const [showTeams, setShowTeams] = useState(false);

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
      });

    fetch("/api/calc-num-teams", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTeams(data["teams"]));

    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setShowTeams(data["show_teams"]));

    fetch("/api/get-next-shifts", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setNextShifts(data));
  }, []);

  return (
    <div className="page">
      <TournamentBanner />

      <Box className="sxs" sx={{ mb: 1 }}>
        <Typography variant="h4">Current Teams</Typography>
        &thinsp;
        <HelpIcon page="Teams" message={teamsNonchairperson} />
      </Box>

      {assigned.length > 0 && showTeams ? (
        <Grid container spacing={2}>
          {teams.map((team) => (
            <Team
              key={team}
              team={team}
              assigned={assigned.filter(
                (ballkid) => ballkid.current_team === team
              )}
              nextShifts={nextShifts.filter((shift) => shift.team === team)}
            />
          ))}
        </Grid>
      ) : (
        <Typography variant="body1">
          There are currently no teams assigned.
        </Typography>
      )}
    </div>
  );
}
