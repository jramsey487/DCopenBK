import React, { useState } from "react";
import { useMediaQuery } from "react-responsive";
import { Icon, IconButton, Alert, Collapse, Button } from "@mui/material";
import {
  Star,
  Circle,
  GridView,
  List,
  EventSeat,
  Check,
} from "@mui/icons-material";
import RatingDialog from "./ratings/RatingDialog";
import { END_DATE, START_DATE } from "./Consts";

export function Icons({ ballkid, margin }) {
  if (!ballkid.is_captain && ballkid.num_years_experience > 0) {
    return "";
  }

  return (
    <Icon sx={{ mb: margin }}>
      {ballkid.is_chairperson && <EventSeat sx={{ color: "purple" }} />}
      {ballkid.is_captain && <Star sx={{ color: "orange" }} />}
      {ballkid.num_years_experience === 0 && <Circle sx={{ color: "green" }} />}
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
            setSessionStorage("gridLayout", isGridButton);
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

// export function getTimeFloat(str) {
//   var timeStr, days;
//   if (str.includes(" ")) {
//     timeStr = str.split(" ")[1];
//     days = parseInt(str.split(" ")[0]);
//   } else {
//     timeStr = str;
//     days = 0;
//   }

//   const hours = parseInt(timeStr.split(":")[0]);
//   const minutes = parseInt(timeStr.split(":")[1]);

//   return 24 * days + hours + minutes / 60;
// }

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

export function getToday() {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  const yyyy = today.getFullYear();

  return mm + "/" + dd + "/" + yyyy;
}

export function getSessionStorage(key) {
  const valString = sessionStorage.getItem(key);
  return JSON.parse(valString);
}

export function setSessionStorage(key, val) {
  sessionStorage.setItem(key, JSON.stringify(val));
}

export function getToken() {
  const tokenString = sessionStorage.getItem("token");
  return JSON.parse(tokenString);
}

export function getAuthHeader() {
  return new Headers({
    Authorization: "Token " + getToken(),
    "Content-Type": "application/json",
  });
}

export function useToken() {
  const getToken = () => {
    const tokenString = sessionStorage.getItem("token");
    return JSON.parse(tokenString);
  };
  const [token, setToken] = useState(getToken());

  const saveToken = (userToken) => {
    sessionStorage.setItem("token", JSON.stringify(userToken));
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
