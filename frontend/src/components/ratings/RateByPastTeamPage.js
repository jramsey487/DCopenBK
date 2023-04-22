import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  CardActionArea,
  Grid,
  Box,
} from "@mui/material";
import { AspectRatio } from "@mui/joy";
import {
  Icons,
  LayoutButtons,
  getAuthHeader,
  RatingButton,
  getSessionStorage,
} from "../Utils";
import { MARGINS } from "../Consts";

function renderBallkid(ballkid, gridLayout, setUpdated) {
  return (
    <Grid
      item
      key={ballkid.id}
      xs={gridLayout ? 4 : 12}
      sm={gridLayout ? 3 : 12}
      md={gridLayout ? 2 : 12}
      lg={gridLayout ? 2 : 12}
      xl={gridLayout ? 1 : 12}
    >
      <Card>
        <CardActionArea href={`ballkid/${ballkid.id}`}>
          {!gridLayout ? (
            ""
          ) : (
            <AspectRatio ratio="1/1">
              <CardMedia component="img" image={ballkid.image} />
            </AspectRatio>
          )}
          <CardContent>
            <div className={gridLayout ? "" : "justify"}>
              <div className={gridLayout ? "justify" : "sxs"}>
                <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                  {ballkid.first_name} {ballkid.last_name}
                </Typography>
                &thinsp;
                <Icons ballkid={ballkid} margin={0} />
              </div>
              <Box textAlign="center" sx={{ mt: gridLayout ? 1 : 0 }}>
                <RatingButton ballkid={ballkid} setUpdated={setUpdated} />
              </Box>
            </div>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  );
}

export default function RateByPastTeamPage(props) {
  const [ballkids, setBallkids] = useState([]);
  const [pastTeams, setPastTeams] = useState({});
  const [updated, setUpdated] = useState(false);
  const [gridLayout, setGridLayout] = useState(
    getSessionStorage("gridLayout") ?? true
  );

  const pk = getSessionStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/list/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(data));

    fetch("/api/get-past-teams/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setPastTeams(data))
      .then(() => setUpdated(false));
  }, [pk, updated]);

  return (
    <div className="page">
      <div className="justify">
        <Typography variant="h4" sx={{ mb: 1 }}>
          Rate by Past Team
        </Typography>
        <LayoutButtons gridLayout={gridLayout} setGridLayout={setGridLayout} />
      </div>

      {Object.keys(pastTeams).length === 0 ? (
        <Typography>There are no past teams to show.</Typography>
      ) : (
        Object.keys(pastTeams).map((key) => (
          <div key={key}>
            <Typography variant="h5" sx={MARGINS}>
              {key}
            </Typography>

            <Grid container spacing={gridLayout ? 2 : 1}>
              {pastTeams[key].map((ballkidId) =>
                renderBallkid(
                  ballkids.find((ballkid) => ballkid.id === ballkidId),
                  gridLayout,
                  setUpdated
                )
              )}
            </Grid>
          </div>
        ))
      )}
    </div>
  );
}
