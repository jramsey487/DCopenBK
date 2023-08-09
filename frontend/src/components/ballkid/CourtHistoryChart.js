import React, { useEffect, useState } from "react";

import CircularProgress from "@mui/material/CircularProgress";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { getTimeFloat, getAuthHeader, getLocalStorage } from "../Utils";
import { CHART_COLORS } from "../Consts";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

const courtNameToKey = {
  Stadium: "stadium",
  Harris: "harris",
  Grandstand: "grandstand",
  "Court 4": "four",
  "Court 5": "five",
};

function getDurationFloat(analytics, court) {
  return getTimeFloat(analytics[`${courtNameToKey[court]}_duration`]);
}

function getAverageDurationFloat(averages, court) {
  return parseFloat(averages[`${courtNameToKey[court]}_avg`]) / 3600;
}

export function CourtHistoryChart({ pk }) {
  const [analytics, setAnalytics] = useState([]);
  const [averages, setAverages] = useState([]);
  const [loading, setLoading] = useState(true);

  const isChairperson = getLocalStorage("group") === "chairperson";

  useEffect(() => {
    fetch(`/api/get-checkin-court-analytics/${pk}`, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setAnalytics(data));

    isChairperson
      ? fetch("/api/get-average-court-leaderboard", {
          headers: getAuthHeader(),
        })
          .then((response) => response.json())
          .then((data) => setAverages(data))
          .then(() => setLoading(false))
      : setLoading(false);
  }, [pk, isChairperson]);

  const labels = ["Stadium", "Harris", "Grandstand", "Court 4", "Court 5"];

  const options = {
    plugins: {
      title: {
        display: true,
        text: "Court Time History",
      },
      legend: {
        display: isChairperson ? true : false,
        position: "top",
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

  var dataset = [
    {
      label: "Time on Court",
      data: labels.map((court) => getDurationFloat(analytics, court)),
      backgroundColor: CHART_COLORS[9],
    },
  ];
  dataset = !isChairperson
    ? dataset
    : [
        ...dataset,
        {
          label: "Average Time on Court",
          data: labels.map((court) => getAverageDurationFloat(averages, court)),
          backgroundColor: `${CHART_COLORS[9]}85`,
        },
      ];

  const data = {
    labels,
    datasets: dataset,
  };

  return loading ? (
    <CircularProgress className="center-div" size={30} />
  ) : (
    <Bar options={options} data={data} />
  );
}
