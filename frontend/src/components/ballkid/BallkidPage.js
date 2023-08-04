import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";

import AspectRatio from "@mui/joy/AspectRatio";
import { Icons, TournamentBanner, getAuthHeader, useIsMobile } from "../Utils";

export default function BallkidPage(props) {
  const [ballkid, setBallkid] = useState(null);
  const [showTeams, setShowTeams] = useState(false);

  const isMobile = useIsMobile();
  const { pk } = useParams();

  useEffect(() => {
    fetch("/api/get-ballkid/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkid(data));

    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setShowTeams(data["show_teams"]));
  }, [pk]);

  return ballkid == null ? (
    ""
  ) : (
    <div className="page">
      <TournamentBanner />

      <div className="sxs">
        <Typography variant="h4">
          {ballkid.first_name} {ballkid.last_name}
        </Typography>
        &ensp;
        <Icons ballkid={ballkid} margin={0} />
      </div>

      <Grid container>
        <Grid
          item
          xs={12}
          sm={4}
          md={3}
          lg={2}
          sx={{ pr: 2, pl: isMobile ? 2 : 0, mb: 1 }}
        >
          <AspectRatio ratio="1/1">
            <Box width="95%" component="img" src={"../" + ballkid.image} />
          </AspectRatio>
        </Grid>

        <Grid item xs={12} sm={8} md={9} lg={10}>
          <Typography variant="h6"> Info:</Typography>
          <Typography variant="body1">
            Years experience: {ballkid.num_years_experience}
          </Typography>
          <Typography variant="body1">
            Preferred position: {ballkid.preferred_position}
          </Typography>
          <br />
          {ballkid.is_cut || !ballkid.is_active || !showTeams ? (
            ""
          ) : (
            <div>
              <Typography variant="h6"> Current Info: </Typography>
              <Typography variant="body1">
                Position: {ballkid.position}
              </Typography>
              <Typography variant="body1">
                Current Team:{" "}
                {ballkid.current_team === 0
                  ? "Unassigned"
                  : ballkid.current_team}
              </Typography>
              <br />
            </div>
          )}
        </Grid>
      </Grid>
    </div>
  );
}
