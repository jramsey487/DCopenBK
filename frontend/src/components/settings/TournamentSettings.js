import React, { useState, useEffect, useRef } from "react";

import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";

import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

import Done from "@mui/icons-material/Done";
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import Close from "@mui/icons-material/Close";
import AddCircle from "@mui/icons-material/AddCircle";
import Warning from "@mui/icons-material/Warning";

import {
  HelpIcon,
  HideShowToggle,
  getAuthHeader,
  Banners,
  ConfirmDialog,
  getCurrentYear,
} from "../Utils";
import { tournamentSettings } from "../HelpMessages";
import "./tournament-settings.css";
import ScheduleCalendar from "../schedule/ScheduleCalendar";

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
      <button
        type="button"
        className="tournament-settings-add-banner"
        onClick={() => {
          setDisabled(false);
          setTimeout(() => bannerInput.current.focus(), 100);
        }}
      >
        <Tooltip title="Add Banner">
          <span className="tournament-settings-add-banner-inner">
            <AddCircle fontSize="small" />
            <span>Add banner</span>
          </span>
        </Tooltip>
      </button>
    ) : (
      <Box className="tournament-settings-banner-row">
        <Typography className="tournament-settings-banner-text">
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
    <Box className="tournament-settings-banner-row">
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
    <div className="tournament-settings-subsection">
      <h3 className="tournament-settings-subsection-title">
        {audience === "all"
          ? "Site-wide banners"
          : audience === "captains"
          ? "Captains-wide banners"
          : "Ballkid-specific banners"}
      </h3>

      <div className="tournament-settings-banner-list">
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
      </div>
      {/* {disabled ? (
        ""
      ) : (
        <Button size="small" onClick={() => setDisabled(true)}>
          Cancel
        </Button>
      )} */}
    </div>
  );
}

