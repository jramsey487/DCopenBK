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
          // clip at .5 and 5, but add some padding.
          y: Math.min(Math.max(improvement * index + offset, 0.525), 4.975),
        })),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
    ],
  };

  return <Scatter options={options} data={data} />;
}
