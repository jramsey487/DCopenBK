import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";

import {
  LayoutButtons,
  getAuthHeader,
  RatingButton,
  getLocalStorage,
  BallkidCard,
  setLocalStorage,
  HelpIcon,
  Banners,
  getDay,
} from "../Utils";
import { MARGINS } from "../Consts";
import { rateByPastTeam } from "../HelpMessages";

// Date is the default date for which to give the ballkid a rating
function renderBallkid(ballkid, layout, setUpdated, date = null) {
  return ballkid === undefined || ballkid === null ? (
    ""
  ) : (
    <Grid
      item
      key={ballkid.id}
      xs={layout === "grid" ? 6 : 12}
      sm={layout === "grid" ? 4 : 12}
      md={layout === "grid" ? 3 : 12}
      lg={layout === "grid" ? 2 : 12}
      xl={layout === "grid" ? 1 : 12}
    >
      <BallkidCard
        ballkid={ballkid}
        renderAdditional={
          <Box textAlign="center" sx={{ mt: layout === "grid" ? 1 : 0 }}>
            <RatingButton
              ballkid={ballkid}
              setUpdated={setUpdated}
              date={date}
            />
            <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
              My total ratings:{" "}
              <Box fontWeight="fontWeightRegular" display="inline">
                {ballkid.num_my_ratings}
              </Box>
            </Typography>
          </Box>
        }
      />
    </Grid>
  );
}

export default function RateByPastTeamPage(props) {
  const [ballkids, setBallkids] = useState([]);
  const [unratedBallkids, setUnratedBallkids] = useState([]);
  const [pastTeams, setPastTeams] = useState({});
  const [updated, setUpdated] = useState(false);

  const [showUnrated, setShowUnrated] = useState(
    getLocalStorage("showUnrated") ?? false
  );
  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");
  const pk = getLocalStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/list/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setBallkids(data);
        setUnratedBallkids(
          data.filter(
            (ballkid) => ballkid.num_my_ratings === 0 && ballkid.id !== pk
          )
        );
      });

    fetch("/api/get-past-teams/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setPastTeams(data))
      .then(() => setUpdated(false));
  }, [pk, updated]);

  return (
    <div className="page">
      <Banners />

      <div className="justify">
        <Box className="sxs" sx={{ mb: 1 }}>
          <Typography variant="h4">Rate by Past Team</Typography>
          &thinsp;
          <HelpIcon page="Rate by Past Team" message={rateByPastTeam} />
        </Box>

        <LayoutButtons layout={layout} setLayout={setLayout} />
      </div>

      <div className="sxs">
        <Typography variant="body1">Show All Ballkids</Typography>
        <Switch
          checked={showUnrated}
          onClick={(e) => {
            setShowUnrated(e.target.checked);
            setLocalStorage("showUnrated", e.target.checked);
          }}
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

            <Grid container spacing={layout === "grid" ? 2 : 1}>
              {pastTeams[date].map((ballkidId) =>
                renderBallkid(
                  (showUnrated ? unratedBallkids : ballkids).find(
                    (ballkid) => ballkid.id === ballkidId
                  ),
                  layout,
                  setUpdated,
                  getDay(date)
                )
              )}
            </Grid>
          </div>
        ))
      )}
    </div>
  );
}
