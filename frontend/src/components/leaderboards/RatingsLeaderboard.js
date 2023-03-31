import React, { useState, useEffect } from "react";
import { Typography, Link } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import { getAuthHeader } from "../Utils";

export default function RatingsLeaderboard(props) {
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
      width: 200,
      renderCell: (rowData) => (
        <Link href={`/ballkid/${rowData.row.ballkid_id}`}>
          {rowData.row.ballkid_name}
        </Link>
      ),
    },
    {
      field: "numRatings",
      headerName: "# of Ratings",
      width: 300,
      valueGetter: (rowData) => rowData.row.numRatings,
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
        Ratings Leaderboard
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
