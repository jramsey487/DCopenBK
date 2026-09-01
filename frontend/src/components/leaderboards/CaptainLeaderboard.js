import React, { useState, useEffect } from "react";

import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import { DataGrid } from "@mui/x-data-grid";

import { BallkidAndIcon, getAuthHeader } from "../Utils";
import { ratingsCaptainLeaderboard } from "../HelpMessages";
import { CHART_COLORS } from "../Consts";
import { RaterParamsChart } from "../ballkid/RaterParamsChart";
import {
  LeaderboardShell,
  LeaderboardGridPanel,
  LeaderboardNote,
  LEADERBOARD_BALLKID_COL_WIDTH_WIDE,
} from "./LeaderboardsShared";

function RaterParamsSection() {
  const [params, setParams] = useState();
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    fetch("/api/calibration-parameters", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setParams(data));
  }, []);

  if (params === undefined || params === null) {
    return null;
  }

  return (
    <div className="leaderboard-chart-section">
      <h2 className="leaderboard-chart-section__title">
        Rater Parameters Comparison
      </h2>

      <Autocomplete
        multiple
        filterSelectedOptions
        options={params.map((param) => ({ id: param.id, name: param.name }))}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.name === value.name}
        renderInput={(inputParams) => (
          <TextField
            label="Select raters to compare"
            variant="outlined"
            size="small"
            {...inputParams}
          />
        )}
        onChange={(e, val) => setSelected(val.map((obj) => obj.name))}
      />

      <RaterParamsChart
        captainData={selected.map((name, index) => {
          const rater = params.filter((obj) => obj["name"] === name)[0];
          const scale = rater.rater_scale;
          const offset = rater.rater_offset;

          return {
            label: name,
            data: [
              { x: 0.5, y: scale * 0.5 + offset },
              { x: 5, y: scale * 5 + offset },
            ],
            borderColor: CHART_COLORS[index % CHART_COLORS.length],
            backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}50`,
          };
        })}
      />
    </div>
  );
}

export default function CaptainLeaderboard() {
  const [ballkids, setBallkids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/get-captain-leaderboard", { headers: getAuthHeader() })
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
      headerName: "Captain / Chairperson",
      width: LEADERBOARD_BALLKID_COL_WIDTH_WIDE,
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
      width: 100,
      valueGetter: (rowData) => rowData.row.ballkid.raw_avg,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "stdevRating",
      headerName: "Std. Dev.",
      width: 100,
      valueGetter: (rowData) => rowData.row.ballkid.raw_stdev,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "scale",
      headerName: "Cal. Scale",
      width: 110,
      valueGetter: (rowData) => rowData.row.ballkid.scale,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "offset",
      headerName: "Cal. Offset",
      width: 110,
      valueGetter: (rowData) => rowData.row.ballkid.offset,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "distanceToIdeal",
      headerName: "Distance To Ideal",
      width: 140,
      valueGetter: (rowData) => rowData.row.ballkid.distance_to_ideal,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
  ];

  const rows = ballkids.map((ballkid) => ({
    id: ballkid.id,
    ballkid: ballkid,
  }));

  return (
    <LeaderboardShell
      title="Ratings — Captain"
      helpPage="Ratings Leaderboard - Captain"
      helpMessage={ratingsCaptainLeaderboard}
      footer={
        <LeaderboardNote>
          Average and standard deviation are for ratings submitted (not
          received) by this captain/chairperson. Calibration scale and offset
          use the method described{" "}
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/jtiosue/rcal/blob/master/report/review_calibration.pdf"
          >
            here
          </Link>
          .
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

      {!loading ? <RaterParamsSection /> : null}
    </LeaderboardShell>
  );
}
