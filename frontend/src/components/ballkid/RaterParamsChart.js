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
import { Line } from "react-chartjs-2";

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

  const labels = [0.5, 5];
  const data = {
    labels,
    datasets: [
      {
        label: "Captain",
        data: [0.5 * scale + offset, 5 * scale + offset],
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "Average",
        data: [
          0.5 * average_scale + average_offset,
          5 * average_scale + average_offset,
        ],
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
      {
        label: "Ideal",
        data: [0.5, 5],
        borderColor: "rgb(0, 192, 75)",
        backgroundColor: "rgba(0, 192, 75, 0.5)",
      },
    ],
  };

  return <Line options={options} data={data} />;
}
