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
import { getDays } from "../Utils";
import { CHART_COLORS } from "../Consts";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function BallkidParamsChart({ offset, improvement }) {
  const days = getDays();
  const labels = days.map((day) => day.toDateString());

  const options = {
    responsive: true,
    showLine: true,
    pointStyle: false,
    plugins: {
      legend: {
        // position: "top",
        display: false,
      },
      title: {
        display: true,
        text: "Ballkid Parameters",
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Time (days)",
        },
        type: "category",
        labels: labels,
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
    labels,
    datasets: [
      {
        label: "Ballkid",
        data: days.map((day, index) => ({
          x: day,
          y: improvement * index + offset,
        })),
        borderColor: CHART_COLORS[11],
        backgroundColor: `${CHART_COLORS[11]}50`,
      },
    ],
  };

  return <Scatter options={options} data={data} />;
}
