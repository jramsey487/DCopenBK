import React from "react";
import { Link as RouterLink } from "react-router-dom";

import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";

import Beenhere from "@mui/icons-material/Beenhere";
import Place from "@mui/icons-material/Place";
import RateReview from "@mui/icons-material/RateReview";
import ThumbsUpDown from "@mui/icons-material/ThumbsUpDown";
import { Banners } from "../Utils";

export default function Leaderboards(props) {
  return (
    <div className="page">
      <Banners />

      <Typography variant="h4" sx={{ mb: 2 }}>
        Leaderboards
      </Typography>

      <div className="sxs">
        <Beenhere color="primary" /> &emsp;
        <Link variant="h6" component={RouterLink} to="/leaderboards/checkin">
          Check-in
        </Link>
      </div>

      <div className="sxs">
        <Place color="primary" /> &emsp;
        <Link variant="h6" component={RouterLink} to="/leaderboards/court">
          Court Time
        </Link>
      </div>

      <div className="sxs">
        <ThumbsUpDown color="primary" /> &emsp;
        <Link variant="h6" component={RouterLink} to="/leaderboards/ballkid">
          Ratings - Ballkid
        </Link>
      </div>

      <div className="sxs">
        <RateReview color="primary" /> &emsp;
        <Link variant="h6" component={RouterLink} to="/leaderboards/captain">
          Ratings - Captain
        </Link>
      </div>
    </div>
  );
}
