import React, { useState, useRef } from "react";
import { useSearchParams, Link as RouterLink } from "react-router-dom";

import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Rating from "@mui/material/Rating";

import Delete from "@mui/icons-material/Delete";

import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { getLocalStorage, ConfirmDialog } from "../Utils";

export default function RatingsGrid({ ratings, setUpdated }) {
  const [open, setOpen] = useState(false);
  const [deleteRatingId, setDeleteRatingId] = useState();

  const group = getLocalStorage("group");

  // eslint-disable-next-line no-unused-vars
  const [searchParams, setSearchParams] = useSearchParams();
  const rateeId = searchParams.get("ratee");
  const raterId = searchParams.get("rater");

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
        <Link
          component={RouterLink}
          to={
            rowData.row.ratee === getLocalStorage("ballkid_id")
              ? "/me"
              : `/ballkid/${rowData.row.ratee}`
          }
        >
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
        <Link
          component={RouterLink}
          to={
            rowData.row.rater === getLocalStorage("ballkid_id")
              ? "/me"
              : `/ballkid/${rowData.row.rater}`
          }
        >
          {rowData.row.rater_name}
        </Link>
      ),
      valueGetter: (rowData) => rowData.row.rater_name,
    },
    {
      field: "rateeId",
      headerName: "Ratee ID",
      valueGetter: (rowData) => rowData.row.ratee,
      hide: true,
    },
    {
      field: "raterId",
      headerName: "Rater ID",
      valueGetter: (rowData) => rowData.row.rater,
      hide: true,
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
      <ConfirmDialog
        message="Deleting a rating permanently erases all content in the rating,
            including the overall score, scores in each of the rating
            subcategories, and all comments. This action cannot be undone."
        url={`/api/delete-rating/${deleteRatingId}`}
        body={{}}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
        method="DELETE"
      />

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
                    columnField: rateeId === null ? "raterId" : "rateeId",
                    operatorValue: "equals",
                    value: rateeId === null ? raterId : rateeId,
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
