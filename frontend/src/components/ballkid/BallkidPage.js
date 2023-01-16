import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Typography, Grid, Box } from "@mui/material";
import { getAuthHeader, getSessionStorage, RatingButton } from "../Utils";

export default function BallkidPage(props) {
  const [ballkid, setBallkid] = useState(null);
  const [updated, setUpdated] = useState(false);

  const group = getSessionStorage("group");
  const { pk } = useParams();

  useEffect(() => {
    fetch("/api/get-ballkid/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkid(data))
      .then(() => setUpdated(false));
  }, [updated]);

  return ballkid == null ? (
    ""
  ) : (
    <div className="page">
      <div className="justify">
        <Typography variant="h4">
          {ballkid.first_name} {ballkid.last_name}
        </Typography>
        {group == "captain" ? <RatingButton ballkid={ballkid} /> : ""}
      </div>

      <Grid container>
        <Grid item xs={4} md={3} lg={2}>
          <Box width="95%" component="img" src={"../" + ballkid.image} />
        </Grid>

        <Grid item xs={8} md={9} lg={10}>
          <Typography variant="h6"> Info:</Typography>
          <Typography variant="body1"> Age: {ballkid.age} </Typography>
          <Typography variant="body1">
            Years experience: {ballkid.num_years_experience}
          </Typography>
          <Typography variant="body1">
            Preferred position: {ballkid.preferred_position}
          </Typography>
          <br />
          {(ballkid.is_cut == "true") | !ballkid.is_active ? (
            ""
          ) : (
            <div>
              <Typography variant="h6"> Current Info: </Typography>
              <Typography variant="body1">
                Position: {ballkid.position}
              </Typography>
              <Typography variant="body1">
                Current Team:{" "}
                {ballkid.current_team == 0
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
