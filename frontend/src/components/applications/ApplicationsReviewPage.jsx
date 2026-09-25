import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
      headers: getAuthHeader(),
      body: JSON.stringify({ is_open: next }),
    });
    if (!response.ok) {
      setApplicationsOpen(!next); // revert on failure
    }
  };

  const updateStatus = async (id, status) => {
    await fetch(`/api/applications/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeader(),
      body: JSON.stringify({ status }),
    });
    load();
  };

  const promote = async (id, ballkidId) => {
    await fetch(`/api/promote-application/${id}`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify(ballkidId ? { ballkid_id: ballkidId } : {}),
    });
    load();
  };

  // --- Promotion matching (veterans: match to their existing record
  // rather than creating a duplicate every season) ---
  const [promoteDialogApp, setPromoteDialogApp] = useState(null);
  const [promoteDialogBallkid, setPromoteDialogBallkid] = useState(null);
  const [promoteAsNew, setPromoteAsNew] = useState(false);
  const [promoteError, setPromoteError] = useState("");

  const openPromoteDialog = (app) => {
    if (!app.is_veteran) {
      // First-timers have no existing record to match -- promote directly.
      promote(app.id);
      return;
    }
    setPromoteError("");
    setPromoteAsNew(false);
    // Convenience default only -- covers the common case (name unchanged).
    // The chairperson can search for anyone, by any name, which is what
    // actually handles a legal name change (e.g. after marriage): search
    // for them under whatever name they're currently listed as, regardless
    // of what name this year's application used.
    const exactMatch = ballkids.find(
      (b) =>
        b.first_name.toLowerCase() === app.first_name.toLowerCase() &&
        b.last_name.toLowerCase() === app.last_name.toLowerCase()
    );
    setPromoteDialogBallkid(exactMatch || null);
    setPromoteDialogApp(app);
  };

  const confirmPromote = async () => {
    if (!promoteDialogApp) return;
    if (!promoteAsNew && !promoteDialogBallkid) {
      setPromoteError("Select their existing record, or choose \"not currently in our system\" below.");
      return;
    }
    setPromoteError("");
    const response = await fetch(
      `/api/promote-application/${promoteDialogApp.id}`,
      {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify(
          promoteAsNew ? {} : { ballkid_id: promoteDialogBallkid.id }
        ),
      }
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setPromoteError(data.ballkid_id?.[0] || data.detail || "Could not promote.");
      return;
    }
    setPromoteDialogApp(null);
    setPromoteDialogBallkid(null);
    load();
  };

  // --- Headshot update matching (veterans updating their photo) ---
  const [ballkids, setBallkids] = useState([]);
  const [headshotDialogApp, setHeadshotDialogApp] = useState(null);
  const [headshotDialogBallkid, setHeadshotDialogBallkid] = useState(null);
  const [headshotError, setHeadshotError] = useState("");

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((res) => res.json())
      .then((data) => setBallkids(Array.isArray(data) ? data : []));
  }, []);

  const openHeadshotDialog = (app) => {
    setHeadshotError("");
    // Convenience default only -- chairperson still confirms or changes
    // this before anything is applied. Never applied automatically.
    const exactMatch = ballkids.find(
      (b) =>
        b.first_name.toLowerCase() === app.first_name.toLowerCase() &&
        b.last_name.toLowerCase() === app.last_name.toLowerCase()
    );
    setHeadshotDialogBallkid(exactMatch || null);
    setHeadshotDialogApp(app);
  };

  const applyHeadshotUpdate = async () => {
    if (!headshotDialogApp || !headshotDialogBallkid) return;
    setHeadshotError("");
    const response = await fetch(
      `/api/applications/${headshotDialogApp.id}/apply-headshot-update`,
      {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ ballkid_id: headshotDialogBallkid.id }),
      }
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setHeadshotError(
        data.ballkid_id?.[0] || data.detail || "Could not apply headshot update."
      );
      return;
    }
    setHeadshotDialogApp(null);
    setHeadshotDialogBallkid(null);
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
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button size="small" onClick={() => updateStatus(app.id, "accepted")}>Accept</Button>
                  <Button size="small" onClick={() => updateStatus(app.id, "waitlisted")}>Waitlist</Button>
                  <Button size="small" color="error" onClick={() => updateStatus(app.id, "rejected")}>Reject</Button>
                  {app.status === "accepted" && !app.promoted_ballkid && (
                    <Button size="small" variant="contained" onClick={() => openPromoteDialog(app)}>
                      Promote to Ballkid
                    </Button>
                  )}
                  {app.promoted_ballkid && <Chip label="Promoted" size="small" color="info" />}
                  {app.headshot_update ? (
                    <Button size="small" onClick={() => openHeadshotDialog(app)}>
                      Apply Headshot Update
                    </Button>
                  ) : null}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Apply a veteran's updated headshot onto their existing Ballkid */}
      <Dialog open={Boolean(headshotDialogApp)} onClose={() => setHeadshotDialogApp(null)}>
        <DialogTitle>Apply Updated Headshot</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {headshotDialogApp
              ? `Select which existing ballkid record ${headshotDialogApp.first_name} ${headshotDialogApp.last_name}'s updated headshot belongs to. This is never guessed automatically -- confirm the right person.`
              : ""}
          </DialogContentText>
          {headshotDialogApp?.headshot_update ? (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <Avatar
                src={headshotDialogApp.headshot_update}
                sx={{ width: 96, height: 96 }}
                variant="rounded"
              />
            </Box>
          ) : null}
          <Autocomplete
            options={ballkids}
            getOptionLabel={(b) => `${b.first_name} ${b.last_name}`}
            value={headshotDialogBallkid}
            onChange={(_, value) => setHeadshotDialogBallkid(value)}
            renderInput={(params) => (
              <TextField {...params} label="Matching ballkid" autoFocus />
            )}
          />
          {headshotError ? (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {headshotError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHeadshotDialogApp(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!headshotDialogBallkid}
            onClick={applyHeadshotUpdate}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      {/* Promote a veteran: match to their existing record, or confirm
          they're genuinely not in the system yet */}
      <Dialog open={Boolean(promoteDialogApp)} onClose={() => setPromoteDialogApp(null)}>
        <DialogTitle>Promote Returning Veteran</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {promoteDialogApp
              ? `Match ${promoteDialogApp.first_name} ${promoteDialogApp.last_name} to their existing ballkid record. Search by whatever name they're currently listed under -- this also covers a legal name change, since matching isn't based on this year's application name.`
              : ""}
          </DialogContentText>
          <Autocomplete
            options={ballkids}
            getOptionLabel={(b) => `${b.first_name} ${b.last_name}`}
            value={promoteDialogBallkid}
            disabled={promoteAsNew}
            onChange={(_, value) => setPromoteDialogBallkid(value)}
            renderInput={(params) => (
              <TextField {...params} label="Matching ballkid" autoFocus />
            )}
          />
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Switch
                checked={promoteAsNew}
                onChange={(e) => setPromoteAsNew(e.target.checked)}
              />
            }
            label="Not currently in our system — create a new record"
          />
          {promoteError ? (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {promoteError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromoteDialogApp(null)}>Cancel</Button>
          <Button variant="contained" onClick={confirmPromote}>
            Confirm & Promote
          </Button>
        </DialogActions>
      </Dialog>

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
