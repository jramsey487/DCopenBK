import React, { useState } from "react";

import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import TextField from "@mui/material/TextField";
import Rating from "@mui/material/Rating";
import Link from "@mui/material/Link";
import LoadingButton from "@mui/lab/LoadingButton";

import ScheduleCalendar from "../schedule/ScheduleCalendar";
import {
  Alerts,
  getAuthHeader,
  getToday,
  getLocalStorage,
  getDayFromHyphenated,
} from "../Utils";
import "./rating-dialog.css";

export function RatingAndLabel({ label, rating, setRating }) {
  return (
    <div className="rating-dialog-grade-row">
      <span className="rating-dialog-grade-label">{label}</span>
      <Rating
        precision={0.5}
        value={rating}
        onChange={(e, newVal) => setRating(newVal)}
      />
    </div>
  );
}

function formatDateDisplay(dateStr) {
  const [mm, dd, yyyy] = dateStr.split("/");
  const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RatingDateField({ date, setDate }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rating-dialog-field rating-dialog-date-field">
      <span className="rating-dialog-field-label">Date *</span>
      <button
        type="button"
        className="rating-dialog-date-btn"
        onClick={() => setOpen(true)}
      >
        <span>{formatDateDisplay(date)}</span>
        <svg viewBox="0 0 24 24" fill="none" width="17" height="17">
          <rect
            x="3.5"
            y="5"
            width="17"
            height="16"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M3.5 9.5H20.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M8 3V6.5M16 3V6.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <ScheduleCalendar
          date={date}
          today={getToday("slash", true)}
          onSelect={(dateStr) => setDate(dateStr)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

export default function RatingDialog({
  open,
  setOpen,
  ballkid,
  setUpdated,
  inputDate = null,
  draft = {},
}) {
  const raterId = getLocalStorage("ballkid_id");

  const [date, setDate] = useState(
    getDayFromHyphenated(draft.date) ?? inputDate ?? getToday("slash", true)
  );
  const [rating, setRating] = useState(draft.rating ?? null);
  const [comments, setComments] = useState(draft.comments ?? "");
  const [athleticismRating, setAthleticismRating] = useState(
    draft.athleticism_rating ?? null
  );
  const [rollingRating, setRollingRating] = useState(
    draft.rolling_rating ?? null
  );
  const [awarenessRating, setAwarenessRating] = useState(
    draft.awareness_rating ?? null
  );
  const [decisionRating, setDecisionRating] = useState(
    draft.decision_rating ?? null
  );
  const [effortRating, setEffortRating] = useState(draft.effort_rating ?? null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [loading, setLoading] = useState(false);

  const handleClose = (e) => {
    setOpen(false);
    setErrorMsg("");
    e.stopPropagation();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        onClick: (e) => e.stopPropagation(),
        className: "rating-dialog-paper",
      }}
    >
      <DialogContent className="rating-dialog-content">
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />

        <Typography className="rating-dialog-title">Give Rating</Typography>

        <div className="rating-dialog-fields-row">
          <div className="rating-dialog-field">
            <span className="rating-dialog-field-label">Ratee *</span>
            <div className="rating-dialog-ratee-value">
              {ballkid.first_name + " " + ballkid.last_name}
            </div>
          </div>

          <RatingDateField date={date} setDate={setDate} />
        </div>

        <div className="rating-dialog-grades">
          <RatingAndLabel
            label={"Overall*"}
            rating={rating}
            setRating={setRating}
          />
          <RatingAndLabel
            label={"Athleticism"}
            rating={athleticismRating}
            setRating={setAthleticismRating}
          />
          <RatingAndLabel
            label={"Rolling"}
            rating={rollingRating}
            setRating={setRollingRating}
          />
          <RatingAndLabel
            label={"Awareness"}
            rating={awarenessRating}
            setRating={setAwarenessRating}
          />
          <RatingAndLabel
            label={"Effort"}
            rating={effortRating}
            setRating={setEffortRating}
          />
          <RatingAndLabel
            label={"Decision-making"}
            rating={decisionRating}
            setRating={setDecisionRating}
          />
        </div>

        <TextField
          className="rating-dialog-comments"
          label="Comments"
          variant="standard"
          fullWidth
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          multiline
        />

        <div className="rating-dialog-note">
          Note: Ratings are required to be between 0.5 and 5 stars. Zero star
          ratings are considered empty. Overall rating is required. All other
          rating categories are optional. For information on how ratings are
          calibrated across reviewers, see{" "}
          <Link
            target="_blank"
            href="https://github.com/jtiosue/rcal/blob/master/report/review_calibration.pdf"
          >
            here
          </Link>
          .
        </div>
      </DialogContent>

      <DialogActions className="rating-dialog-actions">
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() =>
            fetch("/api/save-draft-rating", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                rater: raterId,
                ratee: ballkid.id,
                date: date,
                rating: rating,
                athleticism_rating: athleticismRating,
                rolling_rating: rollingRating,
                awareness_rating: awarenessRating,
                decision_rating: decisionRating,
                effort_rating: effortRating,
                comments: comments,
              }),
            }).then((response) => {
              if (response.ok) {
                setUpdated(true);
                setSuccessMsg("Draft rating saved!");
                setTimeout(() => {
                  setOpen(false);
                  setSuccessMsg("");
                }, 2500);
              } else {
                setErrorMsg("Error saving draft rating.");
              }
            })
          }
        >
          Save Draft
        </Button>
        <LoadingButton
          loading={loading}
          variant="contained"
          color="primary"
          onClick={(e) => {
            setLoading(true);
            fetch("/api/create-rating", {
              method: "POST",
              headers: getAuthHeader(),
              body: JSON.stringify({
                status: "Complete",
                rater: raterId,
                ratee: ballkid.id,
                date: date,
                rating: rating,
                athleticism_rating: athleticismRating,
                rolling_rating: rollingRating,
                awareness_rating: awarenessRating,
                decision_rating: decisionRating,
                effort_rating: effortRating,
                comments: comments,
              }),
            }).then((response) => {
              if (response.ok) {
                setUpdated(true);
                setSuccessMsg("Rating submitted!");
                setTimeout(() => {
                  setOpen(false);
                  setComments("");
                  setRating(null);
                  setAthleticismRating(null);
                  setRollingRating(null);
                  setAwarenessRating(null);
                  setDecisionRating(null);
                  setEffortRating(null);
                  setSuccessMsg("");
                }, 2500);
              } else {
                setErrorMsg("Error submitting rating.");
              }
              setLoading(false);
            });
          }}
        >
          Submit
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}