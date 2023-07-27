import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TableBody from "@mui/material/TableBody";
import CircularProgress from "@mui/material/CircularProgress";

import { DataGrid } from "@mui/x-data-grid";

import {
  getAuthHeader,
  getDurationStr,
  getTimeFloat,
  BallkidAndIcon,
  HelpIcon,
  getTimeStr,
} from "../Utils";
import { Box } from "@mui/material";
import { checkinLeaderboard } from "../HelpMessages";

function renderAverages(averages) {
  const totalDurationFloat = parseFloat(averages["checkin_avg"]) / 3600;
  const totalDaysFloat = parseFloat(averages["days_avg"]);
  const avgCheckinFloat = parseFloat(averages["avg_checkin_time"]) / 3600;

  return (
    <TableContainer sx={{ mt: 1, mb: 3 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="center"></TableCell>
            <TableCell align="center">Total Duration</TableCell>
            <TableCell align="center"># of Days</TableCell>
            <TableCell align="center">Average Duration per Day</TableCell>
            <TableCell align="center">Average Check-in Time</TableCell>
            <TableCell align="center">Average Check-out Time</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell align="center" width="22%">
              Average
            </TableCell>
            <TableCell align="center">
              {getDurationStr(totalDurationFloat)}
            </TableCell>
            <TableCell align="center">
              {Number(totalDaysFloat).toFixed(1)}
            </TableCell>
            <TableCell align="center">
              {getDurationStr(totalDurationFloat / totalDaysFloat)}
            </TableCell>
            <TableCell align="center">{getTimeStr(avgCheckinFloat)}</TableCell>

            <TableCell align="center">
              {getTimeStr(
                avgCheckinFloat + totalDurationFloat / totalDaysFloat
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function CheckinLeaderboard(props) {
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
      width: 30,
      sortable: true,
      renderCell: (index) => index.api.getRowIndex(index.row.id) + 1,
    },
    {
      field: "name",
      headerName: "Ballkid",
      width: 200,
      renderCell: (rowData) => <BallkidAndIcon ballkid={rowData.row.ballkid} />,
    },
    {
      field: "duration",
      headerName: "Total Duration",
      width: 200,
      valueGetter: (rowData) => getTimeFloat(rowData.row.duration),
      valueFormatter: (obj) => getDurationStr(obj.value),
    },
    {
      field: "days",
      headerName: "# of Days",
      width: 100,
      valueGetter: (rowData) => rowData.row.days,
    },
    {
      field: "durationPerDay",
      headerName: "Average Duration per Day",
      width: 200,
      valueGetter: (rowData) =>
        getTimeFloat(rowData.row.duration) / rowData.row.days,
      valueFormatter: (obj) => getDurationStr(obj.value),
    },
    {
      field: "avgCheckinTime",
      headerName: "Average Check-in Time",
      width: 200,
      valueGetter: (rowData) => rowData.row.avgCheckinTime,
      valueFormatter: (obj) => getTimeStr(obj.value),
    },
    {
      field: "avgCheckoutTime",
      headerName: "Average Check-out Time",
      width: 200,
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
    <div className="page">
      <Box className="sxs" sx={{ mb: 1 }}>
        <Typography variant="h4">Check-in Leaderboard</Typography>
        &thinsp;
        <HelpIcon page="Check-in Leaderboard" message={checkinLeaderboard} />
      </Box>

      {loading ? (
        <CircularProgress className="center" size={30} />
      ) : (
        <div>
          {averages !== undefined ? renderAverages(averages) : ""}

          <div style={{ height: 500 }}>
            <DataGrid
              columns={columns}
              rows={rows}
              pageSize={25}
              density="compact"
            />
          </div>

          <Typography sx={{ mt: 2 }} variant="body1">
            Note: Even if the ballkid is still checked in, Average Duration per
            Day and Average Check-out Time will populate as if the ballkid is
            checked out at the current time. As such, with few days of data,
            Average Duration per Day and Average Check-out Time are only
            reliable at the end of the day after all ballkids are checked out.
            With more days of data, this inaccuracy should be minor.
          </Typography>
        </div>
      )}
    </div>
  );
}
