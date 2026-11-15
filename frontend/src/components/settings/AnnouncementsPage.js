import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import { ConfirmDialog, getAuthHeader } from "../Utils";

const MAX_TITLE = 60;
const MAX_MESSAGE = 300;

export default function AnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [reach, setReach] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadReach = useCallback(() => {
    fetch("/api/push-announcement", { headers: getAuthHeader() })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setReach(data);
        setLoadError("");
      })
      .catch(() => setLoadError("Could not load who this would reach."));
  }, []);

  useEffect(() => {
    loadReach();
  }, [loadReach]);

  const count = reach ? reach[audience] : 0;
  const trimmed = message.trim();
  const canSend = Boolean(reach?.configured) && trimmed.length > 0 && count > 0;

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: "auto", mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Announcements
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Sends a push notification to ballcrew who have notifications turned on.
        It can't be unsent, and it doesn't appear anywhere in the app afterwards
        — use a banner in Tournament Settings if people need to be able to find
        it again.
      </Typography>

      {loadError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      ) : null}
      {reach && !reach.configured ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Push notifications aren't configured on the server yet.
        </Alert>
      ) : null}
      {notice ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>
          {notice}
        </Alert>
      ) : null}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          select
          size="small"
          label="Send to"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
        >
          <MenuItem value="all">
            Everyone{reach ? ` (${reach.all} with notifications on)` : ""}
          </MenuItem>
          <MenuItem value="captains">
            Captains &amp; chairpeople
            {reach ? ` (${reach.captains} with notifications on)` : ""}
          </MenuItem>
        </TextField>

        <TextField
          size="small"
          label="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
          placeholder="DC Open Ballcrew"
          helperText={`${title.length}/${MAX_TITLE}`}
        />

        <TextField
          label="Message"
          multiline
          minRows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
          placeholder="e.g. Rain delay — stay near the ballcrew tent until further notice."
          helperText={`${message.length}/${MAX_MESSAGE}`}
        />

        <Button
          variant="contained"
          disabled={!canSend}
          onClick={() => setConfirmOpen(true)}
          sx={{ alignSelf: "flex-start" }}
        >
          Send announcement
        </Button>
      </Box>

      <ConfirmDialog
        message={`You are about to push "${trimmed}" to ${count} ${
          count === 1 ? "person" : "people"
        }. It can't be unsent.`}
        url="/api/push-announcement"
        body={{ title: title.trim(), message: trimmed, audience }}
        method="POST"
        open={confirmOpen}
        setOpen={setConfirmOpen}
        setUpdated={() => {
          setNotice(`Announcement sent to ${count} ${count === 1 ? "person" : "people"}.`);
          setTitle("");
          setMessage("");
          loadReach();
        }}
      />
    </Paper>
  );
}