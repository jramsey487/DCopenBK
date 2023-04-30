import React, { useState } from "react";
import {
  Button,
  Grid,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  Rating,
} from "@mui/material";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { Alerts, getAuthHeader, getToday, getSessionStorage } from "../Utils";

export function RatingAndLabel({ label, rating, setRating }) {
  return (
    <Grid
      item
      className="sxs"
      sx={{ mt: 1, mb: 0.5, mx: 3 }}
      style={{ maxWidth: "350px" }}
    >
      <Typography variant="subtitle2" sx={{ mx: 1 }}>
        {label}
      </Typography>
      <Rating
        precision={0.5}
        value={rating}
        onChange={(e, newVal) => setRating(newVal)}
      />
    </Grid>
  );
}

export default function RatingDialog({ open, setOpen, ballkid, setUpdated }) {
  const raterId = getSessionStorage("ballkid_id");

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
          spacing={2}
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
            <Typography component="h4" variant="h4">
              Give Rating
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <div className="sxs">
              <TextField
                sx={{ width: 250 }}
                variant="standard"
                label="Ratee"
                value={ballkid.first_name + " " + ballkid.last_name}
                required
                disabled
              />
              <LocalizationProvider dateAdapter={AdapterLuxon}>
                <DatePicker
                  renderInput={(props) => (
                    <TextField
                      sx={{ mx: 2 }}
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
            </div>
          </Grid>

          <div className="justify">
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
          </div>
          <div className="justify">
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
          </div>
          <div className="justify">
            <RatingAndLabel
              label={"Decision-making"}
              rating={decisionRating}
              setRating={setDecisionRating}
            />
            <RatingAndLabel
              label={"Effort"}
              rating={effortRating}
              setRating={setEffortRating}
            />
          </div>

          <Grid item xs={12}>
            <TextField
              label="Comments"
              variant="standard"
              sx={{ width: 400 }}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              multiline
            />
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
