import React, { useState, useEffect } from "react";
import { Typography, Link, Switch } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import { getAuthHeader, getTimeStr, getTimeFloat, Icons } from "../Utils";

export default function CourtLeaderboard(props) {
  const [ballkids, setBallkids] = useState([]);
  // const [showAdjusted, setShowAdjusted] = useState(false);
  const [showPercent, setShowPercent] = useState(false);

  const timeColWidth = 150;

  useEffect(() => {
    fetch("/api/get-court-leaderboard", { headers: getAuthHeader() })
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
      field: "time",
      headerName: (showPercent ? "% " : "") + "Time on Court",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.courtTime) /
            getTimeFloat(rowData.row.checkinDuration)
          : getTimeFloat(rowData.row.courtTime),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? `${Number((obj.value * 100).toFixed(2))}%`
            : "0%"
          : getTimeStr(obj.value),
    },
    {
      field: "stadium",
      headerName: (showPercent ? "% " : "") + "Time on Stadium",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.stadium) /
            getTimeFloat(rowData.row.courtTime)
          : getTimeFloat(rowData.row.stadium),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? `${Number((obj.value * 100).toFixed(2))}%`
            : "0%"
          : getTimeStr(obj.value),
    },
    {
      field: "harris",
      headerName: (showPercent ? "% " : "") + "Time on Harris",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.harris) /
            getTimeFloat(rowData.row.courtTime)
          : getTimeFloat(rowData.row.harris),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? `${Number((obj.value * 100).toFixed(2))}%`
            : "0%"
          : getTimeStr(obj.value),
    },
    {
      field: "grandstand",
      headerName: (showPercent ? "% " : "") + "Time on Grandstand",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.grandstand) /
            getTimeFloat(rowData.row.courtTime)
          : getTimeFloat(rowData.row.grandstand),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? `${Number((obj.value * 100).toFixed(2))}%`
            : "0%"
          : getTimeStr(obj.value),
    },
    {
      field: "four",
      headerName: (showPercent ? "% " : "") + "Time on Court 4",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.four) / getTimeFloat(rowData.row.courtTime)
          : getTimeFloat(rowData.row.four),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? `${Number((obj.value * 100).toFixed(2))}%`
            : "0%"
          : getTimeStr(obj.value),
    },
    {
      field: "five",
      headerName: (showPercent ? "% " : "") + "Time on Court 5",
      width: timeColWidth,
      valueGetter: (rowData) =>
        showPercent
          ? getTimeFloat(rowData.row.five) / getTimeFloat(rowData.row.courtTime)
          : getTimeFloat(rowData.row.five),
      valueFormatter: (obj) =>
        showPercent
          ? obj.value
            ? `${Number((obj.value * 100).toFixed(2))}%`
            : "0%"
          : getTimeStr(obj.value),
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

      <div style={{ height: 500 }}>
        <DataGrid
          columns={columns}
          rows={rows}
          pageSize={25}
          density="compact"
        />
      </div>

      <Typography variant="body1" mt={2}>
        Note: % Time on Court = (Total time on court) / (Total time checked in).
        % Time on Stadium = (Total time on Stadium) / (Total time on court)
      </Typography>
      {/* <Typography variant="body1">
        Note: Raw court time takes into account rain delays and courts ending
        early. Adjusted court time additionally takes into account number of
        ballkids per team.
      </Typography> */}
    </div>
  );
}
