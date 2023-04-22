import React from "react";
import { Typography, Link } from "@mui/material";
import { Beenhere, Place, RateReview } from "@mui/icons-material";

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
        <RateReview color="primary" /> &emsp;
        <Typography variant="h6" component={Link} href="/leaderboards/ratings">
          Ratings
        </Typography>
      </div>

      <div className="sxs">
        <Place color="primary" /> &emsp;
        <Typography variant="h6" component={Link} href="/leaderboards/court">
          Court Time
        </Typography>
      </div>
    </div>
  );
}
