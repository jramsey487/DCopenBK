import React, { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { useDrag } from "react-dnd";
import { Link as RouterLink } from "react-router-dom";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import CardActionArea from "@mui/material/CardActionArea";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Select from "@mui/material/Select";

import AspectRatio from "@mui/joy/AspectRatio";

import GridView from "@mui/icons-material/GridView";
import List from "@mui/icons-material/List";
import Check from "@mui/icons-material/Check";
import Help from "@mui/icons-material/Help";

import RatingDialog from "./ratings/RatingDialog";
import { END_DATE, START_DATE, ICON_DICT, TOOLTIP_DICT } from "./Consts";
import { MenuItem, Tooltip } from "@mui/material";

export function Icons({ ballkid, margin, isTeamsPage = false }) {
  const group = getLocalStorage("group");

  if (
    !ballkid.is_captain &&
    ballkid.num_years_experience <= 3 &&
    ballkid.num_years_experience > 0
  ) {
    return "";
  }

  return (
    <Icon sx={{ mb: margin }}>
      {ballkid.is_chairperson && ICON_DICT["chairperson"]}
      {ballkid.is_captain && ICON_DICT["captain"]}
      {group !== "ballkid" &&
        ballkid.num_years_experience === 0 &&
        ballkid.is_out_of_town &&
        isTeamsPage &&
        ICON_DICT["outOfTownRookie"]}
      {group !== "ballkid" &&
        ballkid.num_years_experience === 0 &&
        ICON_DICT["rookie"]}
      {ballkid.num_years_experience > 3 && isTeamsPage && ICON_DICT["supervet"]}
    </Icon>
  );
}

export function LayoutButtons({ gridLayout, setGridLayout }) {
  return (
    <div sx={{ mb: 1 }}>
      {[true, false].map((isGridButton) => (
        <Tooltip
          title={isGridButton ? "Grid View" : "List View"}
          key={isGridButton}
        >
          <IconButton
            size="small"
            style={{
              borderRadius: 0,
              background: isGridButton === gridLayout ? "lightgray" : "",
            }}
            onClick={(e) => {
              setGridLayout(isGridButton);
              setLocalStorage("gridLayout", isGridButton);
            }}
          >
            {isGridButton ? <GridView /> : <List />}
          </IconButton>
        </Tooltip>
      ))}
    </div>
  );
}

export function Alerts({ successMsg, errorMsg, setSuccessMsg, setErrorMsg }) {
  return (
    <Collapse
      in={
        (errorMsg !== null && errorMsg !== "" && errorMsg !== undefined) ||
        (successMsg !== null && successMsg !== "" && successMsg !== undefined)
      }
    >
      {successMsg !== "" ? (
        <Alert
          severity="success"
          onClose={() => {
            setSuccessMsg("");
          }}
        >
          {successMsg}
        </Alert>
      ) : (
        <Alert
          severity="error"
          onClose={() => {
            setErrorMsg("");
          }}
        >
          {errorMsg}
        </Alert>
      )}
    </Collapse>
  );
}

export function RatingButton({ ballkid, setUpdated, isMobile }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <RatingDialog
        open={open}
        setOpen={setOpen}
        ballkid={ballkid}
        setUpdated={setUpdated}
      />

      <Button
        variant={ballkid.have_rated ? "outlined" : "contained"}
        disableElevation
        color="primary"
        size="small"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        endIcon={ballkid.have_rated ? <Check /> : ""}
        sx={{ my: isMobile ? 1 : 0.2 }}
      >
        Give rating
      </Button>
    </div>
  );
}

export function SearchBox({ setSearchKeyword }) {
  return (
    <TextField
      size="small"
      type="search"
      variant="outlined"
      fullWidth
      sx={{ py: 1 }}
      placeholder="Search by name..."
      defaultValue={getLocalStorage("searchKeyword")}
      onChange={(e) => {
        setSearchKeyword(e.target.value);
        setLocalStorage("searchKeyword", e.target.value);
      }}
    />
  );
}

export function SearchAndFilter({
  setSearchKeyword,
  filterGroup,
  setFilterGroup,
  filters = ["rookie", "captain", "chairperson", "back", "net"],
}) {
  return (
    <Grid item xs={12} className="justify">
      <SearchBox setSearchKeyword={setSearchKeyword} />
      &emsp;
      <div className="sxs">
        <Typography variant="body1" noWrap>
          Filter to:
        </Typography>
        &ensp;
        {filters.map((filterName) => (
          <Tooltip key={filterName} title={TOOLTIP_DICT[filterName]}>
            <IconButton
              size="small"
              style={{
                borderRadius: 0,
                background: filterGroup === filterName ? "lightgray" : "",
              }}
              onClick={() => {
                filterGroup === filterName
                  ? setLocalStorage("filterGroup", null)
                  : setLocalStorage("filterGroup", filterName);
                setFilterGroup(getLocalStorage("filterGroup"));
              }}
            >
              {ICON_DICT[filterName]}
            </IconButton>
          </Tooltip>
        ))}
      </div>
    </Grid>
  );
}

export function TournamentBanner() {
  const [banners, setBanners] = useState([]);
  const [open1, setOpen1] = useState(true);
  const [open2, setOpen2] = useState(true);
  const [open3, setOpen3] = useState(true);

  const openSetOpenList = [
    [open1, setOpen1],
    [open2, setOpen2],
    [open3, setOpen3],
  ];

  useEffect(() => {
    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setBanners([data.banner1, data.banner2, data.banner3]));
  }, []);

  return (
    <Box>
      {banners.map((banner, index) =>
        banner === undefined || banner === null || banner === "" ? (
          ""
        ) : (
          <Collapse in={openSetOpenList[index][0]} key={index}>
            <Alert
              severity="warning"
              variant="filled"
              onClose={() => openSetOpenList[index][1](false)}
            >
              {banner}
            </Alert>
          </Collapse>
        )
      )}
    </Box>
  );
}

export function HideShowToggle({
  teamType,
  showTeams,
  setShowTeams,
  setSuccessMsg,
  setErrorMsg,
}) {
  const teamStr = teamType === "finals" ? "Finals teams" : "Teams";
  const showMessage = `${teamStr} are now visible to ballkids and captains.`;
  const hideMessage = `${teamStr} are now hidden from ballkids and captains.`;

  return (
    <div className="sxs">
      <Typography variant="body1">Hide</Typography>
      <Switch
        checked={showTeams}
        onClick={(e) => {
          setShowTeams(e.target.checked);
          fetch("/api/get-tournament", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify(
              teamType === ""
                ? {
                    show_teams: e.target.checked,
                  }
                : {
                    show_finals_teams: e.target.checked,
                  }
            ),
          }).then((response) => {
            if (response.ok) {
              setSuccessMsg(e.target.checked ? showMessage : hideMessage);
            } else {
              setErrorMsg(`${teamStr} visibility setting not updated.`);
            }
          });
        }}
      />
      <Typography variant="body1">Show</Typography>
    </div>
  );
}

export function TabbedSections({ sections }) {
  const [tabIndex, setTabIndex] = useState(0);
  const [mobileSelection, setMobileSelection] = useState(
    Object.keys(sections)[0]
  );

  const isMobile = useIsMobile();

  return isMobile ? (
    <div>
      <Select
        value={mobileSelection}
        sx={{ mb: 1 }}
        onChange={(e) => setMobileSelection(e.target.value)}
      >
        {Object.keys(sections).map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
      <Box sx={{ mx: 1 }}>{sections[mobileSelection]}</Box>
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
        {Object.keys(sections).map((label, index) => (
          <Tab key={index} label={label} />
        ))}
      </Tabs>

      {Object.keys(sections).map((label, index) => (
        <Box key={index} hidden={tabIndex !== index} sx={{ mx: 4 }}>
          {tabIndex === index && sections[label]}
        </Box>
      ))}
    </Box>
  );
}

export function CourtAssignment({ nextShifts }) {
  const hasAnotherShift = nextShifts.length > 0;
  const isCurrentlyOn =
    hasAnotherShift && isCurrentHour(nextShifts[0]["start"]);
  const court = hasAnotherShift ? nextShifts[0]["court"] : "";
  const time = hasAnotherShift ? dayHourToStr(nextShifts[0]["start"]) : "";

  return (
    <Typography variant="subtitle2">
      {!hasAnotherShift
        ? "No more shifts"
        : isCurrentlyOn
        ? `Currently on: ${court}`
        : `On at ${time}: ${court}`}
    </Typography>
  );
}

export function ConfirmDialog({
  message,
  url,
  body,
  open,
  setOpen,
  setUpdated,
  method = "PATCH",
}) {
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>Confirm</DialogTitle>
      <DialogContent>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />

        <DialogContentText>{message} Do you wish to proceed?</DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() =>
            fetch(url, {
              method: method,
              headers: getAuthHeader(),
              body: body,
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Success!");
                setTimeout(() => {
                  setOpen(false);
                  setSuccessMsg("");
                  setUpdated(true);
                }, 2500);
              } else {
                setErrorMsg("Error.");
              }
            })
          }
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function DraggableBallkidAndIcon({ ballkid }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ballkid",
    item: { ...ballkid },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="sxs">
        <Link
          variant="body2"
          component={RouterLink}
          to={
            ballkid.id === getLocalStorage("ballkid_id")
              ? "/me"
              : `/ballkid/${ballkid.id}`
          }
        >
          {ballkid.first_name} {ballkid.last_name}
        </Link>
        &thinsp;
        <Icons ballkid={ballkid} margin={0} isTeamsPage={true} />
      </div>
    </div>
  );
}

