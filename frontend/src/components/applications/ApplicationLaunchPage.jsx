import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { getAuthHeader } from "../Utils";

const DECISION_LABELS = {
  undecided: "Undecided",
  invite_back: "Invite back",
  must_try_out: "Must try out",
};

export default function ApplicationLaunchPage() {
  const [year, setYear] = useState("");
  const [roster, setRoster] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const rosterUrl = year
        ? `/api/applications/veterancy-roster?year=${encodeURIComponent(year)}`
        : "/api/applications/veterancy-roster";
      const response = await fetch(rosterUrl, { headers: getAuthHeader() });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.year || "Unable to load the prior-season roster.");
      }
      setYear((current) => current || String(data.year));
      setRoster(Array.isArray(data.results) ? data.results : []);
      setCount(Number(data.count) || 0);
    } catch (err) {
      setError(err.message || "Unable to load the prior-season roster.");
      setRoster([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const saveDecision = async (ballkidId, nextDecision) => {
    const previousDecision =
      roster.find((person) => person.ballkid_id === ballkidId)?.decision ||
      "undecided";
    setError("");
    setNotice("");
    setRoster((current) =>
      current.map((person) =>
        person.ballkid_id === ballkidId
          ? { ...person, decision: nextDecision }
          : person
      )
    );
    setSavingIds((current) => ({ ...current, [ballkidId]: true }));

    try {
      const response = await fetch(
        `/api/applications/veterancy-roster/${ballkidId}/decision`,
        {
          method: "PATCH",
          headers: {
            ...getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ year: Number(year), decision: nextDecision }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.decision || data.detail || "Unable to save decision.");
      }
      setNotice(`Saved ${DECISION_LABELS[nextDecision]} for ${data.year}.`);
    } catch (err) {
      setRoster((current) =>
        current.map((person) =>
          person.ballkid_id === ballkidId
            ? { ...person, decision: previousDecision }
            : person
        )
      );
      setError(err.message || "Unable to save decision.");
    } finally {
      setSavingIds((current) => ({ ...current, [ballkidId]: false }));
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Application Launch
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Start with the people who actually checked in during the previous
        tournament. Their annual participation is tracked separately from the
        one-time historical experience baseline.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        This page records invite-back and tryout decisions only. Email previews,
        sending, and opening applications are not wired up yet; nothing is
        emailed from this page.
      </Alert>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <TextField
          label="Tournament year"
          type="number"
          size="small"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          inputProps={{ min: 1900, max: new Date().getFullYear() }}
        />
        <Button variant="contained" onClick={loadRoster} disabled={loading || !year}>
          {loading ? "Loading…" : "Refresh roster"}
        </Button>
        <Typography color="text.secondary" variant="body2">
          {count} checked-in {count === 1 ? "person" : "people"} in {year || "—"}
        </Typography>
      </Box>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Ballkid</TableCell>
            <TableCell align="right">Veterancy</TableCell>
            <TableCell align="right">Historical baseline</TableCell>
            <TableCell align="right">Verified seasons</TableCell>
            <TableCell>Last check-in</TableCell>
            <TableCell>Launch decision</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {roster.map((person) => (
            <TableRow key={person.ballkid_id}>
              <TableCell>
                <Typography fontWeight={600}>{person.full_name}</Typography>
                {person.email ? (
                  <Typography variant="body2" color="text.secondary">
                    {person.email}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell align="right">{person.veterancy_years}</TableCell>
              <TableCell align="right">
                {person.historical_veterancy_years}
              </TableCell>
              <TableCell align="right">
                {person.verified_veterancy_years}
              </TableCell>
              <TableCell>
                {person.last_checkin
                  ? new Date(person.last_checkin).toLocaleDateString()
                  : "—"}
              </TableCell>
              <TableCell sx={{ minWidth: 190 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel id={`launch-decision-label-${person.ballkid_id}`}>
                    Decision
                  </InputLabel>
                  <Select
                    labelId={`launch-decision-label-${person.ballkid_id}`}
                    label="Decision"
                    value={person.decision || "undecided"}
                    disabled={Boolean(savingIds[person.ballkid_id])}
                    onChange={(event) =>
                      saveDecision(person.ballkid_id, event.target.value)
                    }
                  >
                    <MenuItem value="undecided">Undecided</MenuItem>
                    <MenuItem value="invite_back">Invite back</MenuItem>
                    <MenuItem value="must_try_out">Must try out</MenuItem>
                  </Select>
                </FormControl>
              </TableCell>
            </TableRow>
          ))}
          {!loading && roster.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  No recorded check-ins found for this year.
                </Typography>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Paper>
  );
}
