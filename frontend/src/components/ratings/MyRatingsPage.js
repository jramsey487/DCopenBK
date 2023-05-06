import React, { useState, useEffect } from "react";
import { Typography } from "@mui/material";
import { getAuthHeader, getLocalStorage } from "../Utils";
import RatingsGrid from "./RatingsGrid";
import { useSearchParams } from "react-router-dom";

export default function MyRatingsPage(props) {
  const [ratings, setRatings] = useState([]);
  const ballkidId = getLocalStorage("ballkid_id");

  const [rateeName, setRateeName] = useState();

  // eslint-disable-next-line no-unused-vars
  const [searchParams, setSearchParams] = useSearchParams();
  const ratee_id = searchParams.get("ratee");

  useEffect(() => {
    fetch("/api/my-ratings/" + ballkidId, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setRatings(data));

    if (ratee_id) {
      fetch("/api/get-ballkid/" + ratee_id, { headers: getAuthHeader() })
        .then((response) => response.json())
        .then((data) => setRateeName(data.first_name + " " + data.last_name));
    } else {
      setRateeName("");
    }
  }, [ballkidId, ratee_id]);

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 2 }}>
        View My Ratings
      </Typography>

      {rateeName == null ? (
        ""
      ) : (
        <RatingsGrid ratings={ratings} rateeName={rateeName} />
      )}
    </div>
  );
}
