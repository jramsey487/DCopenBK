import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";

import { DataGrid } from "@mui/x-data-grid";

import {
  BallkidAndIcon,
  HelpIcon,
  TournamentBanner,
  getAuthHeader,
} from "../Utils";
import { Box } from "@mui/material";
import { ratingsCaptainLeaderboard } from "../HelpMessages";

export default function CaptainLeaderboard(props) {
  const [ballkids, setBallkids] = useState([]);

  useEffect(() => {
    fetch("/api/get-captain-leaderboard", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(data));
  }, []);

  const columns = [
    {
      field: "rank",
      headerName: "",
      width: 30,
      sortable: true,
      renderCell: (index) => index.api.getRowIndex(index.row.id) + 1,
    },
    {
      field: "name",
      headerName: "Captain / Chairperson",
      width: 200,
      renderCell: (rowData) => <BallkidAndIcon ballkid={rowData.row.ballkid} />,
    },
    {
      field: "numRatings",
      headerName: "# of Ratings",
      width: 100,
      valueGetter: (rowData) => rowData.row.ballkid.num_ratings,
    },
    {
      field: "avgRating",
      headerName: "Average",
      width: 140,
      valueGetter: (rowData) => rowData.row.ballkid.raw_avg,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "stdevRating",
      headerName: "Standard Deviation",
      width: 140,
      valueGetter: (rowData) => rowData.row.ballkid.raw_stdev,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "scale",
      headerName: "Calibration Scale",
      width: 140,
      valueGetter: (rowData) => rowData.row.ballkid.scale,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "offset",
      headerName: "Calibration Offset",
      width: 140,
      valueGetter: (rowData) => rowData.row.ballkid.offset,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "distanceToIdeal",
      headerName: "Distance To Ideal",
      width: 140,
      valueGetter: (rowData) => {
        const a = rowData.row.ballkid.scale;
        const b = rowData.row.ballkid.offset;

        // distance to ideal is 1/(4.5) int_{.5}^5 (ax + b - x)**2
        return (
          (1 / 4) * (37 * a ** 2 + a * (22 * b - 74) + 4 * b ** 2 - 22 * b + 37)
        );
      },
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
  ];

  const rows = ballkids.map((ballkid) => ({
    id: ballkid.id,
    ballkid: ballkid,
  }));

  return (
    <div className="page">
      <TournamentBanner />

      <Box className="sxs" sx={{ mb: 1 }}>
        <Typography variant="h4">Ratings Leaderboard - Captain</Typography>
        &thinsp;
        <HelpIcon
          page="Ratings Leaderboard - Captain"
          message={ratingsCaptainLeaderboard}
        />
      </Box>

      <div style={{ height: 500 }}>
        <DataGrid
          columns={columns}
          rows={rows}
          pageSize={25}
          density="compact"
        />
      </div>

      <Typography variant="body1" mt={2}>
        Note: Average is the average of all the ratings submitted (NOT received)
        by this captain/chairperson. Likewise for standard deviation.
        Calibration scale and offset are calculated for each rater based on
        their ratings submitted in 2022 and 2023 by the calibration method
        described{" "}
        <Link
          target="_blank"
          href="https://github.com/jtiosue/rcal/blob/master/report/review_calibration.pdf"
        >
          here
        </Link>
        .
      </Typography>
    </div>
  );
}