export function BallkidAndIcon({ ballkid }) {
  return (
    <div className="sxs">
      <Link
        variant="body2"
        component={RouterLink}
        to={
          ballkid.id === getLocalStorage("ballkid_id")
            ? "/me"
            : `/ballkid/${ballkid.id}`
        }
      >
        {ballkid.first_name} {ballkid.last_name}
      </Link>
      &thinsp;
      <Icons ballkid={ballkid} margin={0} />
    </div>
  );
}

export function BallkidCard({ ballkid, renderAdditional }) {
  const gridLayout = getLocalStorage("gridLayout");

  return (
    <Card>
      <CardActionArea
        component={RouterLink}
        to={
          ballkid.id === getLocalStorage("ballkid_id")
            ? "/me"
            : `/ballkid/${ballkid.id}`
        }
      >
        {!gridLayout ? (
          ""
        ) : (
          <AspectRatio ratio="1/1">
            <CardMedia component="img" image={ballkid.image} />
          </AspectRatio>
        )}
        <CardContent>
          <div className={gridLayout ? "" : "justify"}>
            <div className={gridLayout ? "justify" : "sxs"}>
              <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                {ballkid.first_name} {ballkid.last_name}
              </Typography>
              &thinsp;
              <Icons ballkid={ballkid} margin={0} />
            </div>
            {renderAdditional}
          </div>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function HelpIcon({ page, message }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{page} Help</DialogTitle>
        <DialogContent>{message}</DialogContent>
      </Dialog>

      <Tooltip title="Help">
        <IconButton color="disabled" onClick={() => setOpen(true)}>
          <Help />
        </IconButton>
      </Tooltip>
    </div>
  );
}

export function filterBallkids(ballkids, searchKeyword, filterGroup) {
  return ballkids.filter(
    (ballkid) =>
      `${ballkid.first_name} ${ballkid.last_name}`
        .toLowerCase()
        .includes(searchKeyword.toLowerCase()) &
      (!filterGroup ||
        (filterGroup === "rookie" && ballkid.num_years_experience === 0) ||
        (filterGroup === "captain" && ballkid.is_captain) ||
        (filterGroup === "chairperson" && ballkid.is_chairperson) ||
        (filterGroup === "back" && ballkid.preferred_position !== "Net") ||
        (filterGroup === "net" && ballkid.preferred_position !== "Back"))
  );
}

// Converts a time of format
// [year]-[month]-[day]T[24hour]:[minute]:[seconds]
// into [12hour][am/pm]
export function dayHourToStr(day_hour) {
  const military_hour = parseInt(day_hour.slice(11, 13));
  const suffix = military_hour >= 12 ? "pm" : "am";
  const hour = ((military_hour + 11) % 12) + 1;
  return hour + suffix;
}

export function getDays() {
  // Note that these dates are 0-indexed!!
  const startDate = new Date(START_DATE);
  const endDate = new Date(END_DATE);

  const days = [];
  const date = startDate;
  while (date <= endDate) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return days;
}

// Converts duration string into float as # of hours. Assumes format of:
// {days} {hours}:{minutes}:{seconds}.{milliseconds} OR
// {hours}:{minutes}:{seconds}.{milliseconds}. Returns as float of # hours
export function getTimeFloat(timeStr) {
  var day = 0;
  var hour = 0;
  var minute = 0;

  if (timeStr !== "" && timeStr !== null && timeStr !== undefined) {
    const hourStr = timeStr.split(":")[0];

    if (hourStr.length > 2) {
      day = parseInt(hourStr.split(" ")[0]);
      hour = parseInt(hourStr.split(" ")[1]);
    } else {
      hour = parseInt(hourStr);
    }

    minute = parseInt(timeStr.split(":")[1]);
  }

  return day * 24 + hour + minute / 60;
}

// Takes as input a float which represents the total duration in # hours
// as a float. Outputs as {hours} hrs {minutes} mins
export function getDurationStr(timeFloat, verbose = true) {
  if (timeFloat === null || isNaN(timeFloat)) {
    timeFloat = 0;
  }

  const hours = Math.floor(timeFloat);
  const mins = parseInt((timeFloat % 1) * 60).toLocaleString("en-US", {
    minimumIntegerDigits: 2,
  });

  return verbose ? hours + " hrs " + mins + " mins" : hours + ":" + mins;
}

// Takes as input a string or float which represents the time. Outputs as
// {hour}:{minute} AM/PM. If a string, assumes a format of {hour}:{minute}:{seconds}...
// If a float, assumes that the time is given in hours.
export function getTimeStr(input) {
  if (
    input === null ||
    input === undefined ||
    input === "" ||
    Number.isNaN(input)
  ) {
    return "";
  }

  var military_hour, minute;

  if (typeof input === "string" || input instanceof String) {
    const index = input.indexOf(":");
    military_hour = Number.parseInt(input.slice(0, index));
    minute = input.slice(index + 1, index + 3);
  } else {
    military_hour = Math.floor(input) % 24;
    minute = String(Math.round((input % 1) * 60)).padStart(2, "0");
  }

  const suffix = military_hour >= 12 ? " PM" : " AM";
  const hour = ((military_hour + 11) % 12) + 1;
  return `${hour}:${minute} ${suffix}`;
}

// Renders a float as a percent with 1 decimal point
export function toPercent(val) {
  const percent = Number((val * 100).toFixed(1));
  return `${percent}%`;
}

// Checks if the shift start time string in the format
// [year]-[month]-[day]T[24hour]:[minute]:[seconds]
// is occurring right now
export function isCurrentHour(hour) {
  const shiftDate = hour.substring(0, 10);
  const shiftHour = parseInt(hour.substring(11, 14));

  const nowDate = getToday("hyphen");
  const nowHours = new Date().getHours();

  return shiftHour === nowHours && shiftDate === nowDate;
}

// Returns today as a string of the format:
// slash: [month]/[day]/[year]
// hyphen: [year]-[month]-[day]
// No other formats are recognized.
export function getToday(format = "slash") {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  const yyyy = today.getFullYear();

  if (format === "slash") {
    return `${mm}/${dd}/${yyyy}`;
  } else if (format === "hyphen") {
    return `${yyyy}-${mm}-${dd}`;
  }
}

export function getLocalStorage(key) {
  const valString = localStorage.getItem(key);
  return JSON.parse(valString);
}

export function setLocalStorage(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

export function getToken() {
  return getLocalStorage("token");
}

export function getAuthHeader() {
  return new Headers({
    Authorization: "Token " + getToken(),
    "Content-Type": "application/json",
  });
}

export function useToken() {
  const getToken = () => {
    const tokenString = localStorage.getItem("token");
    return JSON.parse(tokenString);
  };
  const [token, setToken] = useState(getToken());

  const saveToken = (userToken) => {
    localStorage.setItem("token", JSON.stringify(userToken));
    setToken(userToken);
  };

  return { setToken: saveToken, token };
}

export function handleChange(e, state, setState) {
  setState({ ...state, [e.target.name]: e.target.value });
}

export function useIsMobile() {
  return useMediaQuery({ query: "(max-width: 750px)" });
}
