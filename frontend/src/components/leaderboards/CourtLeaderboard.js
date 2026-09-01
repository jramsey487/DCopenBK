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
  getDurationStr,
  getTimeFloat,
  BallkidAndIcon,
  toPercent,
} from "../Utils";
import { courtLeaderboard } from "../HelpMessages";
import {
  LeaderboardShell,
  LeaderboardGridPanel,
  LeaderboardAvgPanel,
  LeaderboardModePill,
  LeaderboardNote,
  LEADERBOARD_BALLKID_COL_WIDTH,
} from "./LeaderboardsShared";

const COURT_KEYS = [
  { key: "On Court", raw: "court_avg", denom: "checkin_avg" },
  { key: "Stadium", raw: "stadium_avg", denom: "court_avg" },
  { key: "Harris", raw: "harris_avg", denom: "court_avg" },
  { key: "Grandstand", raw: "grandstand_avg", denom: "court_avg" },
  { key: "Court 4", raw: "four_avg", denom: "court_avg" },
  { key: "Court 5", raw: "five_avg", denom: "court_avg" },
];

function AveragesTable({ averages, showPercent }) {
  return (
    <LeaderboardAvgPanel>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" />
              {COURT_KEYS.map(({ key }) => (
                <TableCell key={key} align="center">
                  {key}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell align="center" className="leaderboard-avg-label">
                {showPercent ? "Average Percent" : "Average Time"}
              </TableCell>
              {COURT_KEYS.map(({ key, raw, denom }) => {
                const rawVal = averages[raw];
                const denomVal = averages[denom];
                const percent = denomVal ? rawVal / denomVal : 0;
                return (
                  <TableCell key={key} align="center">
                    {showPercent
                      ? `${Number((percent * 100).toFixed(1))}%`
                      : getDurationStr(parseFloat(rawVal) / 3600, false)}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </LeaderboardAvgPanel>
  );
}

export default function CourtLeaderboard() {
  const [ballkids, setBallkids] = useState([]);
  const [averages, setAverages] = useState();
  const [loading, setLoading] = useState(true);
  const [showPercent, setShowPercent] = useState(false);
  const timeColWidth = 100;

  useEffect(() => {
    fetch("/api/get-court-leaderboard", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(data))
      .then(() => setLoading(false));

    fetch("/api/get-average-court-leaderboard", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setAverages(data));
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
      width: LEADERBOARD_BALLKID_COL_WIDTH,
      renderCell: (rowData) => (
        <Box className="leaderboard-name-cell">
          <BallkidAndIcon ballkid={rowData.row.ballkid} />
        </Box>
      ),
    },
    {
      field: "time",
      headerName: (showPercent ? "% " : "") + "On Court",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.courtTime) /
            getTimeFloat(rowData.row.checkinDuration)
          : getTimeFloat(rowData.row.courtTime),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? toPercent(obj.value)
            : "0%"
          : getDurationStr(obj.value, false),
    },
    {
      field: "stadium",
      headerName: (showPercent ? "% " : "") + "Stadium",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.stadium) /
            getTimeFloat(rowData.row.courtTime)
          : getTimeFloat(rowData.row.stadium),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? toPercent(obj.value)
            : "0%"
          : getDurationStr(obj.value, false),
    },
    {
      field: "harris",
      headerName: (showPercent ? "% " : "") + "Harris",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.harris) /
            getTimeFloat(rowData.row.courtTime)
          : getTimeFloat(rowData.row.harris),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? toPercent(obj.value)
            : "0%"
          : getDurationStr(obj.value, false),
    },
    {
      field: "grandstand",
      headerName: (showPercent ? "% " : "") + "Grandstand",
      width: timeColWidth + 16,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.grandstand) /
            getTimeFloat(rowData.row.courtTime)
          : getTimeFloat(rowData.row.grandstand),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? toPercent(obj.value)
            : "0%"
          : getDurationStr(obj.value, false),
    },
    {
      field: "four",
      headerName: (showPercent ? "% " : "") + "Court 4",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.four) / getTimeFloat(rowData.row.courtTime)
          : getTimeFloat(rowData.row.four),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? toPercent(obj.value)
            : "0%"
          : getDurationStr(obj.value, false),
    },
    {
      field: "five",
      headerName: (showPercent ? "% " : "") + "Court 5",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.five) / getTimeFloat(rowData.row.courtTime)
          : getTimeFloat(rowData.row.five),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? toPercent(obj.value)
            : "0%"
          : getDurationStr(obj.value, false),
    },
  ];

  const rows = ballkids.map((ballkid) => ({
    id: ballkid.id,
    ballkid: ballkid,
    checkinDuration: ballkid.checkin_duration,
    courtTime: ballkid.court_duration,
    stadium: ballkid.stadium_duration,
    harris: ballkid.harris_duration,
    grandstand: ballkid.grandstand_duration,
    four: ballkid.four_duration,
    five: ballkid.five_duration,
  }));

  return (
    <LeaderboardShell
      title="Court Time Leaderboard"
      helpPage="Court Time Leaderboard"
      helpMessage={courtLeaderboard}
      toolbar={
        <LeaderboardModePill
          checked={showPercent}
          onChange={setShowPercent}
          offLabel="Time"
          onLabel="Percent"
        />
      }
      footer={
        <>
          <LeaderboardNote>
            % On Court = (Total time on any court) / (Total time checked in)
          </LeaderboardNote>
          <LeaderboardNote>
            % [Court Name] = (Total time on that court) / (Total time on any
            court)
          </LeaderboardNote>
        </>
      }
    >
      {averages !== undefined ? (
        <AveragesTable averages={averages} showPercent={showPercent} />
      ) : null}

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
