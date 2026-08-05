import React from "react";

import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import CircularProgress from "@mui/material/CircularProgress";

import { Banners } from "../Utils";
import { TeamsChairpersonPageHeader } from "../teams/TeamsChairpersonShared";
import "../teams/teams-page.css";
import "../lists/ballkid-list-by-name.css";
import "../lists/cut-page-desktop.css";
import "../ratings/ratings-page.css";
import "./leaderboards.css";

export function LeaderboardModePill({
  checked,
  onChange,
  offLabel,
  onLabel,
  label,
}) {
  return (
    <div className="teams-chairperson-pill ratings-mode-pill">
      {label ? (
        <span className="teams-chairperson-pill-label">{label}</span>
      ) : null}
      <Box className="sxs ratings-mode-pill__switch">
        <span className="ratings-mode-pill__side">{offLabel}</span>
        <Switch
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          inputProps={{ "aria-label": `${offLabel} / ${onLabel}` }}
          size="small"
        />
        <span className="ratings-mode-pill__side">{onLabel}</span>
      </Box>
    </div>
  );
}

export function LeaderboardShell({
  title,
  helpPage,
  helpMessage,
  toolbar = null,
  actions = null,
  children,
  footer = null,
  className = "",
}) {
  return (
    <div
      className={[
        "page",
        "ballkid-list-page",
        "teams-page-shell",
        "teams-chairperson-page",
        "ratings-page",
        "leaderboard-page",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Banners />
      <TeamsChairpersonPageHeader
        title={title}
        helpPage={helpPage}
        helpMessage={helpMessage}
        toolbar={toolbar}
        actions={actions}
      />
      <div className="ratings-page-body leaderboard-page-body">{children}</div>
      {footer ? (
        <div className="ratings-page-footer leaderboard-page-footer">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function LeaderboardGridPanel({ children, loading = false }) {
  return (
    <div className={`ratings-grid-panel${loading ? " is-loading" : ""}`}>
      {loading ? <CircularProgress size={28} /> : children}
    </div>
  );
}

export function LeaderboardAvgPanel({ children }) {
  return <div className="leaderboard-avg-panel">{children}</div>;
}

export function LeaderboardNote({ children }) {
  return <p className="leaderboard-note">{children}</p>;
}
