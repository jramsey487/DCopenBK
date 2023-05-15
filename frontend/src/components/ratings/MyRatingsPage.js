import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";

import { getAuthHeader, getLocalStorage } from "../Utils";
import RatingsGrid from "./RatingsGrid";

export default function MyRatingsPage(props) {
  const [ratings, setRatings] = useState([]);
  const [updated, setUpdated] = useState(false);

  const ballkidId = getLocalStorage("ballkid_id");

  useEffect(() => {
    fetch(`/api/my-ratings/${ballkidId}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setRatings(data))
      .then(() => setUpdated(false));
  }, [ballkidId, updated]);

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 2 }}>
        View My Ratings
      </Typography>

      <RatingsGrid ratings={ratings} setUpdated={setUpdated} />
    </div>
  );
}
