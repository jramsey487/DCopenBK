import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { getAuthHeader } from "../Utils";

function SizeTable({ title, rows }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <Box sx={{ flex: 1, minWidth: 200 }}>
      <Typography variant="subtitle1" gutterBottom>
        {title} ({total})
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Size</TableCell>
            <TableCell align="right">Count</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.size}>
              <TableCell>{r.size}</TableCell>
              <TableCell align="right">{r.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function buildEmailText(report) {
  const section = (label, rows) =>
    `${label}:\n` + rows.map((r) => `  ${r.size}: ${r.count}`).join("\n");

  return [
    `Ballcrew Sizing Report -- ${report.year} (${report.total} ballkids)`,
    "",
    section("T-Shirt", report.tshirt),
    "",
    section("Shorts", report.shorts),
    "",
    section("Shoe", report.shoe),
  ].join("\n");
}

// Chairperson-only. Sourced from this season's promoted applications,
// de-duplicated by ballkid (see api/views/sizing_report.py) so a veteran
// who's applied multiple years doesn't get counted more than once.
export default function SizingReportPage() {
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/sizing-report", { headers: getAuthHeader() })
      .then((res) => res.json())
      .then(setReport);
  }, []);

  const copyForEmail = () => {
    if (!report) return;
    navigator.clipboard.writeText(buildEmailText(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!report) {
    return null;
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 900, mx: "auto", mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6">
          Sizing Report -- {report.year} ({report.total} ballkids)
        </Typography>
        <Button variant="contained" onClick={copyForEmail}>
          {copied ? "Copied!" : "Copy for Email"}
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <SizeTable title="T-Shirt" rows={report.tshirt} />
        <SizeTable title="Shorts" rows={report.shorts} />
        <SizeTable title="Shoe" rows={report.shoe} />
      </Box>
    </Paper>
  );
}
