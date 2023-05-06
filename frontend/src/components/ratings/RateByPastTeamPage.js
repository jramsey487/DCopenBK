import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  CardActionArea,
  Grid,
  Box,
  Switch,
} from "@mui/material";
import { AspectRatio } from "@mui/joy";
import {
  Icons,
  LayoutButtons,
  getAuthHeader,
  RatingButton,
  getLocalStorage,
} from "../Utils";
import { MARGINS } from "../Consts";

function renderBallkid(ballkid, gridLayout, setUpdated) {
  return ballkid === undefined || ballkid === null ? (
    ""
  ) : (
    <Grid
      item
      key={ballkid.id}
      xs={gridLayout ? 6 : 12}
      sm={gridLayout ? 4 : 12}
      md={gridLayout ? 3 : 12}
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
  const [unratedBallkids, setUnratedBallkids] = useState([]);
  const [pastTeams, setPastTeams] = useState({});
  const [updated, setUpdated] = useState(false);
  const [showAll, setShowAll] = useState(true);

  const [gridLayout, setGridLayout] = useState(
    getLocalStorage("gridLayout") ?? true
  );
  const pk = getLocalStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/list/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setBallkids(data);
        setUnratedBallkids(
          data.filter((ballkid) => !ballkid.have_rated && ballkid.id !== pk)
        );
      });

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

      <div className="sxs">
        <Typography variant="body1">Show All Ballkids</Typography>
        <Switch
          checked={!showAll}
          onClick={(e) => setShowAll(!e.target.checked)}
        />
        <Typography variant="body1">Show Ballkids to Rate</Typography>
      </div>

      {Object.keys(pastTeams).length === 0 ? (
        <Typography>There are no past teams to show.</Typography>
      ) : (
        Object.keys(pastTeams).map((date) => (
          <div key={date}>
            <Typography variant="h5" sx={MARGINS}>
              {date}
            </Typography>

            <Grid container spacing={gridLayout ? 2 : 1}>
              {pastTeams[date].map((ballkidId) =>
                renderBallkid(
                  (showAll ? ballkids : unratedBallkids).find(
                    (ballkid) => ballkid.id === ballkidId
                  ),
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
