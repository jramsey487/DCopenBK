import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import Shortcut from "@mui/icons-material/Shortcut";
import AspectRatio from "@mui/joy/AspectRatio";

import {
  getAuthHeader,
  getLocalStorage,
  useIsMobile,
  Icons,
  Banners,
} from "../Utils";
import {
  renderBallkidCutHistory,
  FinalsHistoryTable,
  AggregateMetrics,
} from "./BallkidPageChairperson";
import { CheckinHistoryChart } from "./CheckinHistoryChart";
import { CaptainHistoryChart } from "./CaptainHistoryChart";
import { MARGINS } from "../Consts";

function RatingSection({ ballkid }) {
  const [params, setParams] = useState({});

  useEffect(() => {
    fetch(`/api/calibration-parameters/${ballkid.id}`, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setParams(data));
  }, [ballkid.id]);

  return !ballkid.is_captain ? (
    ""
  ) : (
    <Grid container>
      <Grid item xs={12}>
        <Typography variant="h6">Ratings:</Typography>
      </Grid>
      <Grid item xs={12} md={7} lg={6} sx={{ mx: 1 }}>
        <Button
          size="small"
          variant="outlined"
          component={RouterLink}
          to={"/my-ratings"}
          endIcon={<Shortcut />}
          sx={{ my: 1 }}
        >
          View all {params.num_rater_ratings} ratings by me
        </Button>

        <Typography variant="body1">
          Reviewer average: {Number(params.rater_raw_avg).toFixed(3)}
        </Typography>
        <Typography variant="body1">
          Reviewer standard deviation:{" "}
          {Number(params.rater_raw_stdev).toFixed(3)}
        </Typography>
      </Grid>
    </Grid>
  );
}

export default function MyProfile(props) {
  const [ballkid, setBallkid] = useState(null);
  const [showTeams, setShowTeams] = useState(false);

  const [cuts, setCuts] = useState([]);

  const [updated, setUpdated] = useState(false);

  const isMobile = useIsMobile();
  const pk = getLocalStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/get-ballkid/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkid(data))
      .then(() => setUpdated(false));

    fetch("/api/get-cut-history/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setCuts(data));

    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setShowTeams(data["show_teams"]))
      .then(() => setUpdated(false));
  }, [updated, pk]);

  return ballkid == null ? (
    ""
  ) : (
    <div className="page">
      <Banners />

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
          <Typography variant="body1"> Age: {ballkid.age} </Typography>
          <Typography variant="body1">
            Years experience: {ballkid.num_years_experience}
          </Typography>
          <Typography variant="body1">Phone number: {ballkid.phone}</Typography>
          <Typography variant="body1">
            Emergency contact name: {ballkid.emergency_name}
          </Typography>
          <Typography variant="body1">
            Emergency contact phone number: {ballkid.emergency_phone}
          </Typography>
          <Typography variant="body1">
            Preferred position: {ballkid.preferred_position}
          </Typography>
          <br />

          {ballkid.is_cut === "true" || !ballkid.is_active || !showTeams ? (
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

        {!ballkid.is_active ? (
          ""
        ) : (
          <div>
            <RatingSection ballkid={ballkid} />

            <Typography variant="h6" sx={MARGINS}>
              Analytics:
            </Typography>

            <AggregateMetrics pk={pk} />

            <Grid container>
              <Grid item xs={12} lg={5.5} sx={{ m: 2 }}>
                <CheckinHistoryChart pk={pk} />
              </Grid>

              <Grid item xs={12} lg={5.5} sx={{ m: 2 }}>
                <CaptainHistoryChart pk={pk} />
              </Grid>
            </Grid>
          </div>
        )}
      </Grid>
      <Grid container>
        <FinalsHistoryTable pk={pk} />
        {renderBallkidCutHistory(cuts)}
      </Grid>
    </div>
  );
}
