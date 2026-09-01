import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";

import { DataGrid } from "@mui/x-data-grid";

import {
  getAuthHeader,
  getDurationStr,
  getLocalStorage,
  BallkidAndIcon,
} from "../Utils";
import { LEADERBOARD_BALLKID_COL_WIDTH_WIDE } from "./LeaderboardsShared";

export default function MatchLeaderboard(props) {
  const [checkinTimes, setCheckinTimes] = useState([]);

  useEffect(() => {
    fetch("/api/get-checkin-times", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setCheckinTimes(data));
  }, []);

  const columns = [
    {
      field: "rank",
      headerName: "Rank",
      width: 75,
      valueGetter: (rowData) => rowData.row.rank,
    },
    {
      field: "name",
      headerName: "Ballkid",
      width: LEADERBOARD_BALLKID_COL_WIDTH_WIDE,
      renderCell: (rowData) => <BallkidAndIcon ballkid={rowData.row.ballkid} />,
    },
    {
      field: "time",
      headerName: "Total Time",
      width: 300,
      renderCell: (rowData) => getDurationStr(rowData.row.time),
    },
    {
      field: "days",
      headerName: "# of Days",
      width: 200,
      valueGetter: (rowData) => rowData.row.days,
    },
    {
      field: "timePerDay",
      headerName: "Average Time Per Day",
      width: 200,
      valueGetter: (rowData) => rowData.row.timePerDay,
    },
  ];

  const rows = checkinTimes.map((analytic, index) => ({
    id: analytic.id,
    rank: index + 1,
    ballkid_id: analytic.ballkid,
    ballkid_name: analytic.ballkid_name,
    time: analytic.duration,
  }));

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 2 }}>
        Match Leaderboard
      </Typography>

      <div style={{ height: 500 }}>
        <DataGrid columns={columns} rows={rows} density="compact" />
      </div>
    </div>
  );
}
