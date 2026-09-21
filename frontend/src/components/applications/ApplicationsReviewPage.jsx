import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  MenuItem,
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

const STATUS_COLORS = {
  pending: "default",
  accepted: "success",
  rejected: "error",
  waitlisted: "warning",
};

export default function ApplicationsReviewPage() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");

  const load = () => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/applications${query}`, { headers: getAuthHeader() })
      .then((res) => res.json())
      .then((data) => setApplications(data));
  };

  useEffect(load, [statusFilter]);

  const updateStatus = async (id, status) => {
    await fetch(`/api/applications/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const promote = async (id) => {
    await fetch(`/api/promote-application/${id}`, {
      method: "POST",
      headers: getAuthHeader(),
    });
    load();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Ballcrew Applications</Typography>
        <TextField
          select
          size="small"
          label="Filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ width: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="accepted">Accepted</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
          <MenuItem value="waitlisted">Waitlisted</MenuItem>
        </TextField>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Veteran?</TableCell>
            <TableCell># Reviews</TableCell>
            <TableCell>Avg Overall</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {applications.map((app) => (
            <TableRow key={app.id}>
              <TableCell>{app.first_name} {app.last_name}</TableCell>
              <TableCell>{app.is_veteran ? "Veteran" : "First-time"}</TableCell>
              <TableCell>{app.review_count}</TableCell>
              <TableCell>{app.average_overall_rating ?? "—"}</TableCell>
              <TableCell>
                <Chip label={app.status} color={STATUS_COLORS[app.status]} size="small" />
              </TableCell>
              <TableCell>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button size="small" onClick={() => updateStatus(app.id, "accepted")}>Accept</Button>
                  <Button size="small" onClick={() => updateStatus(app.id, "waitlisted")}>Waitlist</Button>
                  <Button size="small" color="error" onClick={() => updateStatus(app.id, "rejected")}>Reject</Button>
                  {app.status === "accepted" && !app.promoted_ballkid && (
                    <Button size="small" variant="contained" onClick={() => promote(app.id)}>
                      Promote to Ballkid
                    </Button>
                  )}
                  {app.promoted_ballkid && <Chip label="Promoted" size="small" color="info" />}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
