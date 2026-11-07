import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";

import { ConfirmDialog, getAuthHeader } from "../Utils";
import ApplicationDetailDrawer from "./ApplicationDetailDrawer";

const STATUS_COLORS = {
  pending: "default",
  accepted: "success",
  rejected: "error",
  waitlisted: "warning",
};

const STATUS_VERB = {
  accepted: "Accept",
  waitlisted: "Waitlist",
  rejected: "Reject",
  pending: "Move back to pending",
};

// What each decision emails the applicant (shown in the confirm dialog).
const STATUS_EMAIL_BLURB = {
  accepted: "a congratulations email",
  waitlisted: "a waitlist email",
  rejected: "a polite decline email",
  pending: null,
};

function RecBreakdown({ counts }) {
  const c = counts || {};
  return (
    <Tooltip title="Strong yes / Yes / No / Strong no">
      <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
        {c.strong_yes || 0} · {c.yes || 0} · {c.no || 0} · {c.strong_no || 0}
      </Typography>
    </Tooltip>
  );
}

function sortValue(app, key) {
  switch (key) {
    case "name":
      return `${app.last_name} ${app.first_name}`.toLowerCase();
    case "type":
      return app.is_veteran ? 1 : 0;
    case "reviews":
      return app.review_count;
    case "avg":
      return app.average_overall_rating;
    case "status":
      return app.status;
    case "submitted":
      return app.submitted_at;
    default:
      return null;
  }
}

