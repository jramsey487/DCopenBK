import React, { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";

import AspectRatio from "@mui/joy/AspectRatio";

import {
  Icons,
  LayoutButtons,
  getAuthHeader,
  RatingButton,
  getLocalStorage,
  useIsMobile,
  SearchAndFilter,
  filterBallkids,
} from "../Utils";

function getBallkidsToRender(ballkids, showUnrated, showTeam, myTeam) {
  const pk = getLocalStorage("ballkid_id");

  var ballkidsToRender = ballkids;
  ballkidsToRender = !showUnrated
    ? ballkidsToRender
    : ballkidsToRender.filter(
        (ballkid) => !ballkid.have_rated && ballkid.id !== pk
      );
  ballkidsToRender = !showTeam
    ? ballkidsToRender
    : ballkidsToRender.filter((ballkid) => ballkid.current_team === myTeam);

  return ballkidsToRender;
}

function BallkidsSection({ ballkids, gridLayout, setUpdated }) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();

  const isMobile = useIsMobile();
  const isChairperson = getLocalStorage("group") === "chairperson";
  const pk = getLocalStorage("ballkid_id");

  return ballkids.length === 0 ? (
    <Typography variant="body1">There are no ballkids to rate.</Typography>
  ) : (
    <Grid container spacing={gridLayout ? 2 : 1}>
      <SearchAndFilter
        setSearchKeyword={setSearchKeyword}
        filterGroup={filterGroup}
        setFilterGroup={setFilterGroup}
      />

      {filterBallkids(ballkids, searchKeyword, filterGroup).map((ballkid) => (
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
            <CardActionArea
              component={RouterLink}
              to={`/ballkid/${ballkid.id}`}
            >
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
                    {ballkid.id === getLocalStorage("ballkid_id") ? (
                      ""
                    ) : (
                      <RatingButton
                        ballkid={ballkid}
                        setUpdated={setUpdated}
                        isMobile={isMobile}
                      />
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
  const [myTeam, setMyTeam] = useState();

  const [showUnrated, setShowUnrated] = useState(false);
  const [showTeam, setShowTeam] = useState(true);
  const [updated, setUpdated] = useState(false);

  const [gridLayout, setGridLayout] = useState(
    getLocalStorage("gridLayout") ?? true
  );
  const pk = getLocalStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/list/" + pk, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => {
        setBallkids(data);
        setMyTeam(data.filter((ballkid) => ballkid.id === pk)[0].current_team);
      })
      .then(() => setUpdated(false));
  }, [pk, updated]);

  return (
    <div className="page">
      <div className="justify">
        <div className="sxs">
          <Typography variant="h4" sx={{ mb: 1 }}>
            Rate by Name
          </Typography>
        </div>
        <LayoutButtons gridLayout={gridLayout} setGridLayout={setGridLayout} />
      </div>

      <Grid container>
        <Grid item className="sxs" xs={12} md={6} lg={5} xl={4}>
          <Typography variant="body1">Show All Ballkids</Typography>
          <Switch
            checked={showUnrated}
            onClick={(e) => setShowUnrated(e.target.checked)}
          />
          <Typography variant="body1">Show Ballkids to Rate</Typography>
        </Grid>

        <Grid item className="sxs" xs={12} md={6} lg={5} xl={4}>
          <Typography variant="body1">Show All Teams</Typography>
          <Switch
            checked={showTeam}
            onClick={(e) => setShowTeam(e.target.checked)}
          />
          <Typography variant="body1">Show My Team Only</Typography>
        </Grid>
      </Grid>

      <BallkidsSection
        ballkids={getBallkidsToRender(ballkids, showUnrated, showTeam, myTeam)}
        gridLayout={gridLayout}
        setUpdated={setUpdated}
      />
    </div>
  );
}
