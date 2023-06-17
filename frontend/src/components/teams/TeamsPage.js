import React, { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";

import { getAuthHeader, Icons, isCurrentHour } from "../Utils";
import { dayHourToStr } from "../Utils";

function Team({ team, assigned, nextShifts }) {
  const positions = ["Net", "Back"];

  const hasAnotherShift = nextShifts.length > 0;
  const isCurrentlyOn =
    hasAnotherShift && isCurrentHour(nextShifts[0]["start"]);
  const court = hasAnotherShift ? nextShifts[0]["court"] : "";
  const time = hasAnotherShift ? dayHourToStr(nextShifts[0]["start"]) : "";

  return (
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <div className="justify">
            <div className="sxs">
              <Typography variant="h6">Team {team}</Typography>
              <Typography variant="subtitle1" sx={{ ml: 1 }}>
                ({assigned.length})
              </Typography>
            </div>
            <Typography variant="subtitle2">
              {!hasAnotherShift
                ? "No more shifts"
                : isCurrentlyOn
                ? `Currently on: ${court}`
                : `On at ${time}: ${court}`}
            </Typography>
          </div>

          {positions.map((position) => (
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
                  <div className="sxs" key={`ballkid${ballkid.id}`}>
                    <Link
                      variant="body2"
                      component={RouterLink}
                      to={`/ballkid/${ballkid.id}`}
                    >
                      {ballkid.first_name} {ballkid.last_name}
                    </Link>
                    &thinsp;
                    <Icons ballkid={ballkid} margin={0} />
                  </div>
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
      <Typography variant="h4" sx={{ mb: 2 }}>
        Current Teams
      </Typography>
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
