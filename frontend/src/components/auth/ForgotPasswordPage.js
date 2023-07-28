import React, { useState } from "react";
import { Button, Grid, Typography, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Alerts } from "../Utils";

function handleSubmit(email, navigate, setErrorMsg) {
  fetch("/accounts/users/reset_password/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).then((response) => {
    if (response.ok) {
      navigate("/reset-email-sent");
    } else {
      setErrorMsg(
        "Email not found to be associated with an account! Please enter another email."
      );
    }
  });
}

export default function ForgotPasswordPage(props) {
  const [email, setEmail] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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
            <Alerts
              successMsg={successMsg}
              errorMsg={errorMsg}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          </Grid>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit(email, navigate, setErrorMsg);
                }
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              color="primary"
              variant="contained"
              onClick={(e) => handleSubmit(email, navigate, setErrorMsg)}
            >
              Submit
            </Button>
          </Grid>
        </Grid>
      </div>
    </div>
  );
}
