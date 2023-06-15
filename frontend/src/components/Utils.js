import React, { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";

import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";

import GridView from "@mui/icons-material/GridView";
import List from "@mui/icons-material/List";
import Check from "@mui/icons-material/Check";

import RatingDialog from "./ratings/RatingDialog";
import { END_DATE, START_DATE, ICON_DICT, MARGINS } from "./Consts";

export function Icons({ ballkid, margin }) {
  if (!ballkid.is_captain && ballkid.num_years_experience > 0) {
    return "";
  }

  return (
    <Icon sx={{ mb: margin }}>
      {ballkid.is_chairperson && ICON_DICT["chairperson"]}
      {ballkid.is_captain && ICON_DICT["captain"]}
      {ballkid.num_years_experience === 0 && ICON_DICT["rookie"]}
    </Icon>
  );
}

export function LayoutButtons({ gridLayout, setGridLayout }) {
  return (
    <div sx={{ mb: 1 }}>
      {[true, false].map((isGridButton) => (
        <IconButton
          key={isGridButton}
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
      ))}
    </div>
  );
}

export function Alerts(props) {
  return (
    <Collapse in={props.errorMsg !== "" || props.successMsg !== ""}>
      {props.successMsg !== "" ? (
        <Alert
          severity="success"
          onClose={() => {
            props.setSuccessMsg("");
          }}
        >
          {props.successMsg}
        </Alert>
      ) : (
        <Alert
          severity="error"
          onClose={() => {
            props.setErrorMsg("");
          }}
        >
          {props.errorMsg}
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
      placeholder="Search by ballkid name..."
      onChange={(e) => setSearchKeyword(e.target.value)}
    />
  );
}

export function SearchAndFilter({
  setSearchKeyword,
  filterGroup,
  setFilterGroup,
  filters = ["captain", "rookie", "chairperson"],
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
          <IconButton
            key={filterName}
            size="small"
            style={{
              borderRadius: 0,
              background: filterGroup === filterName ? "lightgray" : "",
            }}
            onClick={() => {
              filterGroup === filterName
                ? setFilterGroup(null)
                : setFilterGroup(filterName);
            }}
          >
            {ICON_DICT[filterName]}
          </IconButton>
        ))}
      </div>
    </Grid>
  );
}

export function HideShowToggle({ teamType, setSuccessMsg, setErrorMsg }) {
  const [showTeams, setShowTeams] = useState(false);

  const teamStr = teamType === "finals" ? "Finals teams" : "Teams";
  const showMessage = `${teamStr} are now visible to ballkids and captains.`;
  const hideMessage = `${teamStr} are now hidden from ballkids and captains.`;

  useEffect(() => {
    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) =>
        setShowTeams(
          data[teamType === "finals" ? "show_finals_teams" : "show_teams"]
        )
      );
  }, [teamType]);

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
            body: JSON.stringify({
              show_teams: teamType === "finals" ? null : e.target.checked,
              show_finals_teams:
                teamType === "finals" ? e.target.checked : null,
            }),
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

export function filterBallkids(ballkids, searchKeyword, filterGroup) {
  return ballkids.filter(
    (ballkid) =>
      `${ballkid.first_name} ${ballkid.last_name}`
        .toLowerCase()
        .includes(searchKeyword.toLowerCase()) &
      (!filterGroup ||
        (filterGroup === "rookie" && ballkid.num_years_experience === 0) ||
        (filterGroup === "captain" && ballkid.is_captain) ||
        (filterGroup === "chairperson" && ballkid.is_chairperson))
  );
}

export function renderBallkidFinalsHistory(finals) {
  return (
    <Grid item xs={12} sm={6.5} sx={MARGINS}>
      <Typography variant="h6">Previous Years' Finals:</Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">Year</TableCell>
              <TableCell align="center">Match Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {finals.map((final) => (
              <TableRow key={final.id}>
                <TableCell align="center">{final.year}</TableCell>
                <TableCell align="center">{final.match_type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
}

export function renderBallkidCutHistory(cuts) {
  return (
    <Grid item xs={12} sm={6.5} sx={MARGINS}>
      <Typography variant="h6">Cut History:</Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">Year</TableCell>
              <TableCell align="center">Furthest Day</TableCell>
              <TableCell align="center">Self-cut?</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cuts.map((cut) => (
              <TableRow key={cut.id}>
                <TableCell align="center">{cut.year}</TableCell>
                <TableCell align="center">{cut.furthest_day}</TableCell>
                <TableCell align="center">
                  {cut.self_cut ? "Yes" : "No"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
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

// Converts datetime string into human readable format. Assumes format of:
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
export function getTimeStr(timeFloat, verbose = true) {
  if (timeFloat === null || isNaN(timeFloat)) {
    timeFloat = 0;
  }

  const hours = Math.floor(timeFloat);
  const mins = parseInt((timeFloat % 1) * 60).toLocaleString("en-US", {
    minimumIntegerDigits: 2,
  });

  return verbose ? hours + " hrs " + mins + " mins" : hours + ":" + mins;
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
