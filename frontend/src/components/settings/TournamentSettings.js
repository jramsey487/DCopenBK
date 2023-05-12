import React, { useState } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";

import { Alerts, HideShowToggle } from "../Utils";

export default function TournamentSettings(props) {
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <div className="page">
      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />

      <Typography variant="h4" sx={{ mb: 1 }}>
        Tournament Settings
      </Typography>

      <Grid container spacing={2} sx={{ px: 2 }}>
        <Grid item xs={12} className="justify">
          <Typography variant="subtitle1">
            Visiblity of teams to captains and ballkids
          </Typography>

          <HideShowToggle
            key="teams-toggle"
            teamType=""
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
          />
        </Grid>
        <Grid item xs={12} className="justify">
          <Typography variant="subtitle1">
            Visiblity of finals teams to captains and ballkids
          </Typography>

          <HideShowToggle
            key="finals-teams-toggle"
            teamType="finals"
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
          />
        </Grid>
        <Grid item xs={12} className="justify">
          <Typography variant="subtitle1">
            Export all data from database
          </Typography>
          <Button variant="contained" size="small" onClick={() => {}}>
            Download
          </Button>
        </Grid>
        <Grid item xs={12} className="justify">
          <Typography variant="subtitle1">
            Wrap up this year's tournament
          </Typography>
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => {}}
          >
            Complete
          </Button>
        </Grid>
      </Grid>
    </div>
  );
}
