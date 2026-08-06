import React, { useEffect, useRef, useState } from "react";

import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import TextField from "@mui/material/TextField";
import Slider from "@mui/material/Slider";
import Link from "@mui/material/Link";
import LoadingButton from "@mui/lab/LoadingButton";
import Check from "@mui/icons-material/Check";

import ScheduleCalendar from "../schedule/ScheduleCalendar";
import {
  Alerts,
  getAuthHeader,
  getToday,
  getLocalStorage,
  getDayFromHyphenated,
} from "../Utils";
import "./rating-dialog.css";

const RATING_SLIDER_MARKS = [
  { value: 0, label: "0" },
  { value: 1 },
  { value: 2 },
  { value: 3 },
  { value: 4 },
  { value: 5, label: "5" },
];

function formatSliderRating(value) {
  if (value == null) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * MUI Slider on touch devices fires a synthetic mouse event after touchend
 * that can snap the thumb back to the pre-drag value (mui/material-ui#31869).
 * Ignore those touch-derived mouse events; keep real desktop mouse input.
 */
function shouldIgnoreSliderEvent(event) {
  const native = event?.nativeEvent ?? event;
  if (native?.sourceCapabilities?.firesTouchEvents) return true;
  if (native?.pointerType === "touch") return true;
  return false;
}

export function RatingAndLabel({ label, rating, setRating }) {
  const [sliderValue, setSliderValue] = useState(rating ?? 0);

  useEffect(() => {
    setSliderValue(rating ?? 0);
  }, [rating]);

  return (
    <div className="rating-dialog-grade-row rating-dialog-grade-row--slider">
      <div className="rating-dialog-grade-slider-head">
        <span className="rating-dialog-grade-label">{label}</span>
        <span className="rating-dialog-grade-value">
          {formatSliderRating(sliderValue === 0 ? null : sliderValue)}
        </span>
      </div>
      <Slider
        className="rating-dialog-grade-slider"
        aria-label={label}
        value={sliderValue}
        min={0}
        max={5}
        step={0.5}
        marks={RATING_SLIDER_MARKS}
        valueLabelDisplay="off"
        onChange={(event, newVal) => {
          if (shouldIgnoreSliderEvent(event)) return;
          setSliderValue(newVal);
        }}
        onChangeCommitted={(event, newVal) => {
          if (shouldIgnoreSliderEvent(event)) return;
          setSliderValue(newVal);
          setRating(newVal === 0 ? null : newVal);
        }}
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

  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  // 'draft' | 'submit' | null — drives the success animation on the tapped button
  const [successAction, setSuccessAction] = useState(null);
  const closeTimeoutRef = useRef(null);
  const pendingRefreshRef = useRef(false);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = (e) => {
    if (successAction) return;
    setOpen(false);
    setErrorMsg("");
    e?.stopPropagation?.();
  };

  const handleExited = () => {
    // Refresh the page only after the dialog has fully left, so the parent
    // doesn't swap Give Rating ↔ View Draft while the modal is still visible.
    if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      setUpdated?.(true);
    }
    setSuccessAction(null);
    setErrorMsg("");
  };

  const finishSuccess = (action) => {
    setDraftLoading(false);
    setLoading(false);
    setErrorMsg("");
    setSuccessAction(action);
    closeTimeoutRef.current = setTimeout(() => {
      pendingRefreshRef.current = true;
      setOpen(false);
    }, 900);
  };

  const busy = Boolean(successAction) || loading || draftLoading;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionProps={{ onExited: handleExited }}
      PaperProps={{
        onClick: (e) => e.stopPropagation(),
        className: "rating-dialog-paper",
      }}
    >
      <DialogContent className="rating-dialog-content">
        <Alerts
          successMsg=""
          errorMsg={errorMsg}
          setSuccessMsg={() => {}}
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
        <Button onClick={handleClose} disabled={Boolean(successAction)}>
          Cancel
        </Button>
        <LoadingButton
          className={
            successAction === "draft"
              ? "rating-dialog-action-btn rating-dialog-action-btn--success"
              : "rating-dialog-action-btn"
          }
          loading={draftLoading}
          variant="outlined"
          color="secondary"
          disabled={Boolean(successAction) || loading}
          startIcon={successAction === "draft" ? <Check /> : undefined}
          onClick={() => {
            if (rating == null) {
              setErrorMsg("Overall rating is required to save a draft.");
              return;
            }
            if (busy) return;
            setDraftLoading(true);
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
            })
              .then((response) => {
                if (response.ok) {
                  finishSuccess("draft");
                } else {
                  setErrorMsg("Error saving draft rating.");
                  setDraftLoading(false);
                }
              })
              .catch(() => {
                setErrorMsg("Error saving draft rating.");
                setDraftLoading(false);
              });
          }}
        >
          {successAction === "draft" ? "Saved" : "Save Draft"}
        </LoadingButton>
        <LoadingButton
          className={
            successAction === "submit"
              ? "rating-dialog-action-btn rating-dialog-action-btn--success"
              : "rating-dialog-action-btn"
          }
          loading={loading}
          variant="contained"
          color="primary"
          disabled={Boolean(successAction) || draftLoading}
          startIcon={successAction === "submit" ? <Check /> : undefined}
          onClick={() => {
            if (busy) return;
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
            })
              .then((response) => {
                if (response.ok) {
                  finishSuccess("submit");
                } else {
                  setErrorMsg("Error submitting rating.");
                  setLoading(false);
                }
              })
              .catch(() => {
                setErrorMsg("Error submitting rating.");
                setLoading(false);
              });
          }}
        >
          {successAction === "submit" ? "Submitted" : "Submit"}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}