import React, { useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import { ballkidImageSrc, Icons } from "../Utils";

/** Label + custom switch — shared chrome for teams / ratings / leaderboards. */
export function TeamsLabeledToggle({
  label,
  checked,
  onChange,
  ariaLabel,
}) {
  return (
    <div className="teams-page-photo-toggle">
      <span className="teams-page-photo-toggle-label">{label}</span>
      <button
        type="button"
        className={`teams-page-photo-toggle-switch${checked ? " on" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

export function TeamsPhotoToggle({ showPhotos, onToggle }) {
  return (
    <TeamsLabeledToggle
      label="Show photos"
      checked={showPhotos}
      onChange={() => onToggle()}
    />
  );
}

export function TeamsYoeToggle({ showYoe, onToggle }) {
  return (
    <TeamsLabeledToggle
      label="Show YOE"
      checked={showYoe}
      onChange={() => onToggle()}
    />
  );
}

export function personInitials(firstName, lastName) {
  const f = (firstName ?? "").trim()[0] ?? "";
  const l = (lastName ?? "").trim()[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

export function YoePill({ ballkid }) {
  if (!ballkid.num_years_experience) {
    return null;
  }
  return (
    <Tooltip title="Years at Citi Open" arrow>
      <span className="ballkid-pill ballkid-pill--yrs">
        {ballkid.num_years_experience} yr
      </span>
    </Tooltip>
  );
}

export function PersonPhotoTile({ ballkid, showYoe = false }) {
  const src = ballkidImageSrc(ballkid.image);
  const [failed, setFailed] = useState(false);
  return (
    <div className="team-photo-tile">
      <div className="team-photo-avatar">
        {src && !failed ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          personInitials(ballkid.first_name, ballkid.last_name)
        )}
      </div>
      <span className="team-photo-name">
        {ballkid.first_name} {ballkid.last_name}
      </span>
      {showYoe ? <YoePill ballkid={ballkid} /> : null}
      <span className="team-photo-role-icons">
        <Icons ballkid={ballkid} margin={0} isTeamsPage />
      </span>
    </div>
  );
}