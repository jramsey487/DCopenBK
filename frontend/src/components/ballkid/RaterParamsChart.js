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
      },
      y: {
        title: {
          display: true,
          text: "Calibrated Rating (stars)",
        },
      },
    },
  };

  const data = {
    datasets: [
      {
        label: "Captain",
        data: [
          { x: 0.5, y: 0.5 },
          { x: Math.max((0.5 - offset) / scale, 0.5), y: 0.5 },
          { x: Math.min((5 - offset) / scale, 5), y: 5 },
          { x: 5, y: 5 },
        ],
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "Average",
        data: [
          { x: 0.5, y: 0.5 },
          { x: Math.max((0.5 - average_offset) / average_scale, 0.5), y: 0.5 },
          { x: Math.min((5 - average_offset) / average_scale, 5), y: 5 },
          { x: 5, y: 5 },
        ],
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
      {
        label: "Ideal",
        data: [
          { x: 0.5, y: 0.5 },
          { x: 5, y: 5 },
        ],
        borderColor: "rgb(0, 192, 75)",
        backgroundColor: "rgba(0, 192, 75, 0.5)",
      },
    ],
  };

  return <Scatter options={options} data={data} />;
}
