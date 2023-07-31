import React, { useState, useEffect, useRef } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";

import {
  Alerts,
  HelpIcon,
  HideShowToggle,
  getAuthHeader,
  TournamentBanner,
} from "../Utils";
import { Box, TextField } from "@mui/material";
import { tournamentSettings } from "../HelpMessages";

function SetBanner({ tournament, setSuccessMsg, setErrorMsg }) {
  const [disabled, setDisabled] = useState(true);
  const [savedBanner1, setSavedBanner1] = useState(tournament.banner1);
  const [savedBanner2, setSavedBanner2] = useState(tournament.banner2);
  const [savedBanner3, setSavedBanner3] = useState(tournament.banner3);
  const [banner1, setBanner1] = useState(tournament.banner1);
  const [banner2, setBanner2] = useState(tournament.banner2);
  const [banner3, setBanner3] = useState(tournament.banner3);

  const bannerToSetBannerDict = {
    banner1: setBanner1,
    banner2: setBanner2,
    banner3: setBanner3,
  };

  const bannerInput = useRef(null);

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
        <Box style={{ width: "70%" }} sx={{ ml: 2 }}>
          {[banner1, banner2, banner3].map((banner, index) => (
            <Typography color="gray" key={`disabled${index}`}>
              {banner}
            </Typography>
          ))}
        </Box>
      ) : (
        <Box className="sxs" style={{ width: "70%" }}>
          <Box>
            {[banner1, banner2, banner3].map((banner, index) => (
              <TextField
                key={`undisabled${index}`}
                variant="standard"
                value={banner}
                style={{ width: "90%" }}
                disabled={disabled}
                inputRef={index === 0 ? bannerInput : null}
                sx={{ mx: 2 }}
                multiline
                onChange={(e) =>
                  bannerToSetBannerDict[`banner${index + 1}`](e.target.value)
                }
              />
            ))}
          </Box>

          <Button
            size="small"
            onClick={() =>
              fetch("/api/get-tournament", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  banner1: banner1 ?? "",
                  banner2: banner2 ?? "",
                  banner3: banner3 ?? "",
                }),
              }).then((response) => {
                if (response.ok) {
                  setDisabled(true);
                  setSavedBanner1(banner1);
                  setSavedBanner2(banner2);
                  setSavedBanner3(banner3);

                  setSuccessMsg(
                    "Banner updated for all ballkids and captains! Refresh page to view updated banner state."
                  );
                } else {
                  setErrorMsg("Error updating banner.");
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
              setBanner1(savedBanner1);
              setBanner2(savedBanner2);
              setBanner3(savedBanner3);
            }}
          >
            Cancel
          </Button>
        </Box>
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
      <TournamentBanner />

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
