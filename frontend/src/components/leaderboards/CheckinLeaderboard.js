import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TableBody from "@mui/material/TableBody";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import Paper from "@mui/material/Paper";

import { DataGrid } from "@mui/x-data-grid";

import {
  getAuthHeader,
  getDurationStr,
  getTimeFloat,
  BallkidAndIcon,
  HelpIcon,
  getTimeStr,
  Banners,
} from "../Utils";
import { Box } from "@mui/material";
import { checkinLeaderboard } from "../HelpMessages";
import { DATA_GRID_HEIGHT } from "../Consts";

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";

function StatLabel({ children }) {
  return (
    <TableCell
      align="center"
      sx={{
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        fontSize: "0.7rem",
        letterSpacing: "0.06em",
        fontFamily: FONT,
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      {children}
    </TableCell>
  );
}

function renderAverages(averages) {
  const totalDurationFloat = parseFloat(averages["checkin_avg"]) / 3600;
  const totalDaysFloat = parseFloat(averages["days_avg"]);
  const avgCheckinFloat = parseFloat(averages["avg_checkin_time"]) / 3600;

  return (
    <Card
      elevation={0}
      sx={{
        mt: 1,
        mb: 3,
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.02)",
        overflow: "hidden",
      }}
    >
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
              <StatLabel></StatLabel>
              <StatLabel>Total Duration</StatLabel>
              <StatLabel># of Days</StatLabel>
              <StatLabel>Average Duration per Day</StatLabel>
              <StatLabel>Average Check-in Time</StatLabel>
              <StatLabel>Average Check-out Time</StatLabel>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell
                align="center"
                width="22%"
                sx={{
                  fontWeight: 700,
                  color: "#1e293b",
                  fontFamily: FONT,
                  fontSize: "0.9rem",
                }}
              >
                Average
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontFamily: FONT, color: "#334155" }}
              >
                {getDurationStr(totalDurationFloat)}
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontFamily: FONT, color: "#334155" }}
              >
                {Number(totalDaysFloat).toFixed(1)}
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontFamily: FONT, color: "#334155" }}
              >
                {getDurationStr(totalDurationFloat / totalDaysFloat)}
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontFamily: FONT, color: "#334155" }}
              >
                {getTimeStr(avgCheckinFloat)}
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontFamily: FONT, color: "#334155" }}
              >
                {getTimeStr(
                  avgCheckinFloat + totalDurationFloat / totalDaysFloat
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
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
      width: 56,
      sortable: true,
      renderCell: (index) => {
        const rank = index.api.getRowIndex(index.row.id) + 1;
        const medal =
          rank === 1 ? "#fbbf24" : rank === 2 ? "#cbd5e1" : rank === 3 ? "#d97706" : null;
        return (
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.8rem",
              fontFamily: FONT,
              backgroundColor: medal ? `${medal}26` : "transparent",
              color: medal || "#64748b",
            }}
          >
            {rank}
          </Box>
        );
      },
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
      <Banners />

      <Box className="sxs" sx={{ mb: 2, alignItems: "center" }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, color: "#0f172a", fontFamily: FONT }}
        >
          Check-in Leaderboard
        </Typography>
        &thinsp;
        <HelpIcon page="Check-in Leaderboard" message={checkinLeaderboard} />
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <div>
          {averages !== undefined ? renderAverages(averages) : ""}

          <Card
            elevation={0}
            component={Paper}
            sx={{
              borderRadius: "16px",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.02)",
              overflow: "hidden",
              p: 1,
            }}
          >
            <div style={{ height: DATA_GRID_HEIGHT }}>
              <DataGrid
                columns={columns}
                rows={rows}
                density="compact"
                disableColumnMenu
                sx={{
                  border: "none",
                  fontFamily: FONT,
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    color: "#64748b",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.04em",
                  },
                  "& .MuiDataGrid-cell": {
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: "0.85rem",
                    color: "#334155",
                  },
                  "& .MuiDataGrid-row:hover": {
                    backgroundColor: "#f8fafc",
                  },
                  "& .MuiDataGrid-footerContainer": {
                    borderTop: "1px solid #e2e8f0",
                  },
                }}
              />
            </div>
          </Card>

          <Typography
            sx={{ mt: 2, color: "#64748b", fontSize: "0.85rem", fontFamily: FONT }}
            variant="body1"
          >
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