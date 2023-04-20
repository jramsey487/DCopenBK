import React, { useState, useEffect } from "react";
import { Typography, Switch, Link, Collapse, Alert } from "@mui/material";
import { getAuthHeader, RatingsGrid } from "../Utils";
import { useSearchParams } from "react-router-dom";

export default function RatingsPage(props) {
  const [ratings, setRatings] = useState([]);

  const [calibrated, setCalibrated] = useState([]);
  const [showCalibrated, setShowCalibrated] = useState(false);
  const [calibrationWarning, setCalibrationWarning] = useState(false);
  const [showCalibrationWarning, setShowCalibrationWarning] = useState(false);

  const [rateeName, setRateeName] = useState();
  const [raterName, setRaterName] = useState();

  // eslint-disable-next-line no-unused-vars
  const [searchParams, setSearchParams] = useSearchParams();
  const ratee_id = searchParams.get("ratee");
  const rater_id = searchParams.get("rater");

  useEffect(() => {
    fetch("/api/ratings", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setRatings(data));

    if (ratee_id) {
      fetch("/api/get-ballkid/" + ratee_id, { headers: getAuthHeader() })
        .then((response) => response.json())
        .then((data) => {
          setRateeName(data.first_name + " " + data.last_name);
          setRaterName("");
        });
    } else if (rater_id) {
      fetch("/api/get-ballkid/" + rater_id, { headers: getAuthHeader() })
        .then((response) => response.json())
        .then((data) => {
          setRaterName(data.first_name + " " + data.last_name);
          setRateeName("");
        });
    } else {
      setRateeName("");
      setRaterName("");
    }

    fetch("/api/calibrated-ratings", { headers: getAuthHeader() })
      .then((response) => {
        if (response.status === 206) {
          setCalibrationWarning(true);
        }
        return response.json();
      })
      .then((data) => setCalibrated(data));
  }, [ratee_id, rater_id]);

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 2 }}>
        View Ratings
      </Typography>

      <Collapse in={showCalibrationWarning && calibrationWarning}>
        <Alert
          severity="warning"
          onClose={() => setShowCalibrationWarning(false)}
        >
          Warning: Potentially insufficient data for effective calibration!
        </Alert>
      </Collapse>

      <div className="sxs">
        <Typography variant="body1">Raw Ratings</Typography>
        <Switch
          checked={showCalibrated}
          onClick={(e) => {
            setShowCalibrated(e.target.checked);
            setShowCalibrationWarning(e.target.checked);
          }}
        />
        <Typography variant="body1">Calibrated Ratings</Typography>
      </div>

      {(rateeName == null) | (raterName == null) ? (
        ""
      ) : (
        <RatingsGrid
          ratings={showCalibrated ? calibrated : ratings}
          rateeName={rateeName}
          raterName={raterName}
        />
      )}

      <Typography variant="body2" sx={{ mt: 1 }}>
        For more information on how calibration is done, see{" "}
        <Link
          target="_blank"
          href="https://github.com/jtiosue/rcal/blob/master/report/review_calibration.pdf"
        >
          here
        </Link>
        .
      </Typography>
    </div>
  );
}
