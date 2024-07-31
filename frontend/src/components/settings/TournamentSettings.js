import React, { useState, useEffect, useRef } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";

import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import Done from "@mui/icons-material/Done";
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import Close from "@mui/icons-material/Close";
import AddCircle from "@mui/icons-material/AddCircle";
import Warning from "@mui/icons-material/Warning";

import {
  Alerts,
  HelpIcon,
  HideShowToggle,
  getAuthHeader,
  Banners,
  ConfirmDialog,
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

function ArchiveButton() {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <ConfirmDialog
        message={"You are about to archive all active ballkids."}
        url={"/api/archive-all"}
        body={{}}
        open={open}
        setOpen={setOpen}
        setUpdated={null}
      />

      <Button
        variant="contained"
        size="small"
        color="warning"
        onClick={() => setOpen(true)}
      >
        Archive All
      </Button>
    </Box>
  );
}

function Banner({
  banner,
  bannerInput,
  audience,
  setSuccessMsg,
  setErrorMsg,
  setUpdated,
  newBanner = false,
}) {
  const [disabled, setDisabled] = useState(true);

  const defaultMessage = newBanner ? "" : banner.message;
  const [bannerMessage, setBannerMessage] = useState(defaultMessage);
  const [savedBanner, setSavedBanner] = useState(defaultMessage);

  const defaultBallkid = {
    id: banner?.ballkid,
    label: banner?.ballkid_name,
  };
  const [ballkid, setBallkid] = useState(newBanner ? null : defaultBallkid);
  const [savedBallkid, setSavedBallkid] = useState(
    newBanner ? null : defaultBallkid
  );
  const [ballkidsList, setBallkidsList] = useState([]);

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) =>
        setBallkidsList(
          data.map((ballkid) => ({
            label: ballkid.first_name + " " + ballkid.last_name,
            id: ballkid.id,
          }))
        )
      );
  }, []);

  return disabled ? (
    newBanner ? (
      <IconButton
        size="small"
        onClick={() => {
          setDisabled(false);
          setTimeout(() => bannerInput.current.focus(), 100);
        }}
      >
        <Tooltip title="Add Banner">
          <AddCircle />
        </Tooltip>
      </IconButton>
    ) : (
      <Box className="sxs">
        <Typography color="gray" style={{ width: "90%" }} sx={{ mr: 2 }}>
          {audience !== "ballkid" ? "" : `${banner?.ballkid_name}: `}
          {banner.message}
        </Typography>

        <Tooltip title="Edit">
          <IconButton
            size="small"
            onClick={() => {
              setDisabled(false);
              setTimeout(() => bannerInput.current.focus(), 100);
            }}
          >
            <Edit />
          </IconButton>
        </Tooltip>

        <Tooltip title="Delete">
          <IconButton
            size="small"
            onClick={() =>
              fetch("/api/update-banner", {
                method: "DELETE",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  id: banner.id,
                }),
              }).then((response) => {
                if (response.ok) {
                  setUpdated(true);

                  setSuccessMsg(
                    "Banner deleted for all ballkids and captains! Refresh page to view updated banner(s)."
                  );
                } else {
                  setErrorMsg("Error updating banner.");
                }
              })
            }
          >
            <Delete />
          </IconButton>
        </Tooltip>
      </Box>
    )
  ) : (
    <Box className="sxs">
      {audience !== "ballkid" ? (
        ""
      ) : (
        <Autocomplete
          disablePortal
          openOnFocus
          sx={{ width: 300, mr: 2 }}
          options={ballkidsList}
          value={ballkid}
          onChange={(e, newVal) => {
            setBallkid(newVal);
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              label="Ballkid"
              required
            />
          )}
        />
      )}

      <TextField
        variant="standard"
        value={bannerMessage}
        label={audience === "ballkid" ? "Banner Message" : ""}
        style={{ width: "90%" }}
        disabled={disabled}
        inputRef={bannerInput}
        sx={{ mr: 2 }}
        multiline
        onChange={(e) => setBannerMessage(e.target.value)}
      />

      <IconButton
        size="small"
        disabled={
          (banner.message === bannerMessage &&
            banner.ballkid_name === ballkid?.label) ||
          bannerMessage === ""
        }
        onClick={() =>
          fetch("/api/update-banner", {
            method: newBanner ? "POST" : "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              id: newBanner ? 0 : banner.id,
              time: new Date().toLocaleString(),
              message: bannerMessage,
              audience: audience,
              ballkidId: ballkid?.id,
            }),
          }).then((response) => {
            if (response.ok) {
              setDisabled(true);
              setSavedBanner(bannerMessage);
              setSavedBallkid(ballkid);
              if (newBanner) {
                setBannerMessage("");
                setBallkid(null);
              }
              setUpdated(true);

              setSuccessMsg(
                "Banner updated for all ballkids and captains! Refresh page to view updated banner(s)."
              );
            } else {
              setErrorMsg("Error updating banner.");
            }
          })
        }
      >
        <Tooltip title="Save">
          <Done />
        </Tooltip>
      </IconButton>

      <Tooltip title="Cancel">
        <IconButton
          size="small"
          onClick={() => {
            setDisabled(true);
            setBannerMessage(savedBanner);
            setBallkid(savedBallkid);
          }}
        >
          <Close />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function BannerSection({ audience, setSuccessMsg, setErrorMsg }) {
  const [banners, setBanners] = useState([]);
  const [updated, setUpdated] = useState(false);

  const bannerInput = useRef(null);

  useEffect(() => {
    fetch("/api/banner-list", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) =>
        setBanners(data.filter((banner) => banner.audience === audience))
      )
      .then(() => setUpdated(false));
  }, [audience, updated]);

  return (
    <Grid item xs={12} className="justify-top">
      <Typography variant="subtitle1">
        {audience === "all"
          ? "Site-wide "
          : audience === "captains"
          ? "Captains-wide "
          : "Ballkid-specific "}
        banner(s)
      </Typography>

      <Box style={{ width: "75%" }} sx={{ ml: 2 }}>
        {banners.map((banner, index) => (
          <Banner
            key={index}
            banner={banner}
            bannerInput={bannerInput}
            audience={audience}
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
            setUpdated={setUpdated}
          />
        ))}

        <Banner
          banner={{}}
          bannerInput={bannerInput}
          audience={audience}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
          setUpdated={setUpdated}
          newBanner={true}
        />
      </Box>
      {/* {disabled ? (
        ""
      ) : (
        <Button size="small" onClick={() => setDisabled(true)}>
          Cancel
        </Button>
      )} */}
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
        <Tooltip title="Save">
          <Done />
        </Tooltip>
      </IconButton>
    </div>
  );
}

function YearThreshold({ tournament, setSuccessMsg, setErrorMsg }) {
  const [param, setParam] = useState(tournament.rcal_year_threshold);
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
              rcal_year_threshold: param,
            }),
          }).then((response) => {
            if (response.ok) {
              setSuccessMsg(
                "Calibration year threshold parameter was updated!"
              );
            } else {
              setErrorMsg(
                "Error updating calibration year threshold parameter."
              );
            }
          });
        }}
      >
        <Tooltip title="Save">
          <Done />
        </Tooltip>
      </IconButton>
    </div>
  );
}

function BucketSize({ tournament, setSuccessMsg, setErrorMsg }) {
  const [param, setParam] = useState(tournament.rcal_bucket_size);
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
              rcal_bucket_size: param,
            }),
          }).then((response) => {
            if (response.ok) {
              setSuccessMsg("Calibration bucket_size parameter was updated!");
            } else {
              setErrorMsg("Error updating calibration bucket_size parameter.");
            }
          });
        }}
      >
        <Tooltip title="Save">
          <Done />
        </Tooltip>
      </IconButton>
    </div>
  );
}

function CreateTournament({ setUpdated, setSuccessMsg, setErrorMsg }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}></Grid>
      <Grid item xs={12}>
        <Typography>No tournament currently exists for this year.</Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography>Create one now:</Typography>
      </Grid>

      <Grid item xs={12}>
        <TextField
          value={year}
          label="Year"
          variant="standard"
          type="number"
          required
          onChange={(e) => setYear(parseInt(e.target.value))}
        />
      </Grid>
      <Grid item xs={12}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            renderInput={(props) => (
              <TextField variant="standard" required {...props} />
            )}
            label="Start Date"
            value={start}
            mask={"__/__/____"}
            onChange={(newValue) => setStart(newValue)}
          />
        </LocalizationProvider>
      </Grid>

      <Grid item xs={12}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            renderInput={(props) => (
              <TextField variant="standard" required {...props} />
            )}
            label="End Date"
            value={end}
            mask={"__/__/____"}
            onChange={(newValue) => setEnd(newValue)}
          />
        </LocalizationProvider>
      </Grid>

      <Grid item xs={12}>
        <Button
          color="primary"
          variant="contained"
          onClick={() => {
            if (start === null || end === null) {
              setErrorMsg("Start and end dates are required.");
            } else if (Date.parse(start) >= Date.parse(end)) {
              setErrorMsg(
                "Tournament start date cannot be on or after the end date."
              );
            } else {
              fetch("/api/get-tournament", {
                method: "POST",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  year: year,
                  start: start,
                  end: end,
                }),
              }).then((response) => {
                if (response.ok) {
                  setSuccessMsg("Tournament created!");
                  setErrorMsg("");
                  setTimeout(() => setUpdated(true), 1000);
                } else {
                  setSuccessMsg("");
                  setErrorMsg("Error creating tournament.");
                }
                setYear("");
                setStart(null);
                setEnd(null);
              });
            }
          }}
        >
          Create Tournament
        </Button>
      </Grid>
    </Grid>
  );
}

