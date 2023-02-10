import React, { useState } from "react";
import { Grid, Typography, TextField, Button } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { Alerts } from "../Utils";

export default function ResetPassword(props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { uid, token } = useParams();
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
              Reset Password
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="New Password"
              name="newPassword"
              variant="standard"
              type="password"
              required={true}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Confirm New Password"
              name="confirmPassword"
              variant="standard"
              type="password"
              required={true}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              color="primary"
              variant="contained"
              onClick={(e) =>
                fetch("/accounts/users/reset_password_confirm/", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    uid: uid,
                    token: token,
                    new_password: password,
                    re_new_password: confirmPassword,
                  }),
                }).then((response) => {
                  if (response.ok) {
                    navigate("/reset-password-complete");
                  } else {
                    setErrorMsg("Error resetting password.");
                  }
                })
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
