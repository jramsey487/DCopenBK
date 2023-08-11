import React, { useState, useEffect, useRef } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";

import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

import Done from "@mui/icons-material/Done";

import {
  Alerts,
  HelpIcon,
  HideShowToggle,
  getAuthHeader,
  Banners,
} from "../Utils";
import { tournamentSettings } from "../HelpMessages";

function DownloadButton({ setSuccessMsg, setErrorMsg }) {
  const [loading, setLoading] = useState(false);

  return (
    <LoadingButton
      loading={loading}
      variant="contained"
      size="small"
      onClick={() => {
        setLoading(true);
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
          .then(() => setLoading(false));
      }}
    >
      Download
    </LoadingButton>
  );
}

function Banner({
  index,
  tournament,
  disabled,
  setDisabled,
  bannerInput,
  setSuccessMsg,
  setErrorMsg,
  setUpdated,
}) {
  const startBanner =
    index === 1
      ? tournament.banner1
      : index === 2
      ? tournament.banner2
      : tournament.banner3;

  const [banner, setBanner] = useState(startBanner);

  return (
    <Box className="sxs">
      <TextField
        variant="standard"
        value={banner}
        style={{ width: "90%" }}
        disabled={disabled}
        inputRef={bannerInput}
        sx={{ mx: 2 }}
        multiline
        onChange={(e) => setBanner(e.target.value)}
      />
      <Button
        size="small"
        onClick={() => {
          const bannerDict =
            index === 1
              ? { banner1: banner ?? "" }
              : index === 2
              ? { banner2: banner ?? "" }
              : { banner3: banner ?? "" };

          fetch("/api/get-tournament", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              time: new Date().toLocaleString(),
              ...bannerDict,
            }),
          }).then((response) => {
            if (response.ok) {
              setDisabled(true);
              setUpdated(true);

              setSuccessMsg(
                "Banner updated for all ballkids and captains! Refresh page to view updated banners."
              );
            } else {
              setErrorMsg("Error updating banner.");
            }
          });
        }}
      >
        Publish
      </Button>
    </Box>
  );
}

function BannerSection({ setSuccessMsg, setErrorMsg }) {
  const [tournament, setTournament] = useState();
  const [disabled, setDisabled] = useState(true);
  const [updated, setUpdated] = useState(false);

  const bannerInput = useRef(null);

  useEffect(() => {
    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setTournament(data))
      .then(() => setUpdated(false));
  }, [updated]);

  return tournament === undefined ? (
    ""
  ) : (
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

      <Box style={{ width: "75%" }} sx={{ ml: 2 }}>
        {[1, 2, 3].map((index) =>
          disabled ? (
            <Typography key={`disabled-${index}`} color="gray">
              {index === 1
                ? tournament.banner1
                : index === 2
                ? tournament.banner2
                : tournament.banner3}
            </Typography>
          ) : (
            <Banner
              key={`editable-${index}`}
              index={index}
              tournament={tournament}
              disabled={disabled}
              setDisabled={setDisabled}
              bannerInput={bannerInput}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
              setUpdated={setUpdated}
            />
          )
        )}
      </Box>
      {disabled ? (
        ""
      ) : (
        <Button size="small" onClick={() => setDisabled(true)}>
          Cancel
        </Button>
      )}
    </Grid>
  );
}

function RemoveOutliers({ tournament, setSuccessMsg, setErrorMsg }) {
  const [param, setParam] = useState(tournament.rcal_ignore_outliers);
  const [disabled, setDisabled] = useState(true);

  return (
    <div className="sxs">
      <TextField
        variant="standard"
        size="small"
        value={param}
        style={{ width: 80 }}
        onChange={(e) => {
          setParam(e.target.value);
          setDisabled(false);
        }}
      />
      <IconButton
        color="primary"
        disabled={disabled}
        onClick={() => {
          setDisabled(true);
          fetch("/api/get-tournament", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              rcal_ignore_outliers: param,
            }),
          }).then((response) => {
            if (response.ok) {
              setSuccessMsg(
                "Calibration ignore outliers parameter was updated!"
              );
            } else {
              setErrorMsg("Error updating ignore outliers parameter.");
            }
          });
        }}
      >
        <Done />
      </IconButton>
    </div>
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
      <Banners />

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
        <BannerSection
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
              defaultShow={
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
            Change calibration ignore_outliers parameter
          </Typography>
          <RemoveOutliers
            tournament={tournament}
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
          />
        </Grid>

        <Grid item xs={12} className="justify">
          <Typography variant="subtitle1">
            Export all data from database
          </Typography>
          <DownloadButton
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
          />
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
