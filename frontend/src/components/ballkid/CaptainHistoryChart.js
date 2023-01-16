import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { getTimeFloat } from "../Utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

export function CaptainHistoryChart(props) {
  const analytics = props.histories;
  const labels = analytics.map(
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
        data: analytics.map((analytic) => getTimeFloat(analytic["duration"])),
        backgroundColor: "rgb(240, 99, 132)",
      },
    ],
  };
  return <Bar options={options} data={data} />;
}