function ResetDataButton() {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <ConfirmDialog
        message={
          "You are about to reset ALL data for this year. This includes archiving all ballkids AND deleting this year's check-in history and analytics, team history, captain analytics, court analytics, schedules, ratings, and calibration parameters."
        }
        url={"/api/reset-data"}
        body={{}}
        open={open}
        setOpen={setOpen}
        setUpdated={null}
      />

      <Button
        variant="contained"
        size="small"
        color="error"
        onClick={() => setOpen(true)}
      >
        Reset Data
      </Button>
    </Box>
  );
}

export default function TournamentSettings(props) {
  const [tournament, setTournament] = useState();

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setTournament(data))
      .then(() => setUpdated(false));
  }, [updated]);

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

      {tournament.year === null ? (
        <CreateTournament
          setUpdated={setUpdated}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      ) : (
        <Grid container spacing={2} sx={{ pr: 2 }}>
          <BannerSection
            audience="all"
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
          />

          <BannerSection
            audience="captains"
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
          />

          <BannerSection
            audience="ballkid"
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
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="h6">Calibration Settings</Typography>
          </Grid>

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
              Change minimum (inclusive) year for which calibration trains
            </Typography>
            <YearThreshold
              tournament={tournament}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          </Grid>

          <Grid item xs={12} className="justify">
            <Typography variant="subtitle1">
              Change calibration bucket_size parameter (in days)
            </Typography>
            <BucketSize
              tournament={tournament}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          </Grid>

          <Grid item xs={12} className="sxs" sx={{ mt: 2 }}>
            <Warning color="error" />
            <Typography variant="h6" color="error" sx={{ mx: 1 }}>
              Proceed with Caution
            </Typography>
            <Warning color="error" />
          </Grid>

          <Grid item xs={12} className="justify">
            <Typography variant="subtitle1">
              Export and download all data from database
            </Typography>
            <DownloadButton
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          </Grid>

          <Grid item xs={12} className="justify">
            <Typography variant="subtitle1">Archive all ballkids</Typography>
            <ArchiveButton
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          </Grid>

          <Grid item xs={12} className="justify">
            <Typography variant="subtitle1">
              Reset all data for this year
            </Typography>
            <ResetDataButton
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
      )}
    </div>
  );
}
