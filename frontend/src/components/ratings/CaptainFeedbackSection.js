import React, { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";

import { getAuthHeader } from "../authStorage";
import { contextLabel } from "./CaptainRatingDialog";

// Must match api.utils.utils.get_current_year (assumed to be the calendar year).
const currentYear = () => new Date().getFullYear();

/** "4" / "4.5", or "" when there is no numeric star rating. */
function formatRating(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "";
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Chairperson-only. Shows crew feedback for one captain/chairperson.
 * The API only returns a rater's name when they opted in to sharing it.
 */
export default function CaptainFeedbackSection({ captainId }) {
  const [state, setState] = useState("loading"); // loading | ready | error
  const [ratings, setRatings] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    const year = currentYear();

    Promise.all([
      fetch(`/api/captain-ratings/${year}`, { headers: getAuthHeader() }),
      fetch(`/api/captain-ratings-summary/${year}`, { headers: getAuthHeader() }),
    ])
      .then(async ([listRes, summaryRes]) => {
        if (!listRes.ok || !summaryRes.ok) throw new Error("failed");
        return [await listRes.json(), await summaryRes.json()];
      })
      .then(([list, summaries]) => {
        if (cancelled) return;
        setRatings(list.filter((r) => r.captain === captainId));
        setSummary(summaries.find((s) => s.captain === captainId) ?? null);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [captainId]);

  if (state === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (state === "error") {
    return (
      <Typography variant="body2" color="error">
        Could not load crew feedback.
      </Typography>
    );
  }

  const count = summary?.count ?? 0;
  const starCount = summary?.star_count ?? 0;

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1, alignItems: "baseline", mb: 1.5 }}>
        <Typography variant="h6" fontWeight="700">
          {summary?.average != null ? formatRating(summary.average) : "—"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {count} {count === 1 ? "piece" : "pieces"} of feedback this year
          {summary && summary.average == null && starCount > 0
            ? ` (average shown once there are 3 or more star ratings; ${starCount} so far)`
            : ""}
        </Typography>
      </Box>

      {ratings.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No crew feedback yet.
        </Typography>
      ) : (
        ratings.map((r) => {
          const stars = formatRating(r.rating);
          return (
            <Box
              key={r.id}
              sx={{
                py: 1.25,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: 0.75,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {stars ? (
                  <Typography fontWeight="700">{stars}</Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No star rating
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  {formatDate(r.date)}
                </Typography>
                {contextLabel(r.context) ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={contextLabel(r.context)}
                  />
                ) : null}
                <Typography variant="body2" color="text.secondary">
                  {r.rater_name ? `· ${r.rater_name}` : "· Anonymous"}
                </Typography>
              </Box>
              {r.comments ? (
                <Typography
                  variant="body2"
                  sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                >
                  {r.comments}
                </Typography>
              ) : null}
            </Box>
          );
        })
      )}
    </Box>
  );
}