import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Link,
} from "@mui/material";
import { Icons, getAuthHeader, RatingButton, getLocalStorage } from "../Utils";

function Team(props) {
  const positions = ["Back", "Net"];

  return (
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Team {props.team}</Typography>
          {positions.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1, mb: 1 }} />

              <Typography variant="subtitle1">{position}s:</Typography>

              {props.assigned.map((ballkid) =>
                ballkid.current_team === props.team &&
                ballkid.position === position ? (
                  <div className="justify" key={`ballkid${ballkid.id}`}>
                    <div className="sxs">
                      <Link variant="body2" href={`ballkid/${ballkid.id}`}>
                        {ballkid.first_name} {ballkid.last_name}
                      </Link>
                      &thinsp;
                      <Icons ballkid={ballkid} margin={0} />
                    </div>

                    {ballkid.id === getLocalStorage("ballkid_id") ? (
                      ""
                    ) : (
                      <RatingButton
                        ballkid={ballkid}
                        setUpdated={props.setUpdated}
                      />
                    )}
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

export default function RateByTeamPage(props) {
  const [assigned, setAssigned] = useState([]);
  const [teams, setTeams] = useState([]);
  const [updated, setUpdated] = useState(false);
  const pk = getLocalStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/sorted-list/" + pk, { headers: getAuthHeader() })
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
      .then((data) => setTeams(data["teams"]))
      .then(() => setUpdated(false));
  }, [pk, updated]);

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 1 }}>
        Rate by Current Team
      </Typography>
      {assigned.length === 0 ? (
        <Typography>There are currently no teams assigned.</Typography>
      ) : (
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
      )}
    </div>
  );
}
