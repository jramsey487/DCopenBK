import React, { useState } from "react";

import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import TextField from "@mui/material/TextField";
import Rating from "@mui/material/Rating";

import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  Alerts,
  getAuthHeader,
  getToday,
  getLocalStorage,
  useIsMobile,
} from "../Utils";

export function RatingAndLabel({ label, rating, setRating }) {
  const isMobile = useIsMobile();

  return (
    <Grid
      item
      className={isMobile ? "justify" : "sxs"}
      sx={{ mt: 1, mb: 0.5, mx: isMobile ? 1 : 2 }}
    >
      <Typography
        variant="subtitle2"
        sx={{ ml: isMobile ? 3 : 0, mx: isMobile ? 0 : 2 }}
      >
        {label}
      </Typography>
      <Rating
        precision={0.5}
        value={rating}
        onChange={(e, newVal) => setRating(newVal)}
        sx={{ mr: isMobile ? 3 : 0 }}
      />
    </Grid>
  );
}

export default function RatingDialog({ open, setOpen, ballkid, setUpdated }) {
  const raterId = getLocalStorage("ballkid_id");
  const isMobile = useIsMobile();

  const [date, setDate] = useState(getToday());
  const [rating, setRating] = useState(null);
  const [comments, setComments] = useState("");
  const [athleticismRating, setAthleticismRating] = useState(null);
  const [rollingRating, setRollingRating] = useState(null);
  const [awarenessRating, setAwarenessRating] = useState(null);
  const [decisionRating, setDecisionRating] = useState(null);
  const [effortRating, setEffortRating] = useState(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleClose = () => {
    setOpen(false);
    setErrorMsg("");
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent>
        <Grid
          container
          alignItems="center"
          direction="column"
          justifyContent="center"
        >
          <Grid item xs={12}>
            <Alerts
              successMsg={successMsg}
              errorMsg={errorMsg}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography component="h4" variant="h4" sx={{ my: 1 }}>
              Give Rating
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              sx={{ minWidth: 250, my: 0.5, mx: 1 }}
              variant="standard"
              label="Ratee"
              value={ballkid.first_name + " " + ballkid.last_name}
              required
              disabled
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterLuxon}>
              <DatePicker
                renderInput={(props) => (
                  <TextField
                    sx={{ my: 0.5, mx: 1 }}
                    required={true}
                    variant="standard"
                    {...props}
                  />
                )}
                label="Date"
                value={date}
                mask={"__/__/____"}
                onChange={(newVal) => {
                  setDate(newVal.toLocaleString());
                }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid container>
            <Grid item xs={12} sm={5.5}>
              <RatingAndLabel
                label={"Overall*"}
                rating={rating}
                setRating={setRating}
              />
            </Grid>
            <Grid item xs={12} sm={6.5}>
              <RatingAndLabel
                label={"Athleticism"}
                rating={athleticismRating}
                setRating={setAthleticismRating}
              />
            </Grid>
            <Grid item xs={12} sm={5.5}>
              <RatingAndLabel
                label={"Rolling"}
                rating={rollingRating}
                setRating={setRollingRating}
              />
            </Grid>
            <Grid item xs={12} sm={6.5}>
              <RatingAndLabel
                label={"Awareness"}
                rating={awarenessRating}
                setRating={setAwarenessRating}
              />
            </Grid>
            <Grid item xs={12} sm={5.5}>
              <RatingAndLabel
                label={"Effort"}
                rating={effortRating}
                setRating={setEffortRating}
              />
            </Grid>
            <Grid item xs={12} sm={6.5}>
              <RatingAndLabel
                label={"Decision-making"}
                rating={decisionRating}
                setRating={setDecisionRating}
              />
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Comments"
              variant="standard"
              sx={{ width: isMobile ? 250 : 400 }}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              multiline
            />
          </Grid>

          <Grid item xs={12} sx={{ mt: 3 }}>
            <Typography variant="body1">
              Note: Ratings are required to be between 0.5 and 5 stars. Zero
              star ratings are considered empty. Overall rating is required. All
              other rating categories are optional.
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={(e) => {
            fetch("/api/create-rating", {
              method: "POST",
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
                }, 1000);
              } else {
                setErrorMsg("Error submitting rating.");
              }
            });
          }}
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
