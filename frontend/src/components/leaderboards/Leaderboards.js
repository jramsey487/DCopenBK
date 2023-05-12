import React from "react";

import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";

import Beenhere from "@mui/icons-material/Beenhere";
import Place from "@mui/icons-material/Place";
import RateReview from "@mui/icons-material/RateReview";
import ThumbsUpDown from "@mui/icons-material/ThumbsUpDown";

export default function Leaderboards(props) {
  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 2 }}>
        Leaderboards
      </Typography>

      <div className="sxs">
        <Beenhere color="primary" /> &emsp;
        <Typography variant="h6" component={Link} href="/leaderboards/checkin">
          Check-in
        </Typography>
      </div>

      <div className="sxs">
        <Place color="primary" /> &emsp;
        <Typography variant="h6" component={Link} href="/leaderboards/court">
          Court Time
        </Typography>
      </div>

      <div className="sxs">
        <ThumbsUpDown color="primary" /> &emsp;
        <Typography variant="h6" component={Link} href="/leaderboards/ballkid">
          Ratings - Ballkid
        </Typography>
      </div>

      <div className="sxs">
        <RateReview color="primary" /> &emsp;
        <Typography variant="h6" component={Link} href="/leaderboards/captain">
          Ratings - Captain
        </Typography>
      </div>
    </div>
  );
}
