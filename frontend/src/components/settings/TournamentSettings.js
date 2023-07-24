import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";

import { Alerts, HideShowToggle, getAuthHeader } from "../Utils";
import { TextField } from "@mui/material";

function SetBanner({ banner, setSuccessMsg, setErrorMsg }) {
  const [bannerDisabled, setBannerDisabled] = useState(true);
  const [newBanner, setNewBanner] = useState(banner);

  const refreshStr = "Refresh to view updated banner state.";

  return (
    <div className="sxs" style={{ width: "75%" }}>
      <TextField
        variant="standard"
        defaultValue={banner}
        style={{ width: "100%" }}
        disabled={bannerDisabled}
        sx={{ mx: 2 }}
        multiline
        onDoubleClick={() => setBannerDisabled(false)}
        onChange={(e) => setNewBanner(e.target.value)}
      />
      <Button
        variant="outlined"
        size="small"
        onClick={() =>
          fetch("/api/get-tournament", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              banner: newBanner ?? "",
            }),
          }).then((response) => {
            if (response.ok) {
              setBannerDisabled(true);

              if (newBanner === "") {
                setSuccessMsg(
                  `Banner removed for all ballkids and captains! ${refreshStr}`
                );
              } else {
                setSuccessMsg(
                  `Banner updated for all ballkids and captains! ${refreshStr}`
                );
              }
            } else {
              setErrorMsg(`Error updating banner. ${refreshStr}`);
            }
          })
        }
      >
        Publish
      </Button>
    </div>
  );
}

export default function TournamentSettings(props) {
  const [showTeams, setShowTeams] = useState(false);
  const [showFinalsTeams, setShowFinalsTeams] = useState(false);
  const [banner, setBanner] = useState();

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => {
        setShowTeams(data.show_teams);
        setShowFinalsTeams(data.show_finals_teams);
        setBanner(data.banner);
      });
  }, []);

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

      <Grid container spacing={2} sx={{ pr: 2 }}>
        <Grid item xs={12} className="justify-top">
          <Typography variant="subtitle1">Set site-wide banner</Typography>
          {banner === undefined || banner === null ? (
            ""
          ) : (
            <SetBanner
              banner={banner}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          )}
        </Grid>

        {["", "finals "].map((teamType) => (
          <Grid item key={teamType} xs={12} className="justify">
            <Typography variant="subtitle1">
              Visiblity of {teamType}teams to captains and ballkids
            </Typography>

            <HideShowToggle
              teamType={teamType.trim()}
              showTeams={teamType === "" ? showTeams : showFinalsTeams}
              setShowTeams={teamType === "" ? setShowTeams : setShowFinalsTeams}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          </Grid>
        ))}

        <Grid item xs={12} className="justify">
          <Typography variant="subtitle1">
            Export all data from database
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() =>
              fetch("/api/download", {
                method: "GET",
                headers: getAuthHeader(),
              })
                .then((response) => {
                  if (response.ok) {
                    setSuccessMsg("Downloaded all data!");
                  } else {
                    setErrorMsg("Error downloading data.");
                  }
                  return response.blob();
                })
                .then((blob) => {
                  // Create blob link to download
                  const url = window.URL.createObjectURL(new Blob([blob]));
                  const link = document.createElement("a");
                  link.href = url;
                  link.setAttribute("download", `sample.zip`);
                  // Append to html page, force download, and clean up by removing link
                  document.body.appendChild(link);
                  link.click();
                  link.parentNode.removeChild(link);
                  // downloadFile({
                  //   data: data,
                  //   fileName: "test.csv",
                  //   fileType: "text/csv",
                  // });
                })
            }
          >
            Download
          </Button>
        </Grid>

        {/* <Grid item xs={12} className="justify">
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
        </Grid> */}
      </Grid>
    </div>
  );
}
