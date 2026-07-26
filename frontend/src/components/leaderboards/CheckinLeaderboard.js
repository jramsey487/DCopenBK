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
import GlobalStyles from "@mui/material/GlobalStyles";

import { DataGrid } from "@mui/x-data-grid";

import {
  getAuthHeader,
  getTimeFloat,
  BallkidAndIcon,
  HelpIcon,
  getTimeStr,
  Banners,
  useIsMobile,
} from "../Utils";
import { Box } from "@mui/material";
import { checkinLeaderboard } from "../HelpMessages";
import { DATA_GRID_HEIGHT } from "../Consts";

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";

// Local short-form duration formatter (e.g. "3h42m")
function formatDurationShort(hoursFloat) {
  if (hoursFloat == null || !isFinite(hoursFloat) || hoursFloat < 0) {
    return "-";
  }
  const totalMinutes = Math.round(hoursFloat * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

const COL_W = {
  rank: "60px",
  ballkid: "1fr",
  duration: "1fr",
  days: "0.6fr",
  durationPerDay: "1.1fr",
  avgCheckin: "1.1fr",
  avgCheckout: "1.1fr",
};

/** Min widths (px) for averages table — mobile scrolls horizontally instead of squishing */
const AVG_COL_MIN_MOBILE = {
  label: 64,
  duration: 76,
  days: 52,
  durationPerDay: 88,
  avgCheckin: 80,
  avgCheckout: 80,
};

function StatLabel({ children, width, minWidth, isMobile }) {
  return (
    <TableCell
      align="center"
      sx={{
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        fontSize: isMobile ? "0.62rem" : "0.68rem",
        letterSpacing: "0.03em",
        fontFamily: FONT,
        borderBottom: "1px solid #e2e8f0",
        whiteSpace: isMobile ? "normal" : "nowrap",
        overflow: "hidden",
        textOverflow: isMobile ? "clip" : "ellipsis",
        lineHeight: 1.25,
        width: isMobile ? undefined : width || "auto",
        minWidth: isMobile ? minWidth : undefined,
        py: isMobile ? 0.75 : 1.2,
        px: isMobile ? 0.75 : 1.5,
      }}
    >
      {children}
    </TableCell>
  );
}

function renderAverages(averages, isMobile) {
  const totalDurationFloat = parseFloat(averages["checkin_avg"]) / 3600;
  const totalDaysFloat = parseFloat(averages["days_avg"]);
  const avgCheckinFloat = parseFloat(averages["avg_checkin_time"]) / 3600;

  const cellSx = {
    fontFamily: FONT,
    color: "#334155",
    py: isMobile ? 0.75 : 1.2,
    px: isMobile ? 0.75 : 1.5,
    fontSize: isMobile ? "0.75rem" : "0.85rem",
    whiteSpace: "nowrap",
    width: isMobile ? undefined : undefined,
  };

  const mobileMinTable =
    AVG_COL_MIN_MOBILE.label +
    AVG_COL_MIN_MOBILE.duration +
    AVG_COL_MIN_MOBILE.days +
    AVG_COL_MIN_MOBILE.durationPerDay +
    AVG_COL_MIN_MOBILE.avgCheckin +
    AVG_COL_MIN_MOBILE.avgCheckout;

  const headerLabels = isMobile
    ? {
        duration: "Total Duration",
        days: "# Days",
        perDay: "Avg Duration / Day",
        checkin: "Avg Check-in",
        checkout: "Avg Check-out",
      }
    : {
        duration: "Total Duration",
        days: "# of Days",
        perDay: "Average Duration per Day",
        checkin: "Average Check-in Time",
        checkout: "Average Check-out Time",
      };

  return (
    <Card
      elevation={0}
      sx={{
        mt: isMobile ? 0.5 : 1,
        mb: isMobile ? 1.5 : 3,
        width: "100%",
        borderRadius: isMobile ? "12px" : "16px",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.02)",
        overflow: "hidden",
      }}
    >
      <TableContainer
        sx={{
          overflowX: "auto",
          maxWidth: "100%",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Table
          size="small"
          sx={{
            tableLayout: "fixed",
            width: "100%",
            minWidth: isMobile ? mobileMinTable : 1000,
          }}
        >
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
              <StatLabel
                width={COL_W.ballkid}
                minWidth={AVG_COL_MIN_MOBILE.label}
                isMobile={isMobile}
              />
              <StatLabel
                width={COL_W.duration}
                minWidth={AVG_COL_MIN_MOBILE.duration}
                isMobile={isMobile}
              >
                {headerLabels.duration}
              </StatLabel>
              <StatLabel
                width={COL_W.days}
                minWidth={AVG_COL_MIN_MOBILE.days}
                isMobile={isMobile}
              >
                {headerLabels.days}
              </StatLabel>
              <StatLabel
                width={COL_W.durationPerDay}
                minWidth={AVG_COL_MIN_MOBILE.durationPerDay}
                isMobile={isMobile}
              >
                {headerLabels.perDay}
              </StatLabel>
              <StatLabel
                width={COL_W.avgCheckin}
                minWidth={AVG_COL_MIN_MOBILE.avgCheckin}
                isMobile={isMobile}
              >
                {headerLabels.checkin}
              </StatLabel>
              <StatLabel
                width={COL_W.avgCheckout}
                minWidth={AVG_COL_MIN_MOBILE.avgCheckout}
                isMobile={isMobile}
              >
                {headerLabels.checkout}
              </StatLabel>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell
                align="center"
                sx={{
                  ...cellSx,
                  fontWeight: 700,
                  color: "#1e293b",
                  fontSize: isMobile ? "0.78rem" : "0.9rem",
                  minWidth: isMobile ? AVG_COL_MIN_MOBILE.label : undefined,
                  width: isMobile ? undefined : COL_W.ballkid,
                }}
              >
                Average
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  ...cellSx,
                  minWidth: isMobile ? AVG_COL_MIN_MOBILE.duration : undefined,
                  width: isMobile ? undefined : COL_W.duration,
                }}
              >
                {formatDurationShort(totalDurationFloat)}
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  ...cellSx,
                  minWidth: isMobile ? AVG_COL_MIN_MOBILE.days : undefined,
                  width: isMobile ? undefined : COL_W.days,
                }}
              >
                {Number(totalDaysFloat).toFixed(1)}
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  ...cellSx,
                  minWidth: isMobile
                    ? AVG_COL_MIN_MOBILE.durationPerDay
                    : undefined,
                  width: isMobile ? undefined : COL_W.durationPerDay,
                }}
              >
                {formatDurationShort(totalDurationFloat / totalDaysFloat)}
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  ...cellSx,
                  minWidth: isMobile ? AVG_COL_MIN_MOBILE.avgCheckin : undefined,
                  width: isMobile ? undefined : COL_W.avgCheckin,
                }}
              >
                {getTimeStr(avgCheckinFloat)}
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  ...cellSx,
                  minWidth: isMobile ? AVG_COL_MIN_MOBILE.avgCheckout : undefined,
                  width: isMobile ? undefined : COL_W.avgCheckout,
                }}
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
  const isMobile = useIsMobile();

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
      flex: 0.5,
      minWidth: 40,
      sortable: true,
      renderCell: (index) => {
        const rank = index.api.getRowIndex(index.row.id) + 1;
        return (
          <Box
            sx={{
              width: "100%",
              height: 24,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.8rem",
              fontFamily: FONT,
              color: "#64748b",
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
      flex: 2,
      minWidth: 160,
      renderCell: (rowData) => (
        <Box className="checkin-lb-name-cell">
          <BallkidAndIcon ballkid={rowData.row.ballkid} />
        </Box>
      ),
    },
    {
      field: "duration",
      headerName: "Total Duration",
      flex: 2,
      minWidth: 140,
      valueGetter: (rowData) => getTimeFloat(rowData.row.duration),
      valueFormatter: (obj) => formatDurationShort(obj.value),
    },
    {
      field: "days",
      headerName: "# of Days",
      flex: 1,
      minWidth: 80,
      valueGetter: (rowData) => rowData.row.days,
    },
    {
      field: "durationPerDay",
      headerName: "Average Duration per Day",
      flex: 2,
      minWidth: 160,
      valueGetter: (rowData) =>
        getTimeFloat(rowData.row.duration) / rowData.row.days,
      valueFormatter: (obj) => formatDurationShort(obj.value),
    },
    {
      field: "avgCheckinTime",
      headerName: "Average Check-in Time",
      flex: 2,
      minWidth: 140,
      valueGetter: (rowData) => rowData.row.avgCheckinTime,
      valueFormatter: (obj) => getTimeStr(obj.value),
    },
    {
      field: "avgCheckoutTime",
      headerName: "Average Check-out Time",
      flex: 2,
      minWidth: 140,
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

      <GlobalStyles
        styles={{
          ".MuiDataGrid-menu .MuiPaper-root": {
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow:
              "0 12px 28px -8px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.06)",
            padding: "6px",
            marginTop: "4px",
          },
          ".MuiDataGrid-menu .MuiMenuItem-root": {
            fontFamily: FONT,
            fontSize: "0.875rem",
            color: "#334155",
            borderRadius: "8px",
            margin: "1px 0",
            padding: "8px 12px",
            minHeight: "unset",
          },
          ".MuiDataGrid-menu .MuiMenuItem-root:hover": {
            backgroundColor: "#f1f5f9",
          },
          ".MuiDataGrid-menu .MuiMenuItem-root.Mui-disabled": {
            color: "#cbd5e1",
            opacity: 1,
          },
          ".MuiDataGrid-menu .MuiListItemIcon-root": {
            minWidth: "32px",
            color: "#64748b",
          },
          ".MuiDataGrid-menu .MuiDivider-root": {
            margin: "4px 0",
            borderColor: "#f1f5f9",
          },
          ".checkin-lb-name-cell": {
            display: "flex",
            alignItems: "center",
            width: "100%",
            height: "100%",
            minHeight: "100%",
          },
          ".checkin-lb-name-cell .sxs": {
            display: "inline-flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "6px",
            lineHeight: 1.2,
            height: "100%", // Ensure the inner wrapper takes full height
          },
          ".checkin-lb-name-cell .MuiLink-root": {
            display: "inline-flex",
            alignItems: "center",
            lineHeight: 1.2,
          },
          ".checkin-lb-name-cell .MuiIcon-root": {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            fontSize: "1.05rem",
          },
          ".checkin-lb-name-cell .MuiIcon-root svg": {
            display: "block",
          },
          ".MuiDataGrid-cell[data-field='name']": {
            display: "flex",
            alignItems: "center",
            paddingTop: "4px",
            paddingBottom: "4px",
          },
        }}
      />

      <Box
        className="sxs"
        sx={{ mb: isMobile ? 1 : 2, alignItems: "center", gap: 0.75 }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            color: "#0f172a",
            fontFamily: FONT,
            fontSize: isMobile ? "1.15rem" : "1.6rem",
          }}
        >
          Check-in Leaderboard
        </Typography>
        <HelpIcon page="Check-in Leaderboard" message={checkinLeaderboard} />
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <div>
          {averages !== undefined ? renderAverages(averages, isMobile) : ""}

          <Card
            elevation={0}
            sx={{
              width: "100%",
              borderRadius: isMobile ? "12px" : "16px",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.02)",
              overflow: "hidden",
            }}
          >
            <div style={{ height: DATA_GRID_HEIGHT, overflowX: "auto" }}>
              <DataGrid
                columns={columns}
                rows={rows}
                density="compact"
                rowHeight={isMobile ? 44 : 52}
                sx={{
                  border: "none",
                  borderRadius: "16px",
                  fontFamily: FONT,
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    color: "#64748b",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: "0.68rem",
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
                  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
                    {
                      outline: "none",
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