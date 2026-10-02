import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import { getAuthHeader } from "../Utils";

// One-click, pre-vetted reports -- the primary way this page is meant to be
// used. No SQL knowledge required: pick a button, see a table. These run
// through the exact same read-only endpoint as the advanced box below, so
// they carry no extra risk -- they're just saved, known-good queries.
const CANNED_REPORTS = [
  {
    label: "Active Ballkids",
    description: "Everyone currently active and not cut, with the columns you'd usually want.",
    query: `SELECT id, first_name, last_name, preferred_position, num_years_experience,
is_captain, current_team, is_checked_in, last_day
FROM api_ballkid
WHERE is_active = true AND is_cut = false
ORDER BY last_name, first_name`,
  },
  {
    label: "Captains",
    description: "Active captains only.",
    query: `SELECT id, first_name, last_name, preferred_position, current_team
FROM api_ballkid
WHERE is_active = true AND is_cut = false AND is_captain = true
ORDER BY last_name, first_name`,
  },
  {
    label: "Currently Checked In",
    description: "Who's checked in right now.",
    query: `SELECT id, first_name, last_name, current_team, preferred_position
FROM api_ballkid
WHERE is_active = true AND is_cut = false AND is_checked_in = true
ORDER BY current_team, last_name`,
  },
  {
    label: "Count by Position",
    description: "How many active ballkids at each position.",
    query: `SELECT preferred_position, COUNT(*) AS count
FROM api_ballkid
WHERE is_active = true AND is_cut = false
GROUP BY preferred_position
ORDER BY preferred_position`,
  },
];

const DEFAULT_REPORT = CANNED_REPORTS[0];

// Chairperson-only. Read-only: the backend only ever accepts a single
// SELECT statement (see api/views/database_query.py) -- there is no write
// path here, on purpose. Use Django admin (/admin) for anything that needs
// to actually change data.
//
// Built for people who don't know SQL: the canned report buttons are the
// main interface and need no query-writing at all. The free-form SQL box
// is tucked behind an "Advanced" toggle for whoever does want it.
export default function DatabaseQueryPage() {
  const [query, setQuery] = useState("");
  const [activeLabel, setActiveLabel] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  const runQuery = async (queryText, label) => {
    setRunning(true);
    setError("");
    setActiveLabel(label || null);
    setSortColumn(null);
    setSortDirection("asc");
    try {
      const response = await fetch("/api/database-query", {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ query: queryText }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(
          Array.isArray(data.detail)
            ? data.detail.join(" ")
            : data.detail || "Query failed."
        );
        setResult(null);
        return;
      }
      setResult(data);
    } catch (err) {
      setError("Query failed.");
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const handleSort = (colIndex) => {
    if (sortColumn === colIndex) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(colIndex);
      setSortDirection("asc");
    }
  };

  // Sorts client-side over whatever page of rows came back -- fine given
  // the 500-row cap. Numeric-aware: compares as numbers when both values
  // parse as one, otherwise falls back to a plain string comparison. Nulls
  // always sort to the end, regardless of direction.
  const sortedRows = React.useMemo(() => {
    if (!result) return [];
    if (sortColumn === null) return result.rows;

    const rows = result.rows.slice();
    rows.sort((a, b) => {
      const av = a[sortColumn];
      const bv = b[sortColumn];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;

      const an = Number(av);
      const bn = Number(bv);
      const bothNumeric = av !== "" && bv !== "" && !isNaN(an) && !isNaN(bn);
      const cmp = bothNumeric ? an - bn : String(av).localeCompare(String(bv));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [result, sortColumn, sortDirection]);

  // Show something useful the moment the page opens -- no click required.
  useEffect(() => {
    runQuery(DEFAULT_REPORT.query, DEFAULT_REPORT.label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Paper sx={{ p: 3, maxWidth: 1000, mx: "auto", mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Database Reports
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pick a report below. This is read-only and can't change any data.
      </Typography>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        {CANNED_REPORTS.map((report) => (
          <Button
            key={report.label}
            variant={activeLabel === report.label ? "contained" : "outlined"}
            size="small"
            onClick={() => runQuery(report.query, report.label)}
            disabled={running}
          >
            {report.label}
          </Button>
        ))}
      </Box>

      {activeLabel ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {CANNED_REPORTS.find((r) => r.label === activeLabel)?.description}
        </Typography>
      ) : null}

      <Button
        size="small"
        onClick={() => setAdvancedOpen((open) => !open)}
        endIcon={advancedOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ mb: 1 }}
      >
        Advanced: write your own query
      </Button>

      <Collapse in={advancedOpen}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Only SELECT queries are allowed -- this can't write or change data.
          Results are capped at 500 rows. If you're not comfortable writing
          SQL, the buttons above cover the common cases.
        </Alert>
        <TextField
          label="SQL query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          multiline
          minRows={4}
          fullWidth
          placeholder="SELECT * FROM api_ballkid LIMIT 20"
          sx={{ mb: 1, fontFamily: "monospace" }}
        />
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          {CANNED_REPORTS.map((report) => (
            <Chip
              key={report.label}
              label={report.label}
              size="small"
              variant="outlined"
              onClick={() => setQuery(report.query)}
            />
          ))}
        </Box>
        <Button
          variant="contained"
          onClick={() => runQuery(query, null)}
          disabled={running || !query.trim()}
        >
          {running ? "Running…" : "Run Query"}
        </Button>
      </Collapse>

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      {result ? (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {result.row_count} row{result.row_count === 1 ? "" : "s"}
            {result.truncated ? ` (truncated at ${result.row_count})` : ""}
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {result.columns.map((col, idx) => (
                    <TableCell key={col}>
                      <TableSortLabel
                        active={sortColumn === idx}
                        direction={sortColumn === idx ? sortDirection : "asc"}
                        onClick={() => handleSort(idx)}
                      >
                        {col}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRows.map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j}>
                        {cell === null ? <em>null</em> : String(cell)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      ) : null}
    </Paper>
  );
}
