import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { getAuthHeader } from "../Utils";

const COUNT = 5;

// Chairperson-only. Serves fun facts (from this season's applications) for
// ballcrew who are checked in: last-day people first, then the facts Claude
// rated most interesting. Facts Claude flagged as unsuitable to read aloud
// are held back (see "Held back" below). "Mark as used" stores the fact
// server-side so it never comes back this season; "Reroll" just shows the
// next 5 without marking anything.
export default function TriviaPage() {
  const [options, setOptions] = useState([]);
  const [seen, setSeen] = useState([]); // ids shown this visit (for reroll)
  const [remaining, setRemaining] = useState(0);
  const [used, setUsed] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [unreviewed, setUnreviewed] = useState(0);
  const [showUsed, setShowUsed] = useState(false);
  const [showFlagged, setShowFlagged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState("");

  const fetchTrivia = useCallback(async (exclude, count) => {
    const response = await fetch(
      `/api/trivia?exclude=${exclude.join(",")}&count=${count}`,
      { headers: getAuthHeader() }
    );
    if (!response.ok) {
      throw new Error("Could not load trivia.");
    }
    return response.json();
  }, []);

  // Replaces the whole set of options. exclude=[] starts over.
  const load = useCallback(
    (exclude) => {
      setLoading(true);
      setError("");
      return fetchTrivia(exclude, COUNT)
        .then((data) => {
          setOptions(data.options);
          setRemaining(data.remaining);
          setUsed(data.used);
          setFlagged(data.flagged);
          setUnreviewed(data.unreviewed);
          setSeen([...exclude, ...data.options.map((o) => o.id)]);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    },
    [fetchTrivia]
  );

  useEffect(() => {
    load([]);
  }, [load]);

  // Asks the server to score unreviewed facts. Each call handles a small
  // batch, so keep calling until nothing is pending (or a call makes no
  // progress).
  const reviewNewFacts = async () => {
    setScoring(true);
    setError("");
    try {
      let pending = 1;
      let rounds = 0;
      while (pending > 0 && rounds < 20) {
        const response = await fetch("/api/trivia", {
          method: "POST",
          headers: getAuthHeader(),
          body: JSON.stringify({}),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.detail || "Could not review the new facts.");
        }
        pending = data.pending;
        rounds += 1;
        if (data.scored === 0) {
          break;
        }
      }
      if (pending > 0) {
        setError(
          `${pending} fact(s) couldn't be reviewed this time. Try again in a moment.`
        );
      }
      await load([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setScoring(false);
    }
  };

  const copyFact = (option) => {
    navigator.clipboard.writeText(option.fun_fact);
    setCopiedId(option.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const markUsed = async (option) => {
    setBusyId(option.id);
    setError("");
    try {
      const response = await fetch("/api/trivia-used", {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ ballkid_id: option.id }),
      });
      if (!response.ok) {
        throw new Error("Could not mark this fact as used.");
      }
      const data = await response.json();
      setUsed(data.used);

      // Drop the card, then top the list back up with one replacement.
      const kept = options.filter((o) => o.id !== option.id);
      setOptions(kept);
      const replacement = await fetchTrivia(seen, 1);
      setOptions([...kept, ...replacement.options]);
      setRemaining(replacement.remaining);
      setFlagged(replacement.flagged);
      setSeen([...seen, ...replacement.options.map((o) => o.id)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const undoUsed = async (item) => {
    setBusyId(item.id);
    setError("");
    try {
      const response = await fetch("/api/trivia-used", {
        method: "DELETE",
        headers: getAuthHeader(),
        body: JSON.stringify({ ballkid_id: item.id }),
      });
      if (!response.ok) {
        throw new Error("Could not undo.");
      }
      const data = await response.json();
      setUsed(data.used);
      // Let it be served again on the next reroll.
      setSeen((prev) => prev.filter((id) => id !== item.id));
      setRemaining((r) => r + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 700, mx: "auto", mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Morning Trivia
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Fun facts from checked-in ballcrew. People on their last day show up
        first, then the most interesting facts. Mark a fact as used once
        you've announced it and it won't come back this season.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      ) : null}

      {unreviewed > 0 ? (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              disabled={scoring}
              onClick={reviewNewFacts}
            >
              {scoring ? "Reviewing…" : "Review now"}
            </Button>
          }
        >
          {unreviewed} fact{unreviewed === 1 ? " hasn't" : "s haven't"} been
          reviewed yet. Reviewing rates how interesting each one is and holds
          back anything that shouldn't be read aloud.
        </Alert>
      ) : null}

      <Stack spacing={1.5}>
        {options.map((option) => (
          <Paper key={option.id} variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ mb: 0.5 }}>{option.fun_fact}</Typography>
            {option.reason ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                {option.reason}
              </Typography>
            ) : null}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
                mt: option.reason ? 0 : 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {option.name}
              </Typography>
              {option.is_last_day ? (
                <Chip size="small" color="warning" label="Last day" />
              ) : null}
              {option.reviewed ? (
                <Chip
                  size="small"
                  variant="outlined"
                  color={option.interest_score >= 7 ? "success" : "default"}
                  label={`Interest ${option.interest_score}/10`}
                />
              ) : (
                <Chip size="small" variant="outlined" label="Not reviewed" />
              )}
              <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
                <Button size="small" onClick={() => copyFact(option)}>
                  {copiedId === option.id ? "Copied" : "Copy"}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busyId === option.id}
                  onClick={() => markUsed(option)}
                >
                  Mark as used
                </Button>
              </Box>
            </Box>
          </Paper>
        ))}

        {!loading && options.length === 0 ? (
          <Typography color="text.secondary">
            No trivia left for the ballcrew who are checked in. Check in more
            people, undo a used fact below, or start over to see ones you
            skipped.
          </Typography>
        ) : null}
        {loading ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : null}
      </Stack>

      <Box sx={{ display: "flex", gap: 1, mt: 3, alignItems: "center" }}>
        <Button
          variant="contained"
          disabled={loading || remaining === 0}
          onClick={() => load(seen)}
        >
          Reroll
        </Button>
        <Button disabled={loading} onClick={() => load([])}>
          Start over
        </Button>
        <Typography variant="caption" color="text.secondary">
          {remaining} more available
        </Typography>
      </Box>

      {flagged.length > 0 ? (
        <Box sx={{ mt: 4 }}>
          <Button size="small" onClick={() => setShowFlagged((open) => !open)}>
            {showFlagged ? "Hide" : "Show"} held back ({flagged.length})
          </Button>
          <Collapse in={showFlagged}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              Flagged as possibly unsuitable to read aloud, so they're never
              offered above. Shown here only so you can double-check.
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {flagged.map((item) => (
                <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    {item.fun_fact}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.name}
                    {item.reason ? ` · ${item.reason}` : ""}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Collapse>
        </Box>
      ) : null}

      <Box sx={{ mt: 2 }}>
        <Button size="small" onClick={() => setShowUsed((open) => !open)}>
          {showUsed ? "Hide" : "Show"} used this season ({used.length})
        </Button>
        <Collapse in={showUsed}>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {used.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nothing marked as used yet.
              </Typography>
            ) : null}
            {used.map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {item.fun_fact}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {item.name} &middot; {item.used_on}
                  </Typography>
                  <Button
                    size="small"
                    sx={{ ml: "auto" }}
                    disabled={busyId === item.id}
                    onClick={() => undoUsed(item)}
                  >
                    Undo
                  </Button>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Collapse>
      </Box>
    </Paper>
  );
}
