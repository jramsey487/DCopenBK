import React, { useState, useEffect, useRef } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";

import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

import Done from "@mui/icons-material/Done";
import Edit from "@mui/icons-material/Edit";
import Delete from "@mui/icons-material/Delete";
import Close from "@mui/icons-material/Close";
import AddCircle from "@mui/icons-material/AddCircle";

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

// function Banner({
//   banner,
//   disabled,
//   setDisabled,
//   bannerInput,
//   setSuccessMsg,
//   setErrorMsg,
//   setUpdated,
//   newBanner = false,
// }) {
//   const [bannerMessage, setBannerMessage] = useState(
//     newBanner ? "" : banner.message
//   );

//   return disabled ? (
//     <Typography color="gray">{banner.message}</Typography>
//   ) : (
//     <Box className="sxs">
//       <TextField
//         variant="standard"
//         value={bannerMessage}
//         style={{ width: "90%" }}
//         disabled={disabled}
//         inputRef={newBanner ? bannerInput : undefined}
//         sx={{ mx: 2 }}
//         multiline
//         onChange={(e) => setBannerMessage(e.target.value)}
//       />
//       <Button
//         size="small"
//         disabled={banner.message === bannerMessage}
//         onClick={() =>
//           fetch("/api/update-banner", {
//             method: newBanner ? "POST" : "PATCH",
//             headers: getAuthHeader(),
//             body: JSON.stringify({
//               id: newBanner ? 0 : banner.id,
//               time: new Date().toLocaleString(),
//               message: bannerMessage,
//             }),
//           }).then((response) => {
//             if (response.ok) {
//               setDisabled(true);
//               setBannerMessage("");
//               setUpdated(true);

//               setSuccessMsg(
//                 "Banner updated for all ballkids and captains! Refresh page to view updated banners."
//               );
//             } else {
//               setErrorMsg("Error updating banner.");
//             }
//           })
//         }
//       >
//         {newBanner ? "Publish" : "Update"}
//       </Button>
//     </Box>
//   );
// }

// function BannerSection({ setSuccessMsg, setErrorMsg }) {
//   const [banners, setBanners] = useState([]);
//   const [disabled, setDisabled] = useState(true);
//   const [updated, setUpdated] = useState(false);

//   const bannerInput = useRef(null);

//   useEffect(() => {
//     fetch("/api/banner-list", {
//       method: "GET",
//       headers: getAuthHeader(),
//     })
//       .then((response) => response.json())
//       .then((data) => setBanners(data))
//       .then(() => setUpdated(false));
//   }, [updated]);

//   return (
//     <Grid item xs={12} className="justify">
//       <div className="sxs">
//         <Typography variant="subtitle1">Site-wide banner(s)</Typography>
//         <Button
//           size="small"
//           disabled={!disabled}
//           onClick={() => {
//             setDisabled(false);
//             setTimeout(() => bannerInput.current.focus(), 100);
//           }}
//           sx={{ mt: 0.5 }}
//         >
//           Edit
//         </Button>
//       </div>

//       <Box style={{ width: "75%" }} sx={{ ml: 2 }}>
//         {banners.map((banner, index) => (
//           <Banner
//             key={index}
//             banner={banner}
//             disabled={disabled}
//             setDisabled={setDisabled}
//             bannerInput={bannerInput}
//             setSuccessMsg={setSuccessMsg}
//             setErrorMsg={setErrorMsg}
//             setUpdated={setUpdated}
//           />
//         ))}

//         <Banner
//           banner={{}}
//           disabled={disabled}
//           setDisabled={setDisabled}
//           bannerInput={bannerInput}
//           setSuccessMsg={setSuccessMsg}
//           setErrorMsg={setErrorMsg}
//           setUpdated={setUpdated}
//           newBanner={true}
//         />
//       </Box>
//       {disabled ? (
//         ""
//       ) : (
//         <Button size="small" onClick={() => setDisabled(true)}>
//           Cancel
//         </Button>
//       )}
//     </Grid>
//   );
// }

function Banner({
  banner,
  bannerInput,
  setSuccessMsg,
  setErrorMsg,
  setUpdated,
  newBanner = false,
}) {
  const [disabled, setDisabled] = useState(true);
  const [bannerMessage, setBannerMessage] = useState(
    newBanner ? "" : banner.message
  );
  const [savedBanner, setSavedBanner] = useState(
    newBanner ? "" : banner.message
  );

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
      <TextField
        variant="standard"
        value={bannerMessage}
        style={{ width: "90%" }}
        disabled={disabled}
        inputRef={bannerInput}
        sx={{ mr: 2 }}
        multiline
        onChange={(e) => setBannerMessage(e.target.value)}
      />

      <IconButton
        size="small"
        disabled={banner.message === bannerMessage || bannerMessage === ""}
        onClick={() =>
          fetch("/api/update-banner", {
            method: newBanner ? "POST" : "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              id: newBanner ? 0 : banner.id,
              time: new Date().toLocaleString(),
              message: bannerMessage,
            }),
          }).then((response) => {
            if (response.ok) {
              setDisabled(true);
              setSavedBanner(bannerMessage);
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
          }}
        >
          <Close />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function BannerSection({ setSuccessMsg, setErrorMsg }) {
  const [banners, setBanners] = useState([]);
  const [updated, setUpdated] = useState(false);

  const bannerInput = useRef(null);

  useEffect(() => {
    fetch("/api/banner-list", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setBanners(data))
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <Grid item xs={12} className="justify-top">
      <Typography variant="subtitle1">Site-wide banner(s)</Typography>
      {/* <Button
          size="small"
          disabled={!disabled}
          onClick={() => {
            setDisabled(false);
            setTimeout(() => bannerInput.current.focus(), 100);
          }}
          sx={{ mt: 0.5 }}
        >
          Edit
        </Button> */}

      <Box style={{ width: "75%" }} sx={{ ml: 2 }}>
        {banners.map((banner, index) => (
          <Banner
            key={index}
            banner={banner}
            bannerInput={bannerInput}
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
            setUpdated={setUpdated}
          />
        ))}

        <Banner
          banner={{}}
          bannerInput={bannerInput}
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
