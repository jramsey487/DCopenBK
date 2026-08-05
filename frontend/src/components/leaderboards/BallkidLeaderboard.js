import React, { useState, useEffect } from "react";

import Box from "@mui/material/Box";

import { DataGrid } from "@mui/x-data-grid";

import { BallkidAndIcon, getAuthHeader } from "../Utils";
import { ratingsBallkidLeaderboard } from "../HelpMessages";
import {
  LeaderboardShell,
  LeaderboardGridPanel,
  LeaderboardNote,
} from "./LeaderboardsShared";

export default function BallkidLeaderboard() {
  const [ballkids, setBallkids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/get-ballkid-leaderboard", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(data))
      .then(() => setLoading(false));
  }, []);

  const columns = [
    {
      field: "rank",
      headerName: "",
      width: 48,
      sortable: true,
      renderCell: (index) => index.api.getRowIndex(index.row.id) + 1,
    },
    {
      field: "name",
      headerName: "Ballkid",
      width: 180,
      renderCell: (rowData) => (
        <Box className="leaderboard-name-cell">
          <BallkidAndIcon ballkid={rowData.row.ballkid} />
        </Box>
      ),
    },
    {
      field: "numRatings",
      headerName: "# of Ratings",
      width: 110,
      valueGetter: (rowData) => rowData.row.ballkid.num_ratings,
    },
    {
      field: "avgRating",
      headerName: "Average",
      width: 110,
      valueGetter: (rowData) => rowData.row.ballkid.raw_avg,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "stdevRating",
      headerName: "Std. Dev.",
      width: 110,
      valueGetter: (rowData) => rowData.row.ballkid.raw_stdev,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "offset",
      headerName: "Calibrated Avg",
      width: 130,
      valueGetter: (rowData) => rowData.row.ballkid.calibrated_avg,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "improvement",
      headerName: "Calibrated Std. Dev.",
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
    <LeaderboardShell
      title="Ratings — Ballkid"
      helpPage="Ratings Leaderboard - Ballkid"
      helpMessage={ratingsBallkidLeaderboard}
      footer={
        <LeaderboardNote>
          Calibrated average and calibrated standard deviation only include
          ratings from raters within the tournament distance-to-ideal threshold.
          Average and standard deviation are raw values from all raters.
        </LeaderboardNote>
      }
    >
      <LeaderboardGridPanel loading={loading}>
        {!loading ? (
          <div className="ratings-grid-frame">
            <DataGrid
              columns={columns}
              rows={rows}
              density="compact"
              disableSelectionOnClick
            />
          </div>
        ) : null}
      </LeaderboardGridPanel>
    </LeaderboardShell>
  );
}
