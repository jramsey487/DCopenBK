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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

function getDuration(courts, court) {
  for (const analytic of courts) {
    if (analytic["court"] === court) {
      return analytic["duration"];
    }
  }
  return "00:00";
}

function getAverageDurationFloat(averages, court) {
  const courtNameToKey = {
    Stadium: "stadium_avg",
    Harris: "harris_avg",
    Grandstand: "grandstand_avg",
    "Court 4": "four_avg",
    "Court 5": "five_avg",
  };

  return parseFloat(averages[courtNameToKey[court]]) / 3600;
}

export function CourtHistoryChart({ pk }) {
  const [courts, setCourts] = useState([]);
  const [averages, setAverages] = useState([]);
  const [loading, setLoading] = useState(true);

  const isChairperson = getLocalStorage("group") === "chairperson";

  useEffect(() => {
    fetch(`/api/get-courts/${pk}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setCourts(data));

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
      data: labels.map((court) => getTimeFloat(getDuration(courts, court))),
      backgroundColor: "rgb(177, 156, 217)",
    },
  ];
  dataset = !isChairperson
    ? dataset
    : [
        ...dataset,
        {
          label: "Average Time on Court",
          data: labels.map((court) => getAverageDurationFloat(averages, court)),
          backgroundColor: "rgba(177, 156, 240, 0.5)",
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
