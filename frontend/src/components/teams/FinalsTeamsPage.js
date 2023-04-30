import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Link,
} from "@mui/material";
import { getAuthHeader, Icons } from "../Utils";
import { MATCH_TYPES } from "../Consts";

function Team(props) {
  const positions = ["Back", "Net"];

  return (
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <div className="justify">
            <Typography variant="h6">{props.team}</Typography>
          </div>
          {positions.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1, mb: 1 }} />
              <Typography variant="subtitle1">{position}s:</Typography>
              {props.assigned.map((ballkid) =>
                ballkid.finals_team === props.team &&
                ballkid.finals_position === position ? (
                  <div className="sxs" key={`ballkid${ballkid.id}`}>
                    <Link variant="body2" href={`ballkid/${ballkid.id}`}>
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

export default function FinalsTeamsPage(props) {
  const [assigned, setAssigned] = useState([]);
  const [showFinalsTeams, setShowFinalsTeams] = useState(false);

  const teams = Object.keys(MATCH_TYPES).map((key) => MATCH_TYPES[key]);

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) =>
        setAssigned(data.filter((ballkid) => ballkid.finals_team))
      );

    fetch("/api/show-finals-teams", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setShowFinalsTeams(data["show_finals_teams"]));
  }, []);

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 2 }}>
        Finals Teams
      </Typography>
      {assigned.length > 0 && showFinalsTeams ? (
        <Grid container spacing={2}>
          {teams.map((team) => (
            <Team key={team} team={team} assigned={assigned} />
          ))}
        </Grid>
      ) : (
        <Typography variant="body1">
          There are currently no finals teams assigned.
        </Typography>
      )}
    </div>
  );
}
