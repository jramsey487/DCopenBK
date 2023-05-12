import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";

import { DataGrid } from "@mui/x-data-grid";

import { Icons, getAuthHeader } from "../Utils";

export default function BallkidLeaderboard(props) {
  const [ballkids, setBallkids] = useState([]);

  useEffect(() => {
    fetch("/api/get-ballkid-leaderboard", { headers: getAuthHeader() })
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
      headerName: "Ballkid",
      width: 200,
      renderCell: (rowData) => (
        <div className="sxs">
          <Link href={`/ballkid/${rowData.row.id}`}>
            {rowData.row.ballkid.first_name} {rowData.row.ballkid.last_name}
          </Link>
          &thinsp;
          <Icons ballkid={rowData.row.ballkid} margin={0} />
        </div>
      ),
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
      width: 150,
      valueGetter: (rowData) => rowData.row.ballkid.raw_avg,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "stdevRating",
      headerName: "Standard Deviation",
      width: 150,
      valueGetter: (rowData) => rowData.row.ballkid.raw_stdev,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "offset",
      headerName: "Calibrated Average",
      width: 150,
      valueGetter: (rowData) => rowData.row.ballkid.calibrated_avg,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "improvement",
      headerName: "Calibrated St. Dev.",
      width: 150,
      valueGetter: (rowData) => rowData.row.ballkid.calibrated_stdev,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
  ];

  const rows = ballkids.map((ballkid) => ({
    id: ballkid.id,
    ballkid: ballkid,
  }));

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 2 }}>
        Ratings Leaderboard - Ballkid
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
