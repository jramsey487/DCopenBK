import React, { useState, useRef } from "react";
import { Rating, Paper, Link, Popper, Box, Typography } from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";

export default function RatingsGrid(props) {
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
