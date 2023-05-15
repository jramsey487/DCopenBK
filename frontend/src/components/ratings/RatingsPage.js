import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import Link from "@mui/material/Link";
import Collapse from "@mui/material/Collapse";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

import { getAuthHeader } from "../Utils";
import RatingsGrid from "./RatingsGrid";

export default function RatingsPage(props) {
  const [ratings, setRatings] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());

  const [calibrated, setCalibrated] = useState([]);
  const [showCalibrated, setShowCalibrated] = useState(false);
  const [calibrationWarning, setCalibrationWarning] = useState("");
  const [showCalibrationWarning, setShowCalibrationWarning] = useState(false);

  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    fetch(`/api/ratings/${year}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setRatings(data));

    fetch(`/api/calibrated-ratings/${year}`, { headers: getAuthHeader() })
      .then((response) => {
        if (response.status === 204) {
          setCalibrationWarning(
            "Warning: Potentially insufficient data for effective calibration."
          );
        } else if (response.status === 206) {
          setCalibrationWarning(
            "Warning: Potentially insufficient data for effective calibration of one or more reviewers."
          );
        }
        return response.json();
      })
      .then((data) => setCalibrated(data))
      .then(() => setUpdated(false));
  }, [year, updated]);

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 2 }}>
        View Ratings
      </Typography>

      <Box className="sxs" sx={{ mb: 2 }}>
        <Typography variant="body1">Showing ratings for: &thinsp;</Typography>
        <TextField
          variant="standard"
          value={year}
          type="number"
          sx={{ mx: 2, maxWidth: "100px" }}
          onChange={(e) => setYear(e.target.value)}
        />
      </Box>

      <Collapse in={showCalibrationWarning && calibrationWarning !== ""}>
        <Alert
          severity="warning"
          onClose={() => setShowCalibrationWarning(false)}
        >
          {calibrationWarning}
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

      <RatingsGrid
        ratings={showCalibrated ? calibrated : ratings}
        setUpdated={setUpdated}
      />

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
