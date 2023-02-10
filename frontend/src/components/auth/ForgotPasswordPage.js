import React, { useState } from "react";
import { Button, Grid, Typography, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function ForgotPasswordPage(props) {
  const [email, setEmail] = useState("");

  const navigate = useNavigate();

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
              Forgot Password?
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body1">
              Enter your email address below, and we'll email instructions for
              setting a new one.
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Email"
              name="email"
              variant="standard"
              required={true}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              color="primary"
              variant="contained"
              onClick={
                (e) =>
                  fetch("/accounts/reset-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email: email,
                    }),
                  }).then((response) => response.json())
                // .then((data) => navigate("reset-email-sent"))
              }
            >
              Submit
            </Button>
          </Grid>
        </Grid>
      </div>
    </div>
  );
}
