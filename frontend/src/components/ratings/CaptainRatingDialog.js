import React, { useEffect, useRef, useState } from "react";

import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import LoadingButton from "@mui/lab/LoadingButton";
import Check from "@mui/icons-material/Check";

import { RatingAndLabel } from "./RatingDialog";
import { Alerts } from "../dialogs";
import { getAuthHeader } from "../authStorage";
import "./rating-dialog.css";

export const CONTEXT_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "shift", label: "Worked a shift with them" },
  { value: "off_shift", label: "Saw something off-shift" },
  { value: "other", label: "Other" },
];

export function contextLabel(value) {
  const match = CONTEXT_OPTIONS.find((o) => o.value === value);
  return value && match ? match.label : "";
}

/** Turn a DRF error body ({field: ["msg"]} or {detail: "msg"}) into one string. */
async function readError(response, fallback) {
  try {
    const body = await response.json();
    const parts = Object.values(body)
      .flat()
      .filter((v) => typeof v === "string");
    return parts.length ? parts.join(" ") : fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * Props:
 *   open, setOpen
 *   captain:  { id, name }   the captain/chairperson being rated
 *   existing: my current feedback for them (from /api/my-captain-ratings) or null
 *   onSaved:  called after the dialog has fully closed following a save/remove
 */
export default function CaptainRatingDialog({
  open,
  setOpen,
  captain,
  existing = null,
  onSaved,
}) {
  const [rating, setRating] = useState(null);
  const [comments, setComments] = useState("");
  const [context, setContext] = useState("");
  const [shareName, setShareName] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [success, setSuccess] = useState(null); // 'submit' | 'remove' | null
  const closeTimeoutRef = useRef(null);
  const pendingRefreshRef = useRef(false);

  // Reset the form each time the dialog opens (or the target changes).
  useEffect(() => {
    if (!open) return;
    setRating(existing?.rating ?? null);
    setComments(existing?.comments ?? "");
    setContext(existing?.context ?? "");
    setShareName(existing?.share_name ?? false);
    setErrorMsg("");
    setSuccess(null);
  }, [open, captain?.id, existing]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const busy = loading || removing || Boolean(success);
  const commentsMissing = comments.trim() === "";

  const handleClose = (e) => {
    if (busy) return;
    setOpen(false);
    setErrorMsg("");
    e?.stopPropagation?.();
  };

  const handleExited = () => {
    if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      onSaved?.();
    }
    setSuccess(null);
    setErrorMsg("");
  };

  const finishSuccess = (action) => {
    setLoading(false);
    setRemoving(false);
    setErrorMsg("");
    setSuccess(action);
    closeTimeoutRef.current = setTimeout(() => {
      pendingRefreshRef.current = true;
      setOpen(false);
    }, 800);
  };

  const submit = async () => {
    if (busy) return;
    if (commentsMissing) {
      setErrorMsg("Please provide some feedback.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/create-captain-rating", {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({
          captain: captain.id,
          rating: rating,
          comments: comments,
          context: context,
          share_name: shareName,
        }),
      });
      if (response.ok) {
        finishSuccess("submit");
      } else {
        setErrorMsg(await readError(response, "Error submitting feedback."));
        setLoading(false);
      }
    } catch (e) {
      setErrorMsg("Error submitting feedback.");
      setLoading(false);
    }
  };

  const remove = async () => {
    if (busy || !existing) return;
    setRemoving(true);
    setErrorMsg("");
    try {
      const response = await fetch(`/api/delete-captain-rating/${existing.id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (response.ok) {
        finishSuccess("remove");
      } else {
        setErrorMsg("Error removing feedback.");
        setRemoving(false);
      }
    } catch (e) {
      setErrorMsg("Error removing feedback.");
      setRemoving(false);
    }
  };

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

        <Typography className="rating-dialog-title">
          {existing ? "Edit Feedback" : "Give Feedback"}
        </Typography>

        <div className="rating-dialog-fields-row">
          <div className="rating-dialog-field">
            <span className="rating-dialog-field-label">
              {captain?.role ?? "Captain"}
            </span>
            <div className="rating-dialog-ratee-value">{captain?.name}</div>
          </div>
        </div>

        <div className="rating-dialog-grades">
          <RatingAndLabel
            label={"Overall (optional)"}
            rating={rating}
            setRating={setRating}
          />
        </div>

        <TextField
          select
          className="rating-dialog-comments"
          label="What is this about? (optional)"
          variant="standard"
          fullWidth
          value={context}
          onChange={(e) => setContext(e.target.value)}
        >
          {CONTEXT_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          className="rating-dialog-comments"
          label="Comments *"
          variant="standard"
          fullWidth
          multiline
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          error={commentsMissing}
          helperText={commentsMissing ? "Written feedback is required." : undefined}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={shareName}
              onChange={(e) => setShareName(e.target.checked)}
            />
          }
          label="Share my name with the chairpeople"
        />

        <div className="rating-dialog-note">
          Your written feedback is required. The star rating is optional. Your
          feedback is anonymous to the chairpeople unless you check the box
          above. Specific details in your comments could still reveal who you
          are.
        </div>
      </DialogContent>

      <DialogActions className="rating-dialog-actions">
        {existing ? (
          <LoadingButton
            color="error"
            loading={removing}
            disabled={busy && !removing}
            onClick={remove}
          >
            {success === "remove" ? "Removed" : "Remove"}
          </LoadingButton>
        ) : null}
        <Button onClick={handleClose} disabled={busy}>
          Cancel
        </Button>
        <LoadingButton
          className={
            success === "submit"
              ? "rating-dialog-action-btn rating-dialog-action-btn--success"
              : "rating-dialog-action-btn"
          }
          loading={loading}
          variant="contained"
          color="primary"
          disabled={busy && !loading}
          startIcon={success === "submit" ? <Check /> : undefined}
          onClick={submit}
        >
          {success === "submit" ? "Saved" : existing ? "Update" : "Submit"}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

/**
 * "Give Feedback" button for a captain's/chairperson's profile page. Same markup
 * and classes as RatingButton in ballkidUi.js so it picks up the profile styles.
 * Props: ballkid  the captain/chairperson whose profile is being viewed.
 */
export function CaptainRatingButton({ ballkid }) {
  const [open, setOpen] = useState(false);
  const [existing, setExisting] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/my-captain-ratings", { headers: getAuthHeader() })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!cancelled) {
          setExisting(data.find((r) => r.captain === ballkid.id) ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ballkid.id, reloadKey]);

  const rated = existing !== null;

  return (
    <div className="ballkid-profile-hero-mobile-actions">
      <div className="ballkid-profile-hero-rating-row">
        <Button
          className={`rating-btn ${
            rated ? "rating-btn--rated" : "rating-btn--unrated"
          }`}
          variant="outlined"
          disableElevation
          size="small"
          endIcon={rated ? <Check /> : undefined}
          onClick={() => setOpen(true)}
        >
          {rated ? "Edit Feedback" : "Give Feedback"}
        </Button>
      </div>
      <CaptainRatingDialog
        open={open}
        setOpen={setOpen}
        captain={{
          id: ballkid.id,
          name: `${ballkid.first_name} ${ballkid.last_name}`,
          role: ballkid.is_chairperson ? "Chairperson" : "Captain",
        }}
        existing={existing}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
