import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { getAuthHeader } from "../Utils";

export default function ApplicationLaunchPage() {
  const [year, setYear] = useState(String(new Date().getFullYear() - 1));
  const [roster, setRoster] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/applications/veterancy-roster?year=${encodeURIComponent(year)}`,
        { headers: getAuthHeader() }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.year || "Unable to load the prior-season roster.");
      }
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

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Application Launch
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Start with the people who actually checked in during the previous
        tournament. Their annual participation is now tracked separately from
        the one-time historical experience baseline.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        This page currently loads the verified prior-season roster and
        veterancy totals. Invitation/tryout decisions, message previews, and
        sending are not wired up yet; nothing is emailed from this page.
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

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Ballkid</TableCell>
            <TableCell align="right">Veterancy</TableCell>
            <TableCell align="right">Historical baseline</TableCell>
            <TableCell align="right">Verified seasons</TableCell>
            <TableCell>Last check-in</TableCell>
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
            </TableRow>
          ))}
          {!loading && roster.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
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
