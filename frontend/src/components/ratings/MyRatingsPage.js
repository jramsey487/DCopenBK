import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import {
  HelpIcon,
  TournamentBanner,
  getAuthHeader,
  getLocalStorage,
} from "../Utils";
import RatingsGrid from "./RatingsGrid";
import { viewMyRatings, viewMyRatingsNonchairperson } from "../HelpMessages";

export default function MyRatingsPage(props) {
  const [ratings, setRatings] = useState([]);
  const [updated, setUpdated] = useState(false);

  const ballkidId = getLocalStorage("ballkid_id");
  const group = getLocalStorage("group");

  useEffect(() => {
    fetch(`/api/my-ratings/${ballkidId}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setRatings(data))
      .then(() => setUpdated(false));
  }, [ballkidId, updated]);

  return (
    <div className="page">
      <TournamentBanner />

      <Box className="sxs" sx={{ mb: 1 }}>
        <Typography variant="h4">View My Ratings</Typography>
        &thinsp;
        <HelpIcon
          page="View My Ratings"
          message={
            group === "chairperson"
              ? viewMyRatings
              : viewMyRatingsNonchairperson
          }
        />
      </Box>

      <RatingsGrid ratings={ratings} setUpdated={setUpdated} />
    </div>
  );
}
