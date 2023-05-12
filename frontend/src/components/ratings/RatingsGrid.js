import React, { useState, useRef } from "react";

import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Rating from "@mui/material/Rating";

import Delete from "@mui/icons-material/Delete";

import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { getLocalStorage, getAuthHeader, Alerts } from "../Utils";

export default function RatingsGrid(props) {
  const [open, setOpen] = useState(false);
  const [deleteRatingId, setDeleteRatingId] = useState();
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const group = getLocalStorage("group");

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

  var columns =
    group !== "chairperson"
      ? []
      : [
          {
            field: "delete",
            headerName: "Delete",
            sortable: false,
            // type: "button",
            width: 70,
            renderCell: (rowData) => (
              <IconButton
                onClick={() => {
                  setDeleteRatingId(rowData.id);
                  setOpen(true);
                }}
              >
                <Delete />
              </IconButton>
            ),
          },
        ];

  columns = [
    ...columns,
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
      field: "athleticismRating",
      headerName: "Athleticism",
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
      field: "rollingRating",
      headerName: "Rolling",
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
      field: "awarenessRating",
      headerName: "Awareness",
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
      headerName: "Decision-making",
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
      field: "effortRating",
      headerName: "Effort",
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
    athleticismRating: rating.athleticism_rating,
    rollingRating: rating.rolling_rating,
    awarenessRating: rating.awareness_rating,
    decisionRating: rating.decision_rating,
    effortRating: rating.effort_rating,
    comments: rating.comments,
    year: rating.year,
    month: rating.month,
    day: rating.day,
  }));

  return (
    <div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{"Confirm Rating Deletion"}</DialogTitle>
        <DialogContent>
          <Alerts
            successMsg={successMsg}
            errorMsg={errorMsg}
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
          />

          <DialogContentText>
            Deleting a rating permanently erases all content in the rating,
            including the overall score, scores in each of the rating
            subcategories, and all comments. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() =>
              fetch("/api/delete-rating/" + deleteRatingId, {
                method: "DELETE",
                headers: getAuthHeader(),
              }).then((response) => {
                if (response.ok) {
                  setSuccessMsg("Rating deleted!");
                  setTimeout(() => {
                    setDeleteRatingId(null);
                    setOpen(false);
                    setSuccessMsg("");
                    props.setUpdated(true);
                  }, 2000);
                } else {
                  setErrorMsg("Error deleting rating.");
                }
              })
            }
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

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
    </div>
  );
}
