import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import { DataGrid } from "@mui/x-data-grid";

import { BallkidAndIcon, HelpIcon, Banners, getAuthHeader } from "../Utils";
import { ratingsCaptainLeaderboard } from "../HelpMessages";
import { CHART_COLORS, DATA_GRID_HEIGHT, MARGINS } from "../Consts";
import { RaterParamsChart } from "../ballkid/RaterParamsChart";

function RaterParamsSection() {
  const [params, setParams] = useState();
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    fetch("/api/calibration-parameters", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setParams(data));
  }, []);

  return params === undefined || params === null ? (
    ""
  ) : (
    <div>
      <Typography variant="h6" sx={MARGINS}>
        Rater Parameters Comparison Chart
      </Typography>

      <Autocomplete
        multiple
        filterSelectedOptions
        options={params.map((param) => ({ id: param.id, name: param.name }))}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.name === value.name}
        renderInput={(params) => (
          <TextField
            label="Select Raters to Compare..."
            variant="standard"
            {...params}
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

export default function CaptainLeaderboard(props) {
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
      width: 30,
      sortable: true,
      renderCell: (index) => index.api.getRowIndex(index.row.id) + 1,
    },
    {
      field: "name",
      headerName: "Captain / Chairperson",
      width: 200,
      renderCell: (rowData) => <BallkidAndIcon ballkid={rowData.row.ballkid} />,
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
      width: 140,
      valueGetter: (rowData) => rowData.row.ballkid.raw_avg,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "stdevRating",
      headerName: "Standard Deviation",
      width: 140,
      valueGetter: (rowData) => rowData.row.ballkid.raw_stdev,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "scale",
      headerName: "Calibration Scale",
      width: 140,
      valueGetter: (rowData) => rowData.row.ballkid.scale,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "offset",
      headerName: "Calibration Offset",
      width: 140,
      valueGetter: (rowData) => rowData.row.ballkid.offset,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "distanceToIdeal",
      headerName: "Distance To Ideal",
      width: 140,
      valueGetter: (rowData) => {
        const a = rowData.row.ballkid.scale;
        const b = rowData.row.ballkid.offset;

        if (a === 0 && b === 0) {
          return null;
        }

        // distance to ideal is 1/(4.5) int_{.5}^5 (ax + b - x)**2
        return (
          (1 / 4) * (37 * a ** 2 + a * (22 * b - 74) + 4 * b ** 2 - 22 * b + 37)
        );
      },
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
  ];

  const rows = ballkids.map((ballkid) => ({
    id: ballkid.id,
    ballkid: ballkid,
  }));

  return (
    <div className="page">
      <Banners />

      <Box className="sxs" sx={{ mb: 1 }}>
        <Typography variant="h4">Ratings Leaderboard - Captain</Typography>
        &thinsp;
        <HelpIcon
          page="Ratings Leaderboard - Captain"
          message={ratingsCaptainLeaderboard}
        />
      </Box>

      {loading ? (
        <CircularProgress className="center" size={30} />
      ) : (
        <div>
          <div style={{ height: DATA_GRID_HEIGHT }}>
            <DataGrid columns={columns} rows={rows} density="compact" />
          </div>

          <Typography variant="body1" mt={2}>
            Note: Average is the average of all the ratings submitted (NOT
            received) by this captain/chairperson. Likewise for standard
            deviation. Calibration scale and offset are calculated for each
            rater based on their ratings submitted in 2022, 2023, and 2024 by
            the calibration method described{" "}
            <Link
              target="_blank"
              href="https://github.com/jtiosue/rcal/blob/master/report/review_calibration.pdf"
            >
              here
            </Link>
            .
          </Typography>

          <RaterParamsSection />
        </div>
      )}
    </div>
  );
}
