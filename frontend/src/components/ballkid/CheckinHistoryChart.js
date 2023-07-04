import React, { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { getTimeFloat, getDays, getAuthHeader } from "../Utils";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

function isSameDay(checkin, date) {
  const date_month = date.getMonth() + 1;
  const date_day = date.getDate();
  const date_year = date.getFullYear();

  const checkin_date = checkin.split("T")[0];
  const checkin_year = parseInt(checkin_date.split("-")[0]);
  const checkin_month = parseInt(checkin_date.split("-")[1]);
  const checkin_day = parseInt(checkin_date.split("-")[2]);

  return (
    checkin_day === date_day &&
    checkin_month === date_month &&
    checkin_year === date_year
  );
}

function getCheckinTime(history, date) {
  for (const shift of history) {
    if (isSameDay(shift["start"], date)) {
      return getTimeFloat(shift["start"].toString().split("T")[1]);
    }
  }
  return 0;
}

function getCheckinDuration(history, date) {
  for (const shift of history) {
    if (isSameDay(shift["start"], date)) {
      if (shift["duration"] !== "00:00:00") {
        return getTimeFloat(shift["duration"]);
      }
    }
  }
  return 0.1;
}

export function CheckinHistoryChart({ pk }) {
  // Note that this only plots the first shift a ballkid is checked in for the day.
  // TODO: modify to capture if ballkid checks in, then out, then in, then out
  //
  // Also note that this only plots if the ballkid checks in before midnight.
  // TODO: modify to capture if ballkid checks in after midnight

  const [histories, setHistories] = useState([]);

  useEffect(() => {
    fetch(`/api/get-checkins/${pk}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setHistories(data));
  }, [pk]);

  const days = getDays();
  const labels = days.map((day) => day.toDateString());

  const options = {
    plugins: {
      title: {
        display: true,
        text: "Check-in History",
      },
      legend: {
        display: false,
      },
    },
    responsive: true,
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        reverse: true,
        min: 8,
        max: 28,
        ticks: {
          callback: function (label) {
            return (
              (label % 12 || 12) + (label >= 12 && label < 24 ? "pm" : "am")
            );
          },
        },
      },
    },
  };

  const data = {
    labels,
    datasets: [
      {
        label: "Check-in Time",
        data: days.map((day) => getCheckinTime(histories, day)),
        backgroundColor: "rgb(0, 0, 0, 0)",
      },

      {
        label: "Hours Checked In",
        data: days.map((day) => getCheckinDuration(histories, day)),
        backgroundColor: "rgb(75, 192, 192)",
      },
    ],
  };

  return (
    <div>
      <Bar options={options} data={data} />
      <Typography variant="body2">
        Note: The check-in history chart only displays a ballkid's first
        segment, in the event of a ballkid checking in and out multiples times
        in a day. The total time checked in statistic is fully accurate
        (incorporates all segments).
      </Typography>
    </div>
  );
}
