import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  CardActionArea,
  Switch,
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

function renderBallkids(ballkids, gridLayout, setUpdated) {
  const isChairperson = getSessionStorage("group") === "chairperson";

  return ballkids.length === 0 ? (
    <Typography variant="body1">There are no ballkids to rate.</Typography>
  ) : (
    <Grid container spacing={gridLayout ? 2 : 1}>
      {ballkids.map((ballkid) => (
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
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: "medium" }}
                    >
                      {ballkid.first_name} {ballkid.last_name}
                    </Typography>
                    &thinsp;
                    <Icons ballkid={ballkid} margin={0} />
                  </div>

                  <Box textAlign="center" sx={{ mt: gridLayout ? 1 : 0 }}>
                    {ballkid.id === getSessionStorage("ballkid_id") ? (
                      ""
                    ) : (
                      <RatingButton ballkid={ballkid} setUpdated={setUpdated} />
                    )}

                    {isChairperson ? (
                      <Typography
                        variant="subtitle2"
                        sx={{ mt: gridLayout ? 0.5 : 0 }}
                      >
                        Total ratings: {ballkid.num_ratings}
                      </Typography>
                    ) : (
                      ""
                    )}
                  </Box>
                </div>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export default function RateByNamePage(props) {
  const [ballkids, setBallkids] = useState([]);
  const [unratedBallkids, setUnratedBallkids] = useState([]);
  const [showAll, setShowAll] = useState(true);
  const [updated, setUpdated] = useState(false);

  const [gridLayout, setGridLayout] = useState(
    getSessionStorage("gridLayout") ?? true
  );
  const pk = getSessionStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/list/" + pk, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => {
        setBallkids(data);
        setUnratedBallkids(
          data.filter((ballkid) => !ballkid.have_rated && ballkid.id !== pk)
        );
      })
      .then(() => setUpdated(false));
  }, [pk, updated]);

  return (
    <div className="page">
      <div className="justify">
        <Typography variant="h4" sx={{ mb: 1 }}>
          Rate by Name
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

      {showAll
        ? renderBallkids(ballkids, gridLayout, setUpdated)
        : renderBallkids(unratedBallkids, gridLayout, setUpdated)}
    </div>
  );
}
