import React, { useState } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";

import { Alerts, getAuthHeader, useIsMobile } from "../Utils";

function ChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Grid container spacing={2} sx={{ mx: 3 }}>
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
          Change Password
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Enter Old Password"
          value={oldPassword}
          variant="standard"
          type="password"
          required={true}
          onChange={(e) => setOldPassword(e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Enter New Password"
          value={password}
          variant="standard"
          type="password"
          required={true}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Confirm New Password"
          variant="standard"
          type="password"
          value={confirmPassword}
          required={true}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </Grid>

      <Grid item xs={12}>
        <Button
          color="primary"
          variant="contained"
          onClick={(e) =>
            fetch("/accounts/users/set_password/", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                new_password: password,
                re_new_password: confirmPassword,
                current_password: oldPassword,
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Password changed!");
              } else {
                setErrorMsg("Error changing password.");
              }
              setOldPassword("");
              setPassword("");
              setConfirmPassword("");
            })
          }
        >
          Change Password
        </Button>
      </Grid>
    </Grid>
  );
}

export default function AccountSettings(props) {
  const [tabIndex, setTabIndex] = useState(0);
  const [mobileSelection, setMobileSelection] = useState();

  const isMobile = useIsMobile();

  const mapped = {
    "Change Password": <ChangePassword />,
  };

  return (
    <div className="page">
      {isMobile ? (
        <div>
          <Select
            native
            value={mobileSelection}
            sx={{ mb: 1 }}
            onChange={(e) => setMobileSelection(e.target.value)}
          >
            {Object.keys(mapped).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          {mapped[mobileSelection]}
        </div>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            bgcolor: "background.paper",
            display: "flex",
            height: 400,
            width: "95%",
          }}
        >
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={tabIndex}
            onChange={(e, newVal) => setTabIndex(newVal)}
            sx={{ borderRight: 1, borderColor: "divider", minWidth: 250 }}
          >
            {Object.keys(mapped).map((label, index) => (
              <Tab key={index} label={label} />
            ))}
          </Tabs>

          {Object.keys(mapped).map((label, index) => (
            <div key={index} hidden={tabIndex !== index}>
              {tabIndex === index && mapped[label]}
            </div>
          ))}
        </Box>
      )}
    </div>
  );
}
