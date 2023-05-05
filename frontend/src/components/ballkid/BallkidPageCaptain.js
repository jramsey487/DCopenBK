import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Typography, Grid, Box, Button, Link } from "@mui/material";
import { Shortcut } from "@mui/icons-material";
import { AspectRatio } from "@mui/joy";
import {
  Icons,
  getAuthHeader,
  RatingButton,
  getSessionStorage,
  useIsMobile,
} from "../Utils";

export default function BallkidPageCaptain(props) {
  const [ballkid, setBallkid] = useState(null);
  const [updated, setUpdated] = useState(false);

  const isMobile = useIsMobile();
  const { pk } = useParams();

  useEffect(() => {
    fetch(`/api/get-ballkid/${pk}/${getSessionStorage("ballkid_id")}`, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setBallkid(data))
      .then(() => setUpdated(false));
  }, [updated, pk]);

  return ballkid == null ? (
    ""
  ) : (
    <div className="page">
      <div className={isMobile ? "" : "justify"}>
        <div className="sxs">
          <Typography variant="h4">
            {ballkid.first_name} {ballkid.last_name}
          </Typography>
          &ensp;
          <Icons ballkid={ballkid} margin={0} />
        </div>

        {ballkid.id === getSessionStorage("ballkid_id") ? (
          ""
        ) : (
          <RatingButton
            ballkid={ballkid}
            setUpdated={setUpdated}
            isMobile={isMobile}
          />
        )}
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
          <Typography variant="body1"> Age: {ballkid.age} </Typography>
          <Typography variant="body1">
            Years experience: {ballkid.num_years_experience}
          </Typography>
          <Typography variant="body1">
            Preferred position: {ballkid.preferred_position}
          </Typography>
          <br />

          {(ballkid.is_cut === "true") | !ballkid.is_active ? (
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

              <Typography variant="h6">Ratings:</Typography>
              <Button
                size="small"
                variant="outlined"
                component={Link}
                href={`/my-ratings?ratee=${ballkid.id}`}
                endIcon={<Shortcut />}
                sx={{ my: 1 }}
              >
                View my ratings for this ballkid
              </Button>
            </div>
          )}
        </Grid>
      </Grid>
    </div>
  );
}
