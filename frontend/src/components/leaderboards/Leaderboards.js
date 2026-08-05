import React from "react";
import { Link as RouterLink } from "react-router-dom";

import Beenhere from "@mui/icons-material/Beenhere";
import Place from "@mui/icons-material/Place";
import RateReview from "@mui/icons-material/RateReview";
import ThumbsUpDown from "@mui/icons-material/ThumbsUpDown";

import { LeaderboardShell } from "./LeaderboardsShared";

const LINKS = [
  {
    to: "/leaderboards/checkin",
    title: "Check-in",
    desc: "Time checked in, days worked, and average check-in/out",
    Icon: Beenhere,
  },
  {
    to: "/leaderboards/court",
    title: "Court Time",
    desc: "Time on court overall and by venue",
    Icon: Place,
  },
  {
    to: "/leaderboards/ballkid",
    title: "Ratings — Ballkid",
    desc: "Raw and calibrated averages for ballkids",
    Icon: ThumbsUpDown,
  },
  {
    to: "/leaderboards/captain",
    title: "Ratings — Captain",
    desc: "Rater stats, calibration scale, and distance to ideal",
    Icon: RateReview,
  },
];

export default function Leaderboards() {
  return (
    <LeaderboardShell
      title="Leaderboards"
      helpPage="Leaderboards"
      helpMessage="Pick a leaderboard to view check-in, court time, or ratings standings."
      className="leaderboard-hub-page"
    >
      <div className="leaderboard-hub">
        {LINKS.map(({ to, title, desc, Icon }) => (
          <RouterLink key={to} to={to} className="leaderboard-hub-card">
            <span className="leaderboard-hub-card__icon" aria-hidden="true">
              <Icon fontSize="small" />
            </span>
            <span className="leaderboard-hub-card__text">
              <span className="leaderboard-hub-card__title">{title}</span>
              <span className="leaderboard-hub-card__desc">{desc}</span>
            </span>
          </RouterLink>
        ))}
      </div>
    </LeaderboardShell>
  );
}
