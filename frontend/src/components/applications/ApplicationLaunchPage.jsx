import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
const DELIVERY_LABELS = {
  not_sent: "Not sent",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
};

export default function ApplicationLaunchPage() {
  const [year, setYear] = useState("");
  const [roster, setRoster] = useState([]);
  const [count, setCount] = useState(0);
  const [tournamentStart, setTournamentStart] = useState("");
  const [tournamentEnd, setTournamentEnd] = useState("");
  const [tournamentConfigured, setTournamentConfigured] = useState(false);
  const [savingTournament, setSavingTournament] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [applicationsOpen, setApplicationsOpen] = useState(null);
  const [openingApplications, setOpeningApplications] = useState(false);
  const [interestPending, setInterestPending] = useState(null);
  const [notifyingInterest, setNotifyingInterest] = useState(false);

  const undecidedCount = roster.filter(
    (person) => (person.decision || "undecided") === "undecided"
  ).length;
  const selectedRecipient = useMemo(
    () => preview?.results?.find((person) => person.ballkid_id === selectedId) || preview?.results?.[0] || null,
    [preview, selectedId]
  );

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

  const loadTargetTournament = useCallback(async () => {
    if (!year) return;
    try {
      const response = await fetch(
        `/api/applications/launch-tournament?year=${encodeURIComponent(Number(year) + 1)}`,
        { headers: getAuthHeader() }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.year || "Unable to load target tournament dates.");
      setError("");
      setTournamentStart(data.start_date || "");
      setTournamentEnd(data.end_date || "");
      setTournamentConfigured(Boolean(data.configured));
    } catch (err) {
      setTournamentConfigured(false);
      setError(err.message || "Unable to load target tournament dates.");
    }
  }, [year]);

  useEffect(() => {
    loadTargetTournament();
  }, [loadTargetTournament]);

  const saveTargetTournament = async () => {
    if (!year || !tournamentStart || !tournamentEnd) {
      setError("Enter both tournament dates before saving.");
      return;
    }
    setSavingTournament(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/applications/launch-tournament", {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({
          year: Number(year) + 1,
          start_date: tournamentStart,
          end_date: tournamentEnd,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.end_date || data.dates || data.detail || "Unable to save tournament dates.");
      setTournamentConfigured(Boolean(data.configured));
      setNotice(`Tournament dates saved for ${data.year}.`);
    } catch (err) {
      setError(err.message || "Unable to save tournament dates.");
    } finally {
      setSavingTournament(false);
    }
  };

  const loadLaunchSettings = useCallback(async () => {
    try {
      const settingsResponse = await fetch("/api/application-settings", {
        headers: getAuthHeader(),
      });
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setApplicationsOpen(Boolean(settingsData.is_open));
      }
      const interestResponse = await fetch("/api/application-interest/summary", {
        headers: getAuthHeader(),
      });
      if (interestResponse.ok) {
        const interestData = await interestResponse.json();
        setInterestPending(Number(interestData.pending) || 0);
      }
    } catch (err) {
      // Keep launch controls disabled if settings couldn't be confirmed.
    }
  }, []);

  useEffect(() => {
    loadLaunchSettings();
  }, [loadLaunchSettings]);

  const loadPreview = async () => {
    if (!year) return;
    setPreviewLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/applications/launch-preview?source_year=${encodeURIComponent(year)}`,
        { headers: getAuthHeader() }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.source_year || "Unable to build email preview.");
      }
      setPreview(data);
      setSelectedId((current) =>
        data.results?.some((person) => person.ballkid_id === current)
          ? current
          : data.results?.[0]?.ballkid_id ?? null
      );
      setPreviewOpen(true);
    } catch (err) {
      setError(err.message || "Unable to build email preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

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
          headers: getAuthHeader(),
          body: JSON.stringify({ year: Number(year) + 1, decision: nextDecision }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.decision || data.detail || "Unable to save decision.");
      }
      setNotice(`Saved ${DECISION_LABELS[nextDecision]} for application season ${data.year}.`);
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

  const openApplications = async () => {
    if (applicationsOpen || openingApplications) return;
    if (!window.confirm("Open applications to the public now?")) return;
    setOpeningApplications(true);
    setError("");
    try {
      const response = await fetch("/api/application-settings", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({ is_open: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to open applications.");
      }
      setApplicationsOpen(Boolean(data.is_open));
      setNotice("Applications are now open.");
      await loadLaunchSettings();
    } catch (err) {
      setError(err.message || "Unable to open applications.");
    } finally {
      setOpeningApplications(false);
    }
  };

  const notifyInterestList = async () => {
    if (!applicationsOpen || notifyingInterest) return;
    if (!window.confirm("Email everyone on the interest list who has not been notified yet?")) return;
    setNotifyingInterest(true);
    setError("");
    try {
      const response = await fetch("/api/application-interest/notify", {
        method: "POST",
        headers: getAuthHeader(),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to notify the interest list.");
      }
      setInterestPending(Number(data.remaining_after) || 0);
      setNotice(`Interest-list notification started for ${data.queued} people. ${data.remaining_after} remain for a later batch.`);
      await loadLaunchSettings();
    } catch (err) {
      setError(err.message || "Unable to notify the interest list.");
    } finally {
      setNotifyingInterest(false);
    }
  };

  const sendLaunchEmails = async () => {
    if (!preview || !preview.year) return;
    setSendLoading(true);
    setError("");
    try {
      const response = await fetch("/api/applications/launch-send", {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ source_year: Number(year) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to start invitation email batch.");
      }
      setNotice(`Started sending ${data.queued} returning-volunteer invitation emails for ${data.year}. Refresh the preview to check delivery status.`);
      setPreviewOpen(false);
    } catch (err) {
      setError(err.message || "Unable to start invitation email batch.");
    } finally {
      setSendLoading(false);
    }
  };

  const canSend =
    preview &&
    preview.tournament_configured &&
    preview.applications_open &&
    preview.undecided.length === 0 &&
    preview.missing_email.length === 0 &&
    preview.sendable > 0 &&
    !preview.sending;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Application Launch
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Start with the people who actually checked in during the selected
        tournament. The historical experience baseline is preserved through
        2026; verified check-in seasons from 2027 onward add to that total.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        This page records next-season invite-back / tryout decisions and previews
        returning-volunteer emails. Sending requires applications to be open.
        Email delivery is tracked per recipient so failed sends can be retried.
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
          label="Prior tournament year (check-ins)"
          type="number"
          size="small"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          inputProps={{ min: 1900, max: new Date().getFullYear() }}
        />
        <TextField
          label={`Target tournament start (${Number(year) + 1})`}
          type="date"
          size="small"
          value={tournamentStart}
          onChange={(event) => setTournamentStart(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label={`Target tournament end (${Number(year) + 1})`}
          type="date"
          size="small"
          value={tournamentEnd}
          onChange={(event) => setTournamentEnd(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button
          variant="outlined"
          onClick={saveTargetTournament}
          disabled={savingTournament || !year || !tournamentStart || !tournamentEnd}
        >
          {savingTournament ? "Saving dates…" : tournamentConfigured ? "Update tournament dates" : "Create tournament dates"}
        </Button>
        <Button variant="contained" onClick={loadRoster} disabled={loading || !year}>
          {loading ? "Loading…" : "Refresh roster"}
        </Button>
        <Button
          variant="outlined"
          onClick={loadPreview}
          disabled={previewLoading || !year}
        >
          {previewLoading ? "Building preview…" : "Preview launch emails"}
        </Button>
        <Button
          variant="outlined"
          onClick={openApplications}
          disabled={applicationsOpen !== false || openingApplications}
        >
          {openingApplications ? "Opening…" : applicationsOpen ? "Applications open" : "Open applications"}
        </Button>
        <Button
          variant="outlined"
          onClick={notifyInterestList}
          disabled={!applicationsOpen || notifyingInterest || interestPending === 0 || interestPending === null}
        >
          {notifyingInterest
            ? "Notifying…"
            : interestPending === null
              ? "Notify interest list"
              : `Notify interest list (${interestPending})`}
        </Button>
        <Typography color="text.secondary" variant="body2">
          {count} checked-in {count === 1 ? "person" : "people"} in {year || "—"}
        </Typography>
      </Box>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}

      {roster.length > 0 ? (
        <Alert severity={undecidedCount > 0 ? "warning" : "success"} sx={{ mb: 2 }}>
          {undecidedCount > 0
            ? `${undecidedCount} of ${roster.length} returning volunteers still need a decision.`
            : `All ${roster.length} returning volunteers have a decision for ${Number(year) + 1}.`}
        </Alert>
      ) : null}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Ballcrew</TableCell>
            <TableCell align="right">Veterancy</TableCell>
            <TableCell align="right">Historical baseline</TableCell>
            <TableCell align="right">Verified seasons after 2026</TableCell>
            <TableCell>Last check-in</TableCell>
            <TableCell>Decision for {Number(year) + 1}</TableCell>
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
              <TableCell align="right">{person.historical_veterancy_years}</TableCell>
              <TableCell align="right">{person.verified_veterancy_years}</TableCell>
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

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          Returning-volunteer email preview — {preview?.year}
        </DialogTitle>
        <DialogContent dividers>
          {preview ? (
            <>
              <Alert
                severity={!preview.tournament_configured || preview.undecided.length || preview.missing_email.length ? "warning" : preview.applications_open ? "success" : "info"}
                sx={{ mb: 2 }}
              >
                {preview.sendable} recipients ready. {preview.undecided.length} undecided; {preview.missing_email.length} missing email.
                {!preview.tournament_configured ? ` Tournament dates for ${preview.year} are not configured; sending is disabled.` : ` Tournament dates: ${preview.tournament_dates}.`}
                {!preview.applications_open ? " Applications are currently closed, so sending is disabled." : ""}
              </Alert>
              {preview.undecided.length ? (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Decisions needed: {preview.undecided.join(", ")}
                </Typography>
              ) : null}
              {preview.missing_email.length ? (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Missing email: {preview.missing_email.join(", ")}
                </Typography>
              ) : null}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(260px, 0.8fr) minmax(0, 1.2fr)" }, gap: 2 }}>
                <Box sx={{ maxHeight: 360, overflow: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Recipient</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.results.map((person) => (
                        <TableRow
                          key={person.ballkid_id}
                          hover
                          selected={person.ballkid_id === selectedRecipient?.ballkid_id}
                          onClick={() => setSelectedId(person.ballkid_id)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{person.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {person.email || "No email"} · {DECISION_LABELS[person.decision]}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {DELIVERY_LABELS[person.status] || person.status}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
                <Box>
                  {selectedRecipient ? (
                    <>
                      <Typography variant="subtitle2">{selectedRecipient.name} — {selectedRecipient.email || "No email address"}</Typography>
                      <TextField
                        label="Subject"
                        value={selectedRecipient.subject}
                        fullWidth
                        size="small"
                        margin="dense"
                        InputProps={{ readOnly: true }}
                      />
                      <TextField
                        label="Email body"
                        value={selectedRecipient.text}
                        fullWidth
                        multiline
                        minRows={12}
                        margin="dense"
                        InputProps={{ readOnly: true }}
                      />
                      {selectedRecipient.last_error ? (
                        <Alert severity="error" sx={{ mt: 1 }}>{selectedRecipient.last_error}</Alert>
                      ) : null}
                    </>
                  ) : (
                    <Typography color="text.secondary">No recipients in this roster.</Typography>
                  )}
                </Box>
              </Box>
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={loadPreview} disabled={previewLoading}>
            Refresh delivery status
          </Button>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={sendLaunchEmails}
            disabled={!canSend || sendLoading}
          >
            {sendLoading ? "Starting…" : "Send invitation emails"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