function RemoveOutliers({ tournament, setSuccessMsg, setErrorMsg }) {
  const [param, setParam] = useState(tournament.rcal_ignore_outliers);
  const [disabled, setDisabled] = useState(true);

  return (
    <div className="tournament-settings-row-control">
      <TextField
        className="tournament-settings-param-input"
        variant="standard"
        size="small"
        value={param}
        style={{ width: 88 }}
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
    <div className="tournament-settings-row-control">
      <TextField
        className="tournament-settings-param-input"
        variant="standard"
        size="small"
        value={param}
        style={{ width: 88 }}
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
    <div className="tournament-settings-row-control">
      <TextField
        className="tournament-settings-param-input"
        variant="standard"
        size="small"
        value={param}
        style={{ width: 88 }}
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

function CalibrationThreshold({ tournament, setSuccessMsg, setErrorMsg }) {
  const [param, setParam] = useState(tournament.rcal_calibration_threshold);
  const [disabled, setDisabled] = useState(true);

  return (
    <div className="tournament-settings-row-control">
      <TextField
        className="tournament-settings-param-input"
        variant="standard"
        size="small"
        value={param}
        style={{ width: 88 }}
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
              rcal_calibration_threshold: param,
            }),
          }).then((response) => {
            if (response.ok) {
              setSuccessMsg(
                "Calibration distance to ideal threshold was updated!"
              );
            } else {
              setErrorMsg(
                "Error updating calibration distance to ideal threshold."
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

function todayStr() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

function dateToSlash(d) {
  if (!d) return null;
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

function TournamentDateField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const display = value
    ? value.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="tournament-settings-date-field">
      <span className="tournament-settings-date-field-label">{label}</span>
      <button
        type="button"
        className="tournament-settings-date-field-btn"
        onClick={() => setOpen(true)}
      >
        <span
          className={
            display
              ? "tournament-settings-date-field-value"
              : "tournament-settings-date-field-placeholder"
          }
        >
          {display ?? "Select date"}
        </span>
        <span className="tournament-settings-date-field-icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
            <rect
              x="3.5"
              y="5"
              width="17"
              height="16"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M3.5 9.5H20.5"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M8 3V6.5M16 3V6.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <ScheduleCalendar
          date={dateToSlash(value) ?? todayStr()}
          today={todayStr()}
          onSelect={(dateStr) => {
            const [mm, dd, yyyy] = dateStr.split("/");
            onChange(new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)));
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function CreateTournament({ setUpdated, setSuccessMsg, setErrorMsg }) {
  const [year, setYear] = useState(getCurrentYear());
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  return (
    <div className="tournament-settings-create-grid">
      <p className="tournament-settings-create-note">
        No tournament currently exists for this year. Create one to configure
        dates and settings.
      </p>

      <div className="tournament-settings-create-fields">
        <div className="tournament-settings-year-field">
          <span className="tournament-settings-date-field-label">Year</span>
          <TextField
            className="tournament-settings-param-input"
            value={year}
            variant="standard"
            type="number"
            required
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          />
        </div>

        <div className="tournament-settings-date-row">
          <TournamentDateField
            label="Start Date"
            value={start}
            onChange={setStart}
          />
          <TournamentDateField label="End Date" value={end} onChange={setEnd} />
        </div>
      </div>

      <Button
        color="primary"
        variant="contained"
        onClick={() => {
          if (start === null || end === null) {
            setErrorMsg("Start and end dates are required.");
          } else if (start.getTime() >= end.getTime()) {
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
    </div>
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
    <div className="page tournament-settings-shell">
      <Banners />

      <div className="tournament-settings-page">
        <header className="tournament-settings-header">
          <div className="tournament-settings-title-row">
            <h1 className="tournament-settings-title">Tournament Settings</h1>
            <HelpIcon page="Tournament Settings" message={tournamentSettings} />
          </div>
          <p className="tournament-settings-subtitle">
            Manage banners, team visibility, rating calibration, and data
            exports.
          </p>
        </header>

        {successMsg ? (
          <div className="tournament-settings-alert success" role="status">
            {successMsg}
          </div>
        ) : null}
        {errorMsg ? (
          <div className="tournament-settings-alert error" role="alert">
            {errorMsg}
          </div>
        ) : null}

        {tournament.year === null ? (
          <section className="tournament-settings-card">
            <h2 className="tournament-settings-section-title">
              Create Tournament
            </h2>
            <CreateTournament
              setUpdated={setUpdated}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          </section>
        ) : (
          <div className="tournament-settings-stack">
            <section className="tournament-settings-card">
              <h2 className="tournament-settings-section-title">Banners</h2>
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
            </section>

            <section className="tournament-settings-card">
              <h2 className="tournament-settings-section-title">
                Team Visibility
              </h2>
              {["", "finals "].map((teamType) => (
                <div className="tournament-settings-row" key={teamType}>
                  <span className="tournament-settings-row-label">
                    Visibility of {teamType}teams to captains and ballkids
                  </span>
                  <div className="tournament-settings-toggle">
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
                  </div>
                </div>
              ))}
            </section>

            <section className="tournament-settings-card">
              <h2 className="tournament-settings-section-title">
                Calibration Settings
              </h2>
              <div className="tournament-settings-row">
                <span className="tournament-settings-row-label">
                  Distance-to-ideal threshold (exclude captains&apos; ratings)
                </span>
                <CalibrationThreshold
                  tournament={tournament}
                  setSuccessMsg={setSuccessMsg}
                  setErrorMsg={setErrorMsg}
                />
              </div>
              <div className="tournament-settings-row">
                <span className="tournament-settings-row-label">
                  Ignore outliers parameter
                </span>
                <RemoveOutliers
                  tournament={tournament}
                  setSuccessMsg={setSuccessMsg}
                  setErrorMsg={setErrorMsg}
                />
              </div>
              <div className="tournament-settings-row">
                <span className="tournament-settings-row-label">
                  Minimum year for calibration training (inclusive)
                </span>
                <YearThreshold
                  tournament={tournament}
                  setSuccessMsg={setSuccessMsg}
                  setErrorMsg={setErrorMsg}
                />
              </div>
              <div className="tournament-settings-row">
                <span className="tournament-settings-row-label">
                  Bucket size (days)
                </span>
                <BucketSize
                  tournament={tournament}
                  setSuccessMsg={setSuccessMsg}
                  setErrorMsg={setErrorMsg}
                />
              </div>
            </section>

            <section className="tournament-settings-card danger">
              <div className="tournament-settings-caution-head">
                <Warning fontSize="small" />
                <h2>Proceed with Caution</h2>
                <Warning fontSize="small" />
              </div>
              <div className="tournament-settings-row">
                <span className="tournament-settings-row-label">
                  Export and download all data from the database
                </span>
                <DownloadButton
                  setSuccessMsg={setSuccessMsg}
                  setErrorMsg={setErrorMsg}
                />
              </div>
              <div className="tournament-settings-row">
                <span className="tournament-settings-row-label">
                  Archive all ballkids
                </span>
                <ArchiveButton />
              </div>
              <div className="tournament-settings-row">
                <span className="tournament-settings-row-label">
                  Reset all data for this year
                </span>
                <ResetDataButton />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
