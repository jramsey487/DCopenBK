import React, { useState, useEffect } from "react";
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
import { CHART_GRAY } from "../Consts";
import { api } from "../api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function RaterParamsChart({ captainData }) {
  const [average, setAverage] = useState({});

  useEffect(() => {
    api("/api/average-calibration-parameters")
      .then((data) => setAverage(data))
      .catch((error) => window.alert(error.message));
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
        display: true,
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

  const data = {
    datasets: [
      ...captainData,
      {
        label: "Average",
        data: [
          {
            x: 0.5,
            y: average.rater_scale__avg * 0.5 + average.rater_offset__avg,
          },
          { x: 5, y: average.rater_scale__avg * 5 + average.rater_offset__avg },
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

  return average === undefined || average === null ? (
    ""
  ) : (
    <Scatter options={options} data={data} />
  );
}
