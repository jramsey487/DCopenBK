import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  MenuItem,
  Paper,
  Rating,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { getAuthHeader } from "../Utils";

const RATING_CATEGORIES = [
  ["athleticism_rating", "Athleticism"],
  ["rolling_rating", "Rolling / Retrieval"],
  ["awareness_rating", "Court Awareness"],
  ["decision_rating", "Decision-Making"],
  ["effort_rating", "Effort"],
  ["overall_rating", "Overall"],
];

const emptyReview = {
  application: null,
  tryout_date: new Date().toISOString().slice(0, 10),
  athleticism_rating: 0,
  rolling_rating: 0,
  awareness_rating: 0,
  decision_rating: 0,
  effort_rating: 0,
  overall_rating: 0,
  observed_position: "",
  notes: "",
  recommendation: "",
};

// Designed for phone-in-hand use at a tryout station: large tap targets,
// one applicant at a time, minimal typing.
export default function TryoutReviewPage() {
  const [applicants, setApplicants] = useState([]);
  const [selected, setSelected] = useState(null);
  const [review, setReview] = useState(emptyReview);
  const [toast, setToast] = useState("");

  useEffect(() => {
    // Pending applicants only -- already-decided ones don't need more scoring.
    fetch("/api/applications?status=pending", { headers: getAuthHeader() })
      .then((res) => res.json())
      .then((data) => setApplicants(data));
  }, []);

  const setField = (field) => (e) =>
    setReview((r) => ({ ...r, [field]: e.target.value }));

  const setRatingField = (field) => (_, value) =>
    setReview((r) => ({ ...r, [field]: value || 0 }));

  const handleSubmit = async () => {
    if (!selected) return;
    try {
      const response = await fetch("/api/tryout-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ ...review, application: selected.id }),
      });
      if (!response.ok) {
        setToast("Submission failed — check required fields.");
        return;
      }
      setToast(`Review submitted for ${selected.first_name} ${selected.last_name}`);
      setSelected(null);
      setReview(emptyReview);
    } catch (err) {
      setToast("Submission failed — check required fields.");
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 500, mx: "auto", mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Tryout Review
      </Typography>

      <Autocomplete
        options={applicants}
        getOptionLabel={(a) => `${a.first_name} ${a.last_name}`}
        value={selected}
        onChange={(_, value) => setSelected(value)}
        renderInput={(params) => (
          <TextField {...params} label="Select Applicant" sx={{ mb: 2 }} />
        )}
      />

      {selected && (
        <Stack spacing={2}>
          <TextField
            label="Tryout Date"
            type="date"
            value={review.tryout_date}
            onChange={setField("tryout_date")}
            InputLabelProps={{ shrink: true }}
          />

          {RATING_CATEGORIES.map(([field, label]) => (
            <Box key={field} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography>{label}</Typography>
              <Rating
                value={review[field]}
                max={10}
                onChange={setRatingField(field)}
              />
            </Box>
          ))}

          <TextField select label="Observed Position" value={review.observed_position} onChange={setField("observed_position")}>
            <MenuItem value="Net">Net</MenuItem>
            <MenuItem value="Back">Back</MenuItem>
            <MenuItem value="Net/Back">Switch (Prefer Net)</MenuItem>
            <MenuItem value="Back/Net">Switch (Prefer Back)</MenuItem>
          </TextField>

          <TextField
            label="Notes"
            value={review.notes}
            onChange={setField("notes")}
            multiline
            rows={3}
          />

          <TextField select label="Recommendation" value={review.recommendation} onChange={setField("recommendation")} required>
            <MenuItem value="strong_yes">Strong Yes</MenuItem>
            <MenuItem value="yes">Yes</MenuItem>
            <MenuItem value="no">No</MenuItem>
            <MenuItem value="strong_no">Strong No</MenuItem>
          </TextField>

          <Button variant="contained" size="large" onClick={handleSubmit}>
            Submit Review
          </Button>
        </Stack>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast("")}
        message={toast}
      />
    </Paper>
  );
}
