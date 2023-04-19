import React, { useState, useEffect } from "react";
import {
  Typography,
  Link,
  Switch,
  TableContainer,
  TableHead,
  TableRow,
  Table,
  TableCell,
  TableBody,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import { getAuthHeader, getTimeStr, getTimeFloat, Icons } from "../Utils";

function renderAverages(averages, showPercent) {
  const courtTimes = {
    "On Court": {
      raw: averages["court_avg"],
      percent: averages["court_avg"] / averages["checkin_avg"],
    },
    Stadium: {
      raw: averages["stadium_avg"],
      percent: averages["stadium_avg"] / averages["court_avg"],
    },
    Harris: {
      raw: averages["harris_avg"],
      percent: averages["harris_avg"] / averages["court_avg"],
    },
    Grandstand: {
      raw: averages["grandstand_avg"],
      percent: averages["grandstand_avg"] / averages["court_avg"],
    },
    "Court 4": {
      raw: averages["four_avg"],
      percent: averages["four_avg"] / averages["court_avg"],
    },
    "Court 5": {
      raw: averages["five_avg"],
      percent: averages["five_avg"] / averages["court_avg"],
    },
  };

  return (
    <TableContainer sx={{ mt: 1, mb: 3 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="center"></TableCell>
            {Object.keys(courtTimes).map((court) => (
              <TableCell key={court} align="center">
                {court}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell align="center" width="22%">
              {showPercent ? "Average Percent" : "Average Time"}
            </TableCell>
            {Object.keys(courtTimes).map((court) => (
              <TableCell key={court} align="center" width="13%">
                {showPercent
                  ? `${Number(
                      (courtTimes[court]["percent"] * 100).toFixed(1)
                    )}%`
                  : getTimeStr(
                      parseFloat(courtTimes[court]["raw"]) / 3600,
                      false
                    )}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function CourtLeaderboard(props) {
  const [ballkids, setBallkids] = useState([]);
  const [averages, setAverages] = useState();
  // const [showAdjusted, setShowAdjusted] = useState(false);
  const [showPercent, setShowPercent] = useState(false);

  const timeColWidth = 100;

  useEffect(() => {
    fetch("/api/get-court-leaderboard", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(data));

    fetch("/api/get-average-court-leaderboard", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setAverages(data));
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
            ? `${Number((obj.value * 100).toFixed(1))}%`
            : "0%"
          : getTimeStr(obj.value, false),
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
            ? `${Number((obj.value * 100).toFixed(1))}%`
            : "0%"
          : getTimeStr(obj.value, false),
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
            ? `${Number((obj.value * 100).toFixed(1))}%`
            : "0%"
          : getTimeStr(obj.value, false),
    },
    {
      field: "grandstand",
      headerName: (showPercent ? "% " : "") + "Grandstand",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.grandstand) /
            getTimeFloat(rowData.row.courtTime)
          : getTimeFloat(rowData.row.grandstand),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? `${Number((obj.value * 100).toFixed(1))}%`
            : "0%"
          : getTimeStr(obj.value, false),
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
            ? `${Number((obj.value * 100).toFixed(1))}%`
            : "0%"
          : getTimeStr(obj.value, false),
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
            ? `${Number((obj.value * 100).toFixed(1))}%`
            : "0%"
          : getTimeStr(obj.value, false),
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
    <div className="page">
      <Typography variant="h4" mb={2}>
        Court Time Leaderboard
      </Typography>

      {/* <div className="sxs">
        <Typography variant="body1">Raw Court Time</Typography>
        <Switch
          checked={showAdjusted}
          onClick={(e) => setShowAdjusted(e.target.checked)}
        />
        <Typography variant="body1">Adjusted Court Time</Typography>
      </div> */}

      <div className="sxs">
        <Typography variant="body1">Show as Time</Typography>
        <Switch
          checked={showPercent}
          onClick={(e) => setShowPercent(e.target.checked)}
        />
        <Typography variant="body1">Show as Percent</Typography>
      </div>

      {averages !== undefined ? renderAverages(averages, showPercent) : ""}

      <div style={{ height: 500 }}>
        <DataGrid
          columns={columns}
          rows={rows}
          pageSize={25}
          density="compact"
        />
      </div>

      <Typography variant="body1" mt={2}>
        Note: % On Court = (Total time on any court) / (Total time checked in)
      </Typography>
      <Typography variant="body1">
        Note: % [<em>Court Name </em>] = (Total time on [<em>Court Name </em>])
        / (Total time on any court)
      </Typography>
      <Typography variant="body1">
        Note: Time is represented in [<em>hrs </em>]:[<em>mins </em>]
      </Typography>
      {/* <Typography variant="body1">
        Note: Raw court time takes into account rain delays and courts ending
        early. Adjusted court time additionally takes into account number of
        ballkids per team.
      </Typography> */}
    </div>
  );
}
