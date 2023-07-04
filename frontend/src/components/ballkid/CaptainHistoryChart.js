import React, { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { getTimeFloat, getAuthHeader } from "../Utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

export function CaptainHistoryChart({ pk }) {
  const [histories, setHistories] = useState([]);

  useEffect(() => {
    fetch(`/api/get-captains/${pk}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setHistories(data));
  }, [pk]);

  const labels = histories.map(
    (analytic) =>
      analytic["captain"].first_name + " " + analytic["captain"].last_name
  );

  const options = {
    plugins: {
      title: {
        display: true,
        text: "Captain History",
      },
      legend: {
        display: false,
      },
    },
    responsive: true,
    indexAxis: "y",
    scales: {
      x: {
        title: {
          display: true,
          text: "Time on Captain's Team (in hours)",
        },
      },
      y: {
        title: {
          display: true,
          text: "Captain Name",
        },
      },
    },
  };

  const data = {
    labels,
    datasets: [
      {
        label: "Time on Captain's Team",
        data: histories.map((analytic) => getTimeFloat(analytic["duration"])),
        backgroundColor: "rgb(240, 99, 132)",
      },
    ],
  };
  return (
    <div>
      <Bar options={options} data={data} />
      <Typography variant="body2">
        Note: The captain history chart only displays captains with at least 30
        minutes of total time with this ballkid.
      </Typography>
    </div>
  );
}
