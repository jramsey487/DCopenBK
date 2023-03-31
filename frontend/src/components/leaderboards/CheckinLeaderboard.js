import React, { useState, useEffect } from "react";
import { Typography, Link } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import { getAuthHeader, getTimeStr, getTimeFloat } from "../Utils";

export default function CheckinLeaderboard(props) {
  const [checkinTimes, setCheckinTimes] = useState([]);

  useEffect(() => {
    fetch("/api/get-checkin-analytics", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setCheckinTimes(data));
    // .then((data) => console.log(data));
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
      width: 200,
      renderCell: (rowData) => (
        <Link href={`/ballkid/${rowData.row.ballkid_id}`}>
          {rowData.row.ballkid_name}
        </Link>
      ),
    },
    {
      field: "time",
      headerName: "Total Time",
      width: 200,
      renderCell: (rowData) => getTimeStr(getTimeFloat(rowData.row.time)),
    },
    {
      field: "days",
      headerName: "# of Days",
      width: 100,
      valueGetter: (rowData) => rowData.row.days,
    },
    {
      field: "timePerDay",
      headerName: "Average Time Per Day",
      width: 200,
      valueGetter: (rowData) =>
        getTimeStr(getTimeFloat(rowData.row.time) / rowData.row.days),
    },
  ];

  const rows = checkinTimes.map((ballkid, index) => ({
    id: ballkid.id,
    rank: index + 1,
    ballkid_name: ballkid.ballkid_name,
    days: ballkid.total_checkin_days,
    time: ballkid.total_checkin_duration,
  }));

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 2 }}>
        Check-in Leaderboard
      </Typography>

      <div style={{ height: 500 }}>
        <DataGrid
          columns={columns}
          rows={rows}
          pageSize={25}
          density="compact"
        />
      </div>
    </div>
  );
}
