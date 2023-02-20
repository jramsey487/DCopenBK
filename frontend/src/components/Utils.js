import React, { useState, useRef } from "react";
import {
  Icon,
  IconButton,
  Alert,
  Collapse,
  Rating,
  Paper,
  Button,
  Grid,
  Link,
  Popper,
  Box,
  Typography,
} from "@mui/material";
import { Star, Circle, GridView, List } from "@mui/icons-material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import RatingDialog from "./ratings/RatingDialog";
import { END_DATE, START_DATE } from "./Consts";

export function Icons({ ballkid, margin }) {
  if (!ballkid.is_captain && ballkid.num_years_experience > 0) {
    return "";
  }

  return (
    <Icon sx={{ mb: margin }}>
      {ballkid.is_captain ? <Star sx={{ color: "orange" }} /> : ""}
      {ballkid.num_years_experience === 0 ? (
        <Circle sx={{ color: "green" }} />
      ) : (
        ""
      )}
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

export function RatingsGrid(props) {
  // Note that a lot of this has been slimmed down from the code sandbox. If
  // this stops working in the future, try adding code back in from:
  // https://codesandbox.io/s/bjupl?file=/demo.js:0-67.
  const GridCellExpand = ({ width, value }) => {
    const cellDiv = useRef(null);
    const cellValue = useRef(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [showPopper, setShowPopper] = useState(false);

    const needsOverflow = (element) =>
      element.scrollHeight > element.clientHeight ||
      element.scrollWidth > element.clientWidth;

    return (
      <Box
        onMouseEnter={() => {
          setAnchorEl(cellDiv.current);
          setShowPopper(needsOverflow(cellValue.current));
        }}
        onMouseLeave={() => setShowPopper(false)}
        sx={{
          alignItems: "center",
          lineHeight: "24px",
          width: 1,
          height: 1,
          position: "relative",
          display: "flex",
        }}
      >
        <Box
          ref={cellDiv}
          sx={{
            height: 1,
            width,
            display: "block",
            position: "absolute",
            top: 0,
          }}
        />
        <Typography
          variant="body2"
          ref={cellValue}
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </Typography>

        <Popper
          open={showPopper && Boolean(anchorEl)}
          anchorEl={anchorEl}
          style={{ width }}
        >
          <Paper elevation={1}>
            <Typography variant="body2" style={{ padding: 5 }}>
              {value}
            </Typography>
          </Paper>
        </Popper>
      </Box>
    );
  };

  const ratings = props?.ratings;
  const rateeName = props.rateeName ?? "";
  const raterName = props.raterName ?? "";

  const ratingColWidth = 125;
  const commentsColWidth = 350;

  const columns = [
    {
      field: "date",
      headerName: "Date",
      type: "date",
      renderCell: (rowData) =>
        new Date(
          rowData.row.year,
          rowData.row.month - 1,
          rowData.row.day
        ).toLocaleDateString("en-us", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
    },
    {
      field: "ratee",
      headerName: "Ballkid",
      width: 150,
      renderCell: (rowData) => (
        <Link href={`/ballkid/${rowData.row.ratee}`}>
          {rowData.row.ratee_name}
        </Link>
      ),
      valueGetter: (rowData) => rowData.row.ratee_name,
    },
    {
      field: "rater",
      headerName: "Rater",
      width: 150,
      renderCell: (rowData) => (
        <Link href={`/ballkid/${rowData.row.rater}`}>
          {rowData.row.rater_name}
        </Link>
      ),
      valueGetter: (rowData) => rowData.row.rater_name,
    },
    {
      field: "rating",
      headerName: "Overall Rating",
      renderCell: (rowData) => (
        <Rating
          value={parseFloat(rowData.value)}
          precision={0.5}
          size="small"
          readOnly
        />
      ),
      width: ratingColWidth,
    },
    {
      field: "speedRating",
      headerName: "Speed Rating",
      renderCell: (rowData) =>
        rowData.value == null ? (
          ""
        ) : (
          <Rating
            value={parseFloat(rowData.value)}
            precision={0.5}
            size="small"
            readOnly
          />
        ),
      width: ratingColWidth,
    },
    {
      field: "decisionRating",
      headerName: "Decision-making Rating",
      renderCell: (rowData) =>
        rowData.value == null ? (
          ""
        ) : (
          <Rating
            value={parseFloat(rowData.value)}
            precision={0.5}
            size="small"
            readOnly
          />
        ),
      width: ratingColWidth,
    },
    {
      field: "comments",
      headerName: "Comments",
      width: commentsColWidth,
      renderCell: (params) => (
        <GridCellExpand
          value={params.value || ""}
          width={params.colDef.computedWidth}
        />
      ),
    },
  ];

  const rows = ratings.map((rating) => ({
    id: rating.id,
    date: rating.date,
    ratee: rating.ratee,
    rater: rating.rater,
    ratee_name: rating.ratee_name,
    rater_name: rating.rater_name,
    rating: rating.rating,
    speedRating: rating.speed_rating,
    decisionRating: rating.decision_rating,
    comments: rating.comments,
    year: rating.year,
    month: rating.month,
    day: rating.day,
  }));

  return (
    <div style={{ height: 500 }}>
      <DataGrid
        columns={columns}
        rows={rows}
        pageSize={25}
        density="compact"
        components={{
          Toolbar: GridToolbar,
        }}
        initialState={{
          filter: {
            filterModel: {
              items: [
                {
                  columnField: rateeName === "" ? "rater" : "ratee",
                  operatorValue: "contains",
                  value: rateeName === "" ? raterName : rateeName,
                },
              ],
            },
          },
        }}
      />
    </div>
  );
}

export function RatingButton({ ballkid }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <RatingDialog open={open} setOpen={setOpen} ballkid={ballkid} />

      <Button
        variant="outlined"
        color="primary"
        size="small"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
      >
        Give Rating
      </Button>
    </div>
  );
}

export function RatingAndLabel({ label, rating, setRating }) {
  return (
    <Grid
      item
      className="justify"
      sx={{ mt: 1, mb: 0.5 }}
      style={{ maxWidth: "350px" }}
    >
      <Typography variant="h6">{label}</Typography>
      <Rating
        precision={0.5}
        value={rating}
        onChange={(e, newVal) => setRating(newVal)}
      />
    </Grid>
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

export function getTimeFloat(str) {
  var timeStr, days;
  if (str.includes(" ")) {
    timeStr = str.split(" ")[1];
    days = parseInt(str.split(" ")[0]);
  } else {
    timeStr = str;
    days = 0;
  }

  const hours = parseInt(timeStr.split(":")[0]);
  const minutes = parseInt(timeStr.split(":")[1]);

  return 24 * days + hours + minutes / 60;
}

export function getTimeStr(timeStr) {
  console.log(timeStr);
  var day = 0;
  var hour = 0;
  var minute = 0;

  if (timeStr !== "") {
    const hourStr = timeStr.split(":")[0];

    if (hourStr.length > 2) {
      day = parseInt(hourStr.split(" ")[0]);
      hour = parseInt(hourStr.split(" ")[1]);
    } else {
      hour = parseInt(hourStr);
    }

    minute = parseInt(timeStr.split(":")[1]);
  }

  return day * 24 + hour + " hrs " + minute + " mins";
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
