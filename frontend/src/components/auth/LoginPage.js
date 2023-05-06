import React, { useState } from "react";
import { Button, Grid, Typography, TextField, Link } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Alerts, handleChange, setLocalStorage } from "../Utils";

function submitPassword(state, setSuccessMsg, setErrorMsg, setToken, navigate) {
  fetch("/accounts/get-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: state.username,
      password: state.password,
    }),
  })
    .then((response) => {
      if (response.ok) {
        setSuccessMsg("Logged in");
        if (window.location.pathname === "/login") {
          navigate("/");
        }
      } else {
        setErrorMsg("Incorrect password.");
        throw new Error("Incorrect password");
      }
      return response.json();
    })
    .then((data) => {
      setToken(data?.token ?? "");
      setLocalStorage("username", state?.username ?? "");
      setLocalStorage("ballkid_id", data?.ballkid_id ?? "");
      setLocalStorage("group", data?.group ?? "");
      console.log(data);
    })
    .catch((error) => {});
}

export default function LoginPage(props) {
  const [state, setState] = useState({
    username: "",
    password: "",
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const setToken = props.setToken;
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
              Log In
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Username"
              name="username"
              variant="standard"
              required={true}
              onChange={(e) => handleChange(e, state, setState)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Password"
              name="password"
              variant="standard"
              type="password"
              required={true}
              onChange={(e) => handleChange(e, state, setState)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  submitPassword(
                    state,
                    setSuccessMsg,
                    setErrorMsg,
                    setToken,
                    navigate
                  );
                }
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              color="primary"
              variant="contained"
              onClick={(e) =>
                submitPassword(
                  state,
                  setSuccessMsg,
                  setErrorMsg,
                  setToken,
                  navigate
                )
              }
            >
              Submit
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography
              variant="body1"
              component={Link}
              href="/forgot-password"
            >
              Forgot password?
            </Typography>
          </Grid>
        </Grid>
      </div>
    </div>
  );
}
