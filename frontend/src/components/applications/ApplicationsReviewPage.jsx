import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { ConfirmDialog, getAuthHeader } from "../Utils";

const STATUS_COLORS = {
  pending: "default",
  accepted: "success",
  rejected: "error",
  waitlisted: "warning",
};

export default function ApplicationsReviewPage() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [applicationsOpen, setApplicationsOpen] = useState(null);
  const [settingsError, setSettingsError] = useState(false);

  const load = () => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/applications${query}`, { headers: getAuthHeader() })
      .then((res) => res.json())
      .then((data) => setApplications(data));
  };

  useEffect(load, [statusFilter]);

  const loadApplicationSettings = () => {
    setSettingsError(false);
    fetch("/api/application-settings", { headers: getAuthHeader() })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setApplicationsOpen(Boolean(data.is_open)))
      .catch(() => setSettingsError(true));
  };

  useEffect(loadApplicationSettings, []);

  const toggleApplicationsOpen = async () => {
    const next = !applicationsOpen;
    setApplicationsOpen(next); // optimistic
    const response = await fetch("/api/application-settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ is_open: next }),
    });
    if (!response.ok) {
      setApplicationsOpen(!next); // revert on failure
    }
  };

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

  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const [purgePreview, setPurgePreview] = useState(null);
  const [purgeResult, setPurgeResult] = useState("");

  const openPurgeDialog = async () => {
    const res = await fetch("/api/purge-unpromoted-applications", {
      headers: getAuthHeader(),
    });
    const data = await res.json();
    setPurgePreview(data);
    setPurgeDialogOpen(true);
  };

  const purgeMessage = purgePreview && (
    purgePreview.count > 0 ? (
      <>
        This will permanently delete <strong>{purgePreview.count}</strong>{" "}
        application(s) that were never promoted to a ballkid, along with
        their uploaded headshots. This cannot be undone.
        <Box component="ul" sx={{ mt: 1 }}>
          {Object.entries(purgePreview.by_status)
            .filter(([, n]) => n > 0)
            .map(([status, n]) => (
              <li key={status}>{status}: {n}</li>
            ))}
        </Box>
      </>
    ) : (
      "There are no unpromoted applications to delete right now."
    )
  );

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

      <ConfirmDialog
        open={purgeDialogOpen}
        setOpen={setPurgeDialogOpen}
        message={purgeMessage}
        url="/api/purge-unpromoted-applications"
        method="POST"
        body={{}}
        setUpdated={(didUpdate) => {
          if (didUpdate && purgePreview) {
            setPurgeResult(`Deleted ${purgePreview.count} unpromoted application(s).`);
            load();
          }
        }}
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(applicationsOpen)}
              disabled={applicationsOpen === null || settingsError}
              onChange={toggleApplicationsOpen}
              color="success"
            />
          }
          label={
            settingsError
              ? "Couldn't load application status"
              : applicationsOpen === null
              ? "Loading application status…"
              : applicationsOpen
              ? "Applications are OPEN — the public form is accepting submissions"
              : "Applications are CLOSED — /apply shows a closed message"
          }
        />
        {settingsError ? (
          <Button size="small" onClick={loadApplicationSettings}>
            Retry
          </Button>
        ) : null}
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Veteran?</TableCell>
            <TableCell>Traveling With</TableCell>
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
              <TableCell>{app.traveling_with_names || "—"}</TableCell>
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

      <Divider sx={{ mt: 4, mb: 2 }} />

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          End-of-season cleanup
        </Typography>
        <Button color="error" variant="outlined" onClick={openPurgeDialog}>
          Purge Unpromoted Applications
        </Button>
        {purgeResult ? (
          <Typography variant="body2" color="text.secondary">
            {purgeResult}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
}
