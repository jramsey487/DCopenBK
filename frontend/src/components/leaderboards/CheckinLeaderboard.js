import React, { useState, useEffect } from "react";

import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TableBody from "@mui/material/TableBody";
import Box from "@mui/material/Box";

import { DataGrid } from "@mui/x-data-grid";

import {
  getAuthHeader,
  getTimeFloat,
  BallkidAndIcon,
  getTimeStr,
} from "../Utils";
import { checkinLeaderboard } from "../HelpMessages";
import {
  LeaderboardShell,
  LeaderboardGridPanel,
  LeaderboardAvgPanel,
  LeaderboardNote,
} from "./LeaderboardsShared";

function formatDurationShort(hoursFloat) {
  if (hoursFloat == null || !isFinite(hoursFloat) || hoursFloat < 0) {
    return "-";
  }
  const totalMinutes = Math.round(hoursFloat * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function AveragesTable({ averages }) {
  const totalDurationFloat = parseFloat(averages["checkin_avg"]) / 3600;
  const totalDaysFloat = parseFloat(averages["days_avg"]);
  const avgCheckinFloat = parseFloat(averages["avg_checkin_time"]) / 3600;

  return (
    <LeaderboardAvgPanel>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" />
              <TableCell align="center">Total Duration</TableCell>
              <TableCell align="center"># of Days</TableCell>
              <TableCell align="center">Average Duration per Day</TableCell>
              <TableCell align="center">Average Check-in Time</TableCell>
              <TableCell align="center">Average Check-out Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell align="center" className="leaderboard-avg-label">
                Average
              </TableCell>
              <TableCell align="center">
                {formatDurationShort(totalDurationFloat)}
              </TableCell>
              <TableCell align="center">
                {Number(totalDaysFloat).toFixed(1)}
              </TableCell>
              <TableCell align="center">
                {formatDurationShort(totalDurationFloat / totalDaysFloat)}
              </TableCell>
              <TableCell align="center">
                {getTimeStr(avgCheckinFloat)}
              </TableCell>
              <TableCell align="center">
                {getTimeStr(
                  avgCheckinFloat + totalDurationFloat / totalDaysFloat
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </LeaderboardAvgPanel>
  );
}

export default function CheckinLeaderboard() {
  const [ballkids, setBallkids] = useState([]);
  const [averages, setAverages] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/get-checkin-leaderboard", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(data));

    fetch("/api/get-average-checkin-leaderboard", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setAverages(data))
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
      field: "duration",
      headerName: "Total Duration",
      flex: 1,
      minWidth: 120,
      valueGetter: (rowData) => getTimeFloat(rowData.row.duration),
      valueFormatter: (obj) => formatDurationShort(obj.value),
    },
    {
      field: "days",
      headerName: "# of Days",
      width: 100,
      valueGetter: (rowData) => rowData.row.days,
    },
    {
      field: "durationPerDay",
      headerName: "Avg Duration / Day",
      flex: 1,
      minWidth: 140,
      valueGetter: (rowData) =>
        getTimeFloat(rowData.row.duration) / rowData.row.days,
      valueFormatter: (obj) => formatDurationShort(obj.value),
    },
    {
      field: "avgCheckinTime",
      headerName: "Avg Check-in",
      flex: 1,
      minWidth: 120,
      valueGetter: (rowData) => rowData.row.avgCheckinTime,
      valueFormatter: (obj) => getTimeStr(obj.value),
    },
    {
      field: "avgCheckoutTime",
      headerName: "Avg Check-out",
      flex: 1,
      minWidth: 120,
      valueGetter: (rowData) =>
        getTimeFloat(rowData.row.avgCheckinTime) +
        getTimeFloat(rowData.row.duration) / rowData.row.days,
      valueFormatter: (obj) => getTimeStr(obj.value),
    },
  ];

  const rows = ballkids.map((ballkid) => ({
    id: ballkid.id,
    ballkid: ballkid,
    days: ballkid.checkin_days,
    duration: ballkid.checkin_duration,
    avgCheckinTime: ballkid.avg_checkin_time,
  }));

  return (
    <LeaderboardShell
      title="Check-in Leaderboard"
      helpPage="Check-in Leaderboard"
      helpMessage={checkinLeaderboard}
      footer={
        <LeaderboardNote>
          Even if the ballkid is still checked in, average duration per day and
          average check-out time populate as if they checked out now. With few
          days of data, those figures are most reliable after everyone is
          checked out.
        </LeaderboardNote>
      }
    >
      {averages !== undefined ? <AveragesTable averages={averages} /> : null}

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
