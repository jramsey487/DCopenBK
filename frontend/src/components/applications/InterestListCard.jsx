import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import { getAuthHeader } from "../Utils";

// Chairperson-only. Shows who has asked to be told when applications open
// (from the public /apply page while it's closed, or imported below), and
// lets you email the application link to everyone who hasn't been emailed
// yet. Opening and closing the application several times is fine: each click
// only reaches people added since the last send.
export default function InterestListCard({ applicationsOpen }) {
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showImport, setShowImport] = useState(false);
  const [pasted, setPasted] = useState("");
  const [alreadyEmailed, setAlreadyEmailed] = useState(false);

  const load = () => {
    setLoadError(false);
    return fetch("/api/application-interest/summary", {
      headers: getAuthHeader(),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setSummary(data);
        return data;
      })
      .catch(() => setLoadError(true));
  };

  useEffect(() => {
    load();
  }, []);

  const errorFrom = async (response, fallback) => {
    try {
      const data = await response.json();
      const first = Object.values(data)[0];
      return (Array.isArray(first) ? first[0] : first) || fallback;
    } catch {
      return fallback;
    }
  };

  const notify = async () => {
    if (!summary || summary.pending === 0) return;
    const count = Math.min(summary.pending, summary.batch_limit);
    if (
      !window.confirm(
        `Email the application link to ${count} ${
          count === 1 ? "person" : "people"
        } on the interest list?`
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/application-interest/notify", {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        setError(await errorFrom(response, "Could not start the send."));
        return;
      }
      const data = await response.json();
      setMessage(
        data.queued === 0
          ? "Nobody left to email."
          : `Sending to ${data.queued} ${
              data.queued === 1 ? "person" : "people"
            } in the background.` +
              (data.remaining_after > 0
                ? ` ${data.remaining_after} more are left -- use the button again tomorrow (Gmail limits how many emails go out per day).`
                : "")
      );
      // Keep checking until the send finishes, then say how it went. People
      // are marked "emailed" as their message goes out, and un-marked if it
      // fails, so anything still pending beyond the leftovers failed to send.
      if (data.queued > 0) {
        const { queued, remaining_after: leftover } = data;
        let settled = false;
        const check = async () => {
          if (settled) return;
          const latest = await load();
          if (!latest || latest.sending) return;
          const failed = latest.pending - leftover;
          if (failed > 0) {
            settled = true;
            setMessage("");
            setError(
              `${failed} of ${queued} emails couldn't be sent and are still marked ` +
                "not yet emailed. Check the mail login or Gmail's daily limit, then try again."
            );
          } else if (latest.pending <= leftover) {
            settled = true;
            setMessage(
              `Done -- emailed ${queued} ${queued === 1 ? "person" : "people"}.` +
                (leftover > 0
                  ? ` ${leftover} more are left -- use the button again tomorrow.`
                  : "")
            );
          }
        };
        [3000, 8000, 20000, 45000, 90000].forEach((ms) => setTimeout(check, ms));
      }
    } catch {
      setError("Could not start the send.");
    } finally {
      setBusy(false);
    }
  };

  const importEmails = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/application-interest/import", {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ emails: pasted, already_emailed: alreadyEmailed }),
      });
      if (!response.ok) {
        setError(await errorFrom(response, "Could not add those emails."));
        return;
      }
      const data = await response.json();
      let text = `Added ${data.added}. ${data.already_on_list} were already on the list.`;
      if (data.invalid && data.invalid.length > 0) {
        text += ` Skipped ${data.invalid.length} that didn't look like emails: ${data.invalid.join(", ")}.`;
      }
      setMessage(text);
      setPasted("");
      load();
    } catch {
      setError("Could not add those emails.");
    } finally {
      setBusy(false);
    }
  };

  const pending = summary ? summary.pending : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Interest list
      </Typography>

      {loadError ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography color="error" variant="body2">
            Couldn't load the interest list.
          </Typography>
          <Button size="small" onClick={load}>
            Retry
          </Button>
        </Box>
      ) : !summary ? (
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {summary.total} on the list · {summary.emailed} already emailed ·{" "}
            {summary.pending} not yet emailed
            {summary.already_applied > 0
              ? ` · ${summary.already_applied} skipped (already applied this season)`
              : ""}
            . People join from the application page while it's closed.
          </Typography>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={notify}
              disabled={busy || summary.sending || !applicationsOpen || pending === 0}
            >
              {`Email application link to interest list (${pending} not yet emailed)`}
            </Button>
            <Button
              size="small"
              onClick={() => setShowImport((v) => !v)}
              disabled={busy}
            >
              {showImport ? "Hide import" : "Add emails from your sheet"}
            </Button>
          </Box>

          {!applicationsOpen ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              Open applications (switch above) to enable sending, so the link in the
              email works.
            </Typography>
          ) : null}
          {summary.sending ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              A send is in progress…
            </Typography>
          ) : null}

          {showImport ? (
            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
              <TextField
                label="Paste emails (one per line, or separated by commas)"
                multiline
                minRows={4}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                size="small"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={alreadyEmailed}
                    onChange={(e) => setAlreadyEmailed(e.target.checked)}
                  />
                }
                label="These people have already been emailed (don't send them the link)"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={importEmails}
                disabled={busy || pasted.trim() === ""}
                sx={{ alignSelf: "flex-start" }}
              >
                Add to list
              </Button>
            </Box>
          ) : null}
        </>
      )}

      {error ? (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      ) : null}
      {message ? (
        <Typography color="success.main" variant="body2" sx={{ mt: 1 }}>
          {message}
        </Typography>
      ) : null}
    </Paper>
  );
}
