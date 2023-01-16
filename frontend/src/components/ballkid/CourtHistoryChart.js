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

function getAnalytic(analytics, court) {
  for (const analytic of analytics) {
    if (analytic["court"] == court) {
      return analytic;
    }
  }
  return { duration: "00:00" };
}

export function CourtHistoryChart(props) {
  const analytics = props.histories;
  const labels = ["Stadium", "Harris", "Grandstand", "Court 4", "Court 5"];

  const options = {
    plugins: {
      title: {
        display: true,
        text: "Court Time History",
      },
      legend: {
        display: false,
      },
    },
    responsive: true,
    indexAxis: "x",
    scales: {
      x: {
        title: {
          display: true,
          text: "Court",
        },
      },
      y: {
        title: {
          display: true,
          text: "Time on Court (in hours)",
        },
      },
    },
  };

  const data = {
    labels,
    datasets: [
      {
        label: "Time on Court",
        data: labels.map((court) =>
          getTimeFloat(getAnalytic(analytics, court)["duration"])
        ),
        backgroundColor: "rgb(177, 156, 217)",
      },
    ],
  };
  return <Bar options={options} data={data} />;
}
