import React from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";

import {
  Banners,
  DraftRatingButton,
  getLocalStorage,
  RatingButton,
} from "../Utils";
import { TeamsChairpersonPageHeader } from "../teams/TeamsChairpersonShared";
import "../teams/teams-page.css";
import "../lists/ballkid-list-by-name.css";
import "../lists/cut-page-desktop.css";
import "./ratings-page.css";
import "./rating-dialog.css";

export function YearPillControl({
  id = "ratings-year",
  label = "Year",
  value,
  onChange,
}) {
  return (
    <div className="year-pill-control">
      <label className="year-pill-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="year-pill-input"
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
      />
    </div>
  );
}

export function FilterTogglePill({
  label,
  checked,
  onChange,
  offLabel,
  onLabel,
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

export function RatingsModeToggle({
  showCalibrated,
  onChange,
  offLabel = "Raw",
  onLabel = "Calibrated",
}) {
  return (
    <FilterTogglePill
      label="Ratings"
      checked={showCalibrated}
      onChange={onChange}
      offLabel={offLabel}
      onLabel={onLabel}
    />
  );
}

export function RateActionButton({ ballkid, setUpdated, date = null }) {
  if (ballkid.id === getLocalStorage("ballkid_id")) {
    return (
      <Button
        className="rating-btn rating-btn--rated"
        variant="outlined"
        disableElevation
        disabled
        size="small"
      >
        Give Rating
      </Button>
    );
  }

  return ballkid.have_draft ? (
    <DraftRatingButton ballkid={ballkid} setUpdated={setUpdated} />
  ) : (
    <RatingButton ballkid={ballkid} setUpdated={setUpdated} date={date} />
  );
}

export function RatingsPageShell({
  title,
  titleExtra = null,
  helpPage,
  helpMessage,
  toolbar = null,
  actions = null,
  alerts = null,
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
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Banners />
      <TeamsChairpersonPageHeader
        title={title}
        titleExtra={titleExtra}
        helpPage={helpPage}
        helpMessage={helpMessage}
        alerts={alerts}
        toolbar={toolbar}
        actions={actions}
      />
      <div className="ratings-page-body">{children}</div>
      {footer ? <div className="ratings-page-footer">{footer}</div> : null}
    </div>
  );
}

export function RatingsGridPanel({ children, loading = false }) {
  return (
    <div className={`ratings-grid-panel${loading ? " is-loading" : ""}`}>
      {children}
    </div>
  );
}

export function RateBallkidMeta({ lines }) {
  const visible = (lines || []).filter(
    (line) => line !== null && line !== undefined && line !== false
  );
  if (visible.length === 0) {
    return <div className="rate-ballkid-meta" aria-hidden="true" />;
  }
  return (
    <div className="rate-ballkid-meta">
      {visible.map((line) => (
        <div key={line} className="rate-ballkid-meta__line">
          {line}
        </div>
      ))}
    </div>
  );
}
