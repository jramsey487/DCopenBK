import React from "react";
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
import { CHART_COLORS, CHART_GRAY } from "../Consts";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function RaterParamsChart({
  offset,
  scale,
  average_offset,
  average_scale,
}) {
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
      {
        label: "Captain",

        data: [
          { x: 0.5, y: scale * 0.5 + offset },
          { x: 5, y: scale * 5 + offset },
        ],
        borderColor: CHART_COLORS[11],
        backgroundColor: `${CHART_COLORS[11]}50`,
      },
      {
        label: "Average",
        data: [
          { x: 0.5, y: average_scale * 0.5 + average_offset },
          { x: 5, y: average_scale * 5 + average_offset },
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

  return <Scatter options={options} data={data} />;
}
