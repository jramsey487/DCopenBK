import React, { useState, useEffect } from "react";

import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";

import {
  BallkidLink,
  Banners,
  getAuthHeader,
  getCurrentYear,
  HelpIcon,
} from "../Utils";
import { MATCH_TYPES, POSITIONS } from "../Consts";
import { pastFinalsTeams } from "../HelpMessages";

function Team({ team, ballkids }) {
  return (
    <Grid item xs={12} sm={6} md={6} lg={6} xl={3}>
      <Card sx={{ mb: 2 }} elevation={1}>
        <CardContent>
          <div className="justify">
            <div className="sxs">
              <Typography variant="h6">{team}</Typography>
              <Typography variant="subtitle1" sx={{ ml: 1 }}>
                ({ballkids.length})
              </Typography>
            </div>
          </div>

          {POSITIONS.map((position) => (
            <div key={position}>
              <Divider sx={{ my: 1 }} />
              <div className="sxs">
                <Typography variant="subtitle1">{position}s</Typography>
                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                  (
                  {
                    ballkids.filter((ballkid) => ballkid.position === position)
                      .length
                  }
                  )
                </Typography>
              </div>

              <Box>
                {ballkids
                  .filter((ballkid) => ballkid.position === position)
                  .map((ballkid) => (
                    <Box key={`${team}_${ballkid.ballkid}`}>
                      <BallkidLink
                        id={ballkid.ballkid}
                        name={`${ballkid.first_name} ${ballkid.last_name}`}
                      />
                    </Box>
                  ))}
              </Box>
            </div>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

export default function PastFinalsTeamsPageDesktop() {
  const [year, setYear] = useState(getCurrentYear() - 1);
  const [ballkids, setBallkids] = useState([]);

  const teams = Object.keys(MATCH_TYPES).map((key) => MATCH_TYPES[key]);

  useEffect(() => {
    fetch(`/api/get-past-finals/${year}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(data));
  }, [year]);

  return (
    <div className="page">
      <Banners />

      <Box className="sxs" sx={{ mb: 2 }}>
        <Typography variant="h4">Past Finals Teams</Typography>
        &thinsp;
        <HelpIcon page="Past Finals Teams" message={pastFinalsTeams} />
      </Box>

      <Box className="sxs">
        <Typography variant="body1">Showing finals for: &thinsp;</Typography>
        <TextField
          variant="standard"
          value={year}
          type="number"
          sx={{ mx: 2, maxWidth: "100px" }}
          onChange={(e) => setYear(e.target.value)}
        />
      </Box>

      <Grid container spacing={2}>
        {teams.map((team) => (
          <Team
            key={team}
            team={team}
            ballkids={ballkids.filter((ballkid) => ballkid.match_type === team)}
          />
        ))}
      </Grid>
    </div>
  );
}
