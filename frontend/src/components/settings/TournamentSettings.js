import React, { useState, useEffect, useRef } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";

import { Alerts, HelpIcon, HideShowToggle, getAuthHeader } from "../Utils";
import { Box, TextField } from "@mui/material";
import { tournamentSettings } from "../HelpMessages";

function SetBanner({ tournament, setSuccessMsg, setErrorMsg }) {
  const [disabled, setDisabled] = useState(true);
  const [savedBanner, setSavedBanner] = useState(tournament.banner);
  const [banner, setBanner] = useState(tournament.banner);

  const bannerInput = useRef(null);

  const refreshStr = "Refresh to view updated banner state.";

  return (
    <Grid item xs={12} className="justify">
      <div className="sxs">
        <Typography variant="subtitle1">Site-wide banner</Typography>
        <Button
          size="small"
          disabled={!disabled}
          onClick={() => {
            setDisabled(false);
            setTimeout(() => bannerInput.current.focus(), 100);
          }}
          sx={{ mt: 0.5 }}
        >
          Edit
        </Button>
      </div>
      {disabled ? (
        <Typography style={{ width: "70%" }} color="gray">
          {banner}
        </Typography>
      ) : (
        <div className="sxs" style={{ width: "70%" }}>
          <TextField
            variant="standard"
            value={banner}
            style={{ width: "100%" }}
            disabled={disabled}
            inputRef={bannerInput}
            sx={{ mx: 2 }}
            multiline
            onChange={(e) => setBanner(e.target.value)}
          />
          <Button
            size="small"
            onClick={() =>
              fetch("/api/get-tournament", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  banner: banner ?? "",
                }),
              }).then((response) => {
                if (response.ok) {
                  setDisabled(true);
                  setSavedBanner(banner);

                  if (banner === "") {
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
          <Button
            size="small"
            onClick={() => {
              setDisabled(true);
              setBanner(savedBanner);
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </Grid>
  );
}

export default function TournamentSettings(props) {
  const [tournament, setTournament] = useState();

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setTournament(data));
  }, []);

  return tournament === null || tournament === undefined ? (
    ""
  ) : (
    <div className="page">
      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />

      <Box className="sxs" sx={{ mb: 1 }}>
        <Typography variant="h4">Tournament Settings</Typography>
        &thinsp;
        <HelpIcon page="Tournament Settings" message={tournamentSettings} />
      </Box>

      <Grid container spacing={2} sx={{ pr: 2 }}>
        <SetBanner
          tournament={tournament}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />

        {["", "finals "].map((teamType) => (
          <Grid item key={teamType} xs={12} className="justify">
            <Typography variant="subtitle1">
              Visiblity of {teamType}teams to captains and ballkids
            </Typography>

            <HideShowToggle
              teamType={teamType.trim()}
              showTeams={
                teamType === ""
                  ? tournament.show_teams
                  : tournament.show_finals_teams
              }
              setShowTeams={
                teamType === ""
                  ? tournament.show_teams
                  : tournament.show_finals_teams
              }
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
