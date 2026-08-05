import React, { useState, useEffect } from "react";

import Link from "@mui/material/Link";
import Collapse from "@mui/material/Collapse";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

import { getAuthHeader, getCurrentYear } from "../Utils";
import { viewRatings } from "../HelpMessages";
import RatingsGrid from "./RatingsGrid";
import {
  RatingsPageShell,
  RatingsGridPanel,
  YearPillControl,
  RatingsModeToggle,
} from "./RatingsPageShared";

export default function RatingsPage() {
  const [ratings, setRatings] = useState([]);
  const [year, setYear] = useState(getCurrentYear());

  const [calibrated, setCalibrated] = useState([]);
  const [showCalibrated, setShowCalibrated] = useState(false);
  const [calibrationWarning, setCalibrationWarning] = useState("");
  const [showCalibrationWarning, setShowCalibrationWarning] = useState(false);

  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    fetch(`/api/ratings/${year}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setRatings(data))
      .then(() => setUpdated(false));
  }, [year, updated]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calibrated-ratings/${year}`, { headers: getAuthHeader() })
      .then((response) => {
        if (response.status === 203) {
          setCalibrationWarning(
            "Warning: Insufficient data for effective overall calibration."
          );
        } else if (response.status === 206) {
          setCalibrationWarning(
            "Warning: Insufficient data for effective calibration of one or more reviewers."
          );
        } else {
          setCalibrationWarning("");
        }
        return response.json();
      })
      .then((data) => setCalibrated(data))
      .finally(() => setLoading(false));
  }, [year]);

  const handleModeChange = (checked) => {
    setShowCalibrated(checked);
    setShowCalibrationWarning(checked);
  };

  return (
    <RatingsPageShell
      title="View Ratings"
      helpPage="View Ratings"
      helpMessage={viewRatings}
      toolbar={
        <>
          <YearPillControl
            id="view-ratings-year"
            label="Year"
            value={year}
            onChange={setYear}
          />
          <RatingsModeToggle
            showCalibrated={showCalibrated}
            onChange={handleModeChange}
          />
        </>
      }
      footer={
        <>
          For more information on how calibration is done, see{" "}
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/jtiosue/rcal/blob/master/report/review_calibration.pdf"
          >
            here
          </Link>
          .
        </>
      }
    >
      <Collapse in={showCalibrationWarning && calibrationWarning !== ""}>
        <Alert
          className="ratings-alert"
          severity="warning"
          onClose={() => setShowCalibrationWarning(false)}
        >
          {calibrationWarning}
        </Alert>
      </Collapse>

      {showCalibrated && loading ? (
        <RatingsGridPanel loading>
          <CircularProgress size={28} />
        </RatingsGridPanel>
      ) : (
        <RatingsGridPanel>
          <RatingsGrid
            ratings={showCalibrated ? calibrated : ratings}
            setUpdated={setUpdated}
          />
        </RatingsGridPanel>
      )}
    </RatingsPageShell>
  );
}