export default function ApplicationsReviewPage() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "avg", dir: "desc" });
  const [notice, setNotice] = useState(null);

  const [applicationsOpen, setApplicationsOpen] = useState(null);
  const [settingsError, setSettingsError] = useState(false);
  const [confirmationEmailsOn, setConfirmationEmailsOn] = useState(null);

  const [selected, setSelected] = useState(null);

  const load = () => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    return fetch(`/api/applications${query}`, { headers: getAuthHeader() })
      .then((res) => res.json())
      .then((data) => setApplications(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const refreshSelected = (id) =>
    fetch(`/api/applications/${id}`, { headers: getAuthHeader() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSelected(data);
      });

  const reloadAll = (id) => Promise.all([load(), id ? refreshSelected(id) : null]);

  // --- Settings toggles --------------------------------------------------

  const loadApplicationSettings = () => {
    setSettingsError(false);
    fetch("/api/application-settings", { headers: getAuthHeader() })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setApplicationsOpen(Boolean(data.is_open));
        setConfirmationEmailsOn(Boolean(data.send_confirmation_emails));
      })
      .catch(() => setSettingsError(true));
  };

  useEffect(loadApplicationSettings, []);

  const patchSetting = async (field, next, setter) => {
    setter(next); // optimistic
    const response = await fetch("/api/application-settings", {
      method: "PATCH",
      headers: getAuthHeader(),
      body: JSON.stringify({ [field]: next }),
    });
    if (!response.ok) {
      setter(!next); // revert on failure
    }
  };

  const toggleApplicationsOpen = () =>
    patchSetting("is_open", !applicationsOpen, setApplicationsOpen);

  const toggleConfirmationEmails = () =>
    patchSetting(
      "send_confirmation_emails",
      !confirmationEmailsOn,
      setConfirmationEmailsOn
    );

  // --- Status changes + waitlist (shared "decision" dialog) ---------------

  // decision: { type: "status", app, status } | { type: "waitlist", app|null }
  const [decision, setDecision] = useState(null);
  const [decisionNotify, setDecisionNotify] = useState(true);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionError, setDecisionError] = useState("");

  const openDecision = (next) => {
    setDecision(next);
    setDecisionNotify(true);
    setDecisionError("");
  };

  const requestStatus = (app, status) =>
    openDecision({ type: "status", app, status });

  const requestWaitlistMove = (app) => openDecision({ type: "waitlist", app });

  const confirmDecision = async () => {
    if (!decision) return;
    setDecisionBusy(true);
    setDecisionError("");
    const notify = Boolean(confirmationEmailsOn) && decisionNotify;

    try {
      let response;
      if (decision.type === "status") {
        response = await fetch(`/api/applications/${decision.app.id}/status`, {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({ status: decision.status, notify }),
        });
      } else {
        response = await fetch("/api/applications/waitlist-promote", {
          method: "POST",
          headers: getAuthHeader(),
          body: JSON.stringify({
            application_id: decision.app ? decision.app.id : undefined,
            notify,
          }),
        });
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDecisionError(data.detail || "Something went wrong.");
        return;
      }

      const name =
        decision.type === "waitlist"
          ? `${data.first_name} ${data.last_name}`
          : `${decision.app.first_name} ${decision.app.last_name}`;
      setNotice({
        severity: "success",
        text:
          decision.type === "waitlist"
            ? `${name} was moved up from the waitlist to accepted${notify ? " and emailed" : ""}.`
            : `${name} was set to ${decision.status}${
                notify && STATUS_EMAIL_BLURB[decision.status] ? " and emailed" : ""
              }.`,
      });
      setDecision(null);
      const touchedId =
        decision.type === "waitlist" ? data.id : decision.app.id;
      await reloadAll(selected && selected.id === touchedId ? touchedId : null);
    } catch (err) {
      setDecisionError("Something went wrong.");
    } finally {
      setDecisionBusy(false);
    }
  };

  // --- Promote -------------------------------------------------------------

  const [ballkids, setBallkids] = useState([]);
  const [promoteDialogApp, setPromoteDialogApp] = useState(null);
  const [promoteDialogBallkid, setPromoteDialogBallkid] = useState(null);
  const [promoteAsNew, setPromoteAsNew] = useState(false);
  const [promoteCreateLogin, setPromoteCreateLogin] = useState(true);
  const [promoteError, setPromoteError] = useState("");

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((res) => res.json())
      .then((data) => setBallkids(Array.isArray(data) ? data : []));
  }, []);

  const describeLogin = (login, name) => {
    if (!login) return `${name} was promoted to ballkid.`;
    if (login.created && login.invite_queued) {
      return `${name} was promoted. Login "${login.username}" was created and an email to set a password is on its way.`;
    }
    if (login.created) {
      return `${name} was promoted and login "${login.username}" was created, but they have no email on file, so no invite was sent.`;
    }
    if (login.username) {
      return `${name} was promoted and linked to their existing login "${login.username}".`;
    }
    return `${name} was promoted to ballkid.`;
  };

  const promote = async (app, ballkidId, createLogin) => {
    const response = await fetch(`/api/promote-application/${app.id}`, {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({
        ...(ballkidId ? { ballkid_id: ballkidId } : {}),
        create_login: createLogin,
      }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  };

  const finishPromote = async (app, data) => {
    setNotice({
      severity: "success",
      text: describeLogin(data.login, `${app.first_name} ${app.last_name}`),
    });
    await reloadAll(selected && selected.id === app.id ? app.id : null);
  };

  const openPromoteDialog = async (app) => {
    if (!app.is_veteran) {
      // First-timers have no existing record to match -- promote directly.
      const { ok, data } = await promote(app, null, true);
      if (ok) {
        await finishPromote(app, data);
      } else {
        setNotice({
          severity: "error",
          text: (Array.isArray(data) ? data.join(" ") : data.detail) || "Could not promote.",
        });
      }
      return;
    }
    setPromoteError("");
    setPromoteAsNew(false);
    setPromoteCreateLogin(true);
    // Convenience default only -- covers the common case (name unchanged).
    // The chairperson can search for anyone, by any name, which is what
    // actually handles a legal name change (e.g. after marriage).
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
      setPromoteError(
        'Select their existing record, or choose "not currently in our system" below.'
      );
      return;
    }
    setPromoteError("");
    const app = promoteDialogApp;
    const { ok, data } = await promote(
      app,
      promoteAsNew ? null : promoteDialogBallkid.id,
      promoteCreateLogin
    );
    if (!ok) {
      setPromoteError(
        data.ballkid_id?.[0] ||
          data.detail ||
          (Array.isArray(data) ? data.join(" ") : "Could not promote.")
      );
      return;
    }
    setPromoteDialogApp(null);
    setPromoteDialogBallkid(null);
    await finishPromote(app, data);
  };

  // --- Headshot update -----------------------------------------------------

  const [headshotDialogApp, setHeadshotDialogApp] = useState(null);
  const [headshotDialogBallkid, setHeadshotDialogBallkid] = useState(null);
  const [headshotError, setHeadshotError] = useState("");

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

  // --- CSV export ------------------------------------------------------------

  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const query = statusFilter ? `?status=${statusFilter}` : "";
      const response = await fetch(`/api/applications/export${query}`, {
        headers: getAuthHeader(),
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ballcrew-applications${statusFilter ? `-${statusFilter}` : ""}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setNotice({ severity: "error", text: "Could not export the CSV." });
    } finally {
      setExporting(false);
    }
  };

  // --- Tryout reminders ------------------------------------------------------

  const [reminderInfo, setReminderInfo] = useState(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const openReminderDialog = async () => {
    const response = await fetch("/api/applications/tryout-reminders", {
      headers: getAuthHeader(),
    });
    const data = await response.json().catch(() => ({}));
    setReminderInfo(data);
    setReminderDialogOpen(true);
  };

  const reminderMessage = reminderInfo
    ? !reminderInfo.emails_enabled
      ? "Applicant emails are switched off, so nothing can be sent. Turn them on first."
      : reminderInfo.pending > 0
      ? `This emails a tryout reminder to ${reminderInfo.pending} first-time applicant${
          reminderInfo.pending === 1 ? "" : "s"
        } whose tryout is within the next 2 days. Anyone already reminded is skipped.`
      : "No one is due a tryout reminder right now (tryouts within the next 2 days, not yet reminded)."
    : "";

  // --- Purge -----------------------------------------------------------------

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

  const purgeMessage =
    purgePreview &&
    (purgePreview.count > 0 ? (
      <>
        This will permanently delete <strong>{purgePreview.count}</strong>{" "}
        application(s) that were never promoted to a ballkid, along with their
        uploaded headshots. This cannot be undone.
        <Box component="ul" sx={{ mt: 1 }}>
          {Object.entries(purgePreview.by_status)
            .filter(([, n]) => n > 0)
            .map(([status, n]) => (
              <li key={status}>
                {status}: {n}
              </li>
            ))}
        </Box>
      </>
    ) : (
      "There are no unpromoted applications to delete right now."
    ));

  // --- Table data ------------------------------------------------------------

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = applications.filter(
      (a) =>
        !q ||
        `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(q)
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const aNull = av === null || av === undefined;
      const bNull = bv === null || bv === undefined;
      if (aNull && bNull) return 0;
      if (aNull) return 1; // blanks always last, whichever direction
      if (bNull) return -1;
      if (typeof av === "string") return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
  }, [applications, search, sort]);

  const handleSort = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" || key === "status" || key === "type" ? "asc" : "desc" }
    );

  const sortHeader = (key, label) => (
    <TableSortLabel
      active={sort.key === key}
      direction={sort.key === key ? sort.dir : "asc"}
      onClick={() => handleSort(key)}
    >
      {label}
    </TableSortLabel>
  );

  const decisionTitle = decision
    ? decision.type === "waitlist"
      ? "Move up from the waitlist"
      : STATUS_VERB[decision.status]
    : "";

  const decisionBody = () => {
    if (!decision) return "";
    if (decision.type === "waitlist") {
      return decision.app
        ? `${decision.app.first_name} ${decision.app.last_name} will be set to accepted and (optionally) emailed that a spot opened up.`
        : "The best waitlisted applicant this season (highest average overall tryout rating, then earliest application) will be set to accepted and (optionally) emailed that a spot opened up.";
    }
    return `${decision.app.first_name} ${decision.app.last_name} will be set to ${decision.status}.`;
  };

  const decisionEmailBlurb =
    decision && decision.type === "waitlist"
      ? "an email saying a spot opened up"
      : decision
      ? STATUS_EMAIL_BLURB[decision.status]
      : null;

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 2,
        }}
      >
        <Typography variant="h6">Ballcrew Applications</Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={statusFilter}
          onChange={(_, value) => {
            // Clicking the active button returns null; keep the current filter.
            if (value !== null) setStatusFilter(value);
          }}
          aria-label="Filter applications by status"
        >
          <ToggleButton value="pending">Pending</ToggleButton>
          <ToggleButton value="accepted">Accepted</ToggleButton>
          <ToggleButton value="waitlisted">Waitlisted</ToggleButton>
          <ToggleButton value="rejected">Rejected</ToggleButton>
          <ToggleButton value="">All</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {notice ? (
        <Alert
          severity={notice.severity}
          sx={{ mb: 2 }}
          onClose={() => setNotice(null)}
        >
          {notice.text}
        </Alert>
      ) : null}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
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

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(confirmationEmailsOn)}
              disabled={confirmationEmailsOn === null || settingsError}
              onChange={toggleConfirmationEmails}
              color="success"
            />
          }
          label={
            confirmationEmailsOn === null
              ? "Loading applicant emails…"
              : confirmationEmailsOn
              ? "Applicant emails are ON — confirmations, decisions and tryout reminders are sent"
              : "Applicant emails are OFF — nothing is emailed to applicants"
          }
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <TextField
          size="small"
          label="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
        />
        <Button variant="outlined" size="small" onClick={exportCsv} disabled={exporting}>
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
        <Button variant="outlined" size="small" onClick={openReminderDialog}>
          Send tryout reminders
        </Button>
        {statusFilter === "waitlisted" ? (
          <Button
            variant="contained"
            size="small"
            onClick={() => requestWaitlistMove(null)}
            disabled={applications.length === 0}
          >
            Promote next from waitlist
          </Button>
        ) : null}
        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          {visible.length} shown
        </Typography>
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{sortHeader("name", "Name")}</TableCell>
              <TableCell>{sortHeader("type", "Veteran?")}</TableCell>
              <TableCell>Traveling With</TableCell>
              <TableCell>{sortHeader("reviews", "# Reviews")}</TableCell>
              <TableCell>{sortHeader("avg", "Avg Overall")}</TableCell>
              <TableCell>
                <Tooltip title="Strong yes · Yes · No · Strong no">
                  <span>Recs</span>
                </Tooltip>
              </TableCell>
              <TableCell>{sortHeader("status", "Status")}</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((app) => (
              <TableRow
                key={app.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => setSelected(app)}
              >
                <TableCell>
                  {app.first_name} {app.last_name}
                </TableCell>
                <TableCell>{app.is_veteran ? "Veteran" : "First-time"}</TableCell>
                <TableCell>{app.traveling_with_names || "—"}</TableCell>
                <TableCell>{app.review_count}</TableCell>
                <TableCell>{app.average_overall_rating ?? "—"}</TableCell>
                <TableCell>
                  <RecBreakdown counts={app.recommendation_counts} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={app.status}
                    color={STATUS_COLORS[app.status]}
                    size="small"
                  />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button size="small" onClick={() => setSelected(app)}>
                      View
                    </Button>
                    <Button
                      size="small"
                      disabled={app.status === "accepted"}
                      onClick={() => requestStatus(app, "accepted")}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      disabled={app.status === "waitlisted"}
                      onClick={() => requestStatus(app, "waitlisted")}
                    >
                      Waitlist
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      disabled={app.status === "rejected"}
                      onClick={() => requestStatus(app, "rejected")}
                    >
                      Reject
                    </Button>
                    {app.status === "waitlisted" ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => requestWaitlistMove(app)}
                      >
                        Move up
                      </Button>
                    ) : null}
                    {app.status === "accepted" && !app.promoted_ballkid && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => openPromoteDialog(app)}
                      >
                        Promote to Ballkid
                      </Button>
                    )}
                    {app.promoted_ballkid && (
                      <Chip label="Promoted" size="small" color="info" />
                    )}
                    {app.headshot_update ? (
                      <Button size="small" onClick={() => openHeadshotDialog(app)}>
                        Apply Headshot Update
                      </Button>
                    ) : null}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    No applications to show.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Box>

      <ApplicationDetailDrawer
        app={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onStatus={requestStatus}
        onPromote={openPromoteDialog}
        onWaitlistMove={requestWaitlistMove}
      />

      {/* Accept / waitlist / reject / move up from waitlist */}
      <Dialog
        open={Boolean(decision)}
        onClose={() => (decisionBusy ? null : setDecision(null))}
      >
        <DialogTitle>{decisionTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{decisionBody()}</DialogContentText>
          {decisionEmailBlurb ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(confirmationEmailsOn) && decisionNotify}
                  disabled={!confirmationEmailsOn}
                  onChange={(e) => setDecisionNotify(e.target.checked)}
                />
              }
              label={
                confirmationEmailsOn
                  ? `Email the applicant ${decisionEmailBlurb}`
                  : "Applicant emails are switched off, so no email will be sent"
              }
            />
          ) : null}
          {decisionError ? (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {decisionError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecision(null)} disabled={decisionBusy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={confirmDecision} disabled={decisionBusy}>
            {decisionBusy ? "Working…" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tryout reminders */}
      <ConfirmDialog
        open={reminderDialogOpen}
        setOpen={setReminderDialogOpen}
        message={reminderMessage}
        url="/api/applications/tryout-reminders"
        method="POST"
        body={{}}
        setUpdated={(didUpdate) => {
          if (didUpdate) {
            setNotice({
              severity: "success",
              text: "Tryout reminders are being sent.",
            });
            load();
          }
        }}
      />

      {/* Apply a veteran's updated headshot onto their existing Ballkid */}
      <Dialog
        open={Boolean(headshotDialogApp)}
        onClose={() => setHeadshotDialogApp(null)}
      >
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
      <Dialog
        open={Boolean(promoteDialogApp)}
        onClose={() => setPromoteDialogApp(null)}
      >
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
            sx={{ mt: 1, display: "flex" }}
            control={
              <Switch
                checked={promoteAsNew}
                onChange={(e) => setPromoteAsNew(e.target.checked)}
              />
            }
            label="Not currently in our system — create a new record"
          />
          <FormControlLabel
            sx={{ display: "flex" }}
            control={
              <Checkbox
                checked={promoteCreateLogin}
                onChange={(e) => setPromoteCreateLogin(e.target.checked)}
              />
            }
            label="Create a login and email an invite if they don't have one"
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

      <Divider sx={{ mt: 4, mb: 2 }} />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
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
