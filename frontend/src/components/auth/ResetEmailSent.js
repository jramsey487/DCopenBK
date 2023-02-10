import React from "react";
import { Grid, Typography } from "@mui/material";

export default function ResetEmailSent(props) {
  return (
    <div className="page">
      <div className="center">
        <Grid
          container
          spacing={2}
          alignItems="center"
          direction="column"
          justifyContent="center"
        >
          <Grid item xs={12}>
            <Typography component="h4" variant="h4">
              Password reset email sent!
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography component="body1" variant="body1">
              Please check your email for further instructions to reset your
              password.
            </Typography>
          </Grid>
        </Grid>
      </div>
    </div>
  );
}
