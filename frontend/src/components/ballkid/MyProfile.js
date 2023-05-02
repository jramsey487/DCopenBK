import React, { useEffect, useState } from "react";
import {
  Typography,
  Grid,
  Box,
  Button,
  Link,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Table,
  TableBody,
} from "@mui/material";
import { Shortcut } from "@mui/icons-material";
import { getAuthHeader, getSessionStorage, useIsMobile, Icons } from "../Utils";
import { CheckinHistoryChart } from "./CheckinHistoryChart";
import { CaptainHistoryChart } from "./CaptainHistoryChart";
import { CourtHistoryChart } from "./CourtHistoryChart";

function RatingSection({ ballkid }) {
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
          component={Link}
          href={`/ratings?rater=${ballkid.id}`}
          endIcon={<Shortcut />}
          sx={{ my: 1 }}
        >
          View ratings submitted by me
        </Button>
      </Grid>
    </Grid>
  );
}

function renderPreviousFinals(finals) {
  return (
    <Grid item sx={{ mt: 2 }}>
      <Typography variant="h6">Previous Years' Finals:</Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">Year</TableCell>
              <TableCell align="center">Match Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {finals.map((final) => (
              <TableRow key={final.id}>
                <TableCell align="center">{final.year}</TableCell>
                <TableCell align="center">{final.match_type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
}

export default function MyProfile(props) {
  const [ballkid, setBallkid] = useState(null);

  const [finals, setFinals] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [courts, setCourts] = useState([]);

  const [totalTime, setTotalTime] = useState("");

  const [updated, setUpdated] = useState(false);

  const isMobile = useIsMobile();
  const pk = getSessionStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/get-ballkid/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkid(data))
      .then(() => setUpdated(false));

    fetch("/api/get-finals-history/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setFinals(data));

    fetch("/api/get-captains/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setCaptains(data));

    fetch("/api/get-courts/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setCourts(data));

    fetch("/api/get-checkins/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setCheckins(data));

    fetch("/api/get-checkin-duration/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTotalTime(data["checkin_duration"]))
      .then(() => setUpdated(false));
  }, [updated, pk]);

  return ballkid == null ? (
    ""
  ) : (
    <div className="page">
      <div className="sxs">
        <Typography variant="h4">
          {ballkid.first_name} {ballkid.last_name}
        </Typography>
        &ensp;
        <Icons ballkid={ballkid} margin={0} />
      </div>

      <Grid container>
        <Grid item xs={12} sm={4} md={3} lg={2}>
          <Box width="95%" component="img" src={"../" + ballkid.image} />
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
            </div>
          )}
        </Grid>

        <RatingSection ballkid={ballkid} />

        {!ballkid.is_active ? (
          ""
        ) : (
          <Grid container>
            <Grid item xs={12}>
              <br />
              <Typography variant="h6">Analytics:</Typography>
            </Grid>

            <Grid item xs={12} lg={5.5} sx={{ m: 2 }}>
              <CheckinHistoryChart histories={checkins} totalTime={totalTime} />
            </Grid>

            {isMobile ? (
              ""
            ) : (
              <Grid item xs={12} lg={5.5} sx={{ m: 2 }}>
                <CourtHistoryChart histories={courts} />
              </Grid>
            )}
            {isMobile ? (
              ""
            ) : (
              <Grid item xs={12} lg={5.5} sx={{ m: 2 }}>
                <CaptainHistoryChart histories={captains} />
              </Grid>
            )}
          </Grid>
        )}
      </Grid>
      <Grid container>{renderPreviousFinals(finals)}</Grid>
    </div>
  );
}
