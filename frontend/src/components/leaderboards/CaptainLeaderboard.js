import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import CircularProgress from "@mui/material/CircularProgress";
import Select from "@mui/material/Select";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Chip from "@mui/material/Chip";

import { DataGrid } from "@mui/x-data-grid";

import {
  BallkidAndIcon,
  HelpIcon,
  TournamentBanner,
  getAuthHeader,
} from "../Utils";
import { ratingsCaptainLeaderboard } from "../HelpMessages";
import { CHART_COLORS, DATA_GRID_HEIGHT, MARGINS, CHART_GRAY } from "../Consts";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Scatter } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function RaterParamsChart() {
  const [params, setParams] = useState();
  const [average, setAverage] = useState();

  const [selected, setSelected] = useState([]);

  useEffect(() => {
    fetch("/api/calibration-parameters", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setParams(data));

    fetch("/api/average-calibration-parameters", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setAverage(data));
  }, []);

  const options = {
    responsive: true,
    showLine: true,
    pointStyle: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: false,
        text: "Rater Parameters",
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Raw Rating (stars)",
        },
        min: 0.5,
        max: 5,
      },
      y: {
        title: {
          display: true,
          text: "Calibrated Rating (stars)",
        },
        min: 0.5,
        max: 5,
      },
    },
  };

  const captainData = selected.map((name, index) => {
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
  });

  const data = {
    datasets: [
      ...captainData,
      {
        label: "Average",
        data: [
          {
            x: 0.5,
            y: average?.rater_scale__avg * 0.5 + average?.rater_offset__avg,
          },
          {
            x: 5,
            y: average?.rater_scale__avg * 5 + average?.rater_offset__avg,
          },
        ],
        borderDash: [10, 5],
        borderColor: CHART_GRAY,
        backgroundColor: `${CHART_GRAY}50`,
      },
      {
        label: "Ideal",
        data: [
          { x: 0.5, y: 0.5 },
          { x: 5, y: 5 },
        ],
        borderDash: [4, 4],
        borderColor: CHART_GRAY,
        backgroundColor: `${CHART_GRAY}50`,
      },
    ],
  };

  return params === undefined || params === null ? (
    ""
  ) : (
    <div>
      <Typography variant="h6" sx={MARGINS}>
        Rater Parameters Comparison Chart
      </Typography>
      <FormControl sx={{ mb: 2, width: 500 }}>
        <InputLabel>Select Raters to Compare...</InputLabel>
        <Select
          multiple
          variant="standard"
          label="Select Raters to View"
          value={selected}
          onChange={(e) => {
            const val = e.target.value;
            setSelected(typeof val === "string" ? val.split(",") : val);
          }}
          renderValue={(names) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {names.map((name) => (
                <Chip key={name} label={name} />
              ))}
            </Box>
          )}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 48 * 4.5 + 8,
                width: 250,
              },
            },
          }}
        >
          {params.map((param) => (
            <MenuItem key={param.id} value={param.name}>
              {param.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Scatter options={options} data={data} />;
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
      <TournamentBanner />

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
            rater based on their ratings submitted in 2022 and 2023 by the
            calibration method described{" "}
            <Link
              target="_blank"
              href="https://github.com/jtiosue/rcal/blob/master/report/review_calibration.pdf"
            >
              here
            </Link>
            .
          </Typography>

          <RaterParamsChart />
        </div>
      )}
    </div>
  );
}
