import React, { useState } from "react";

import { ballkidImageSrc, Icons } from "../Utils";

export function TeamsPhotoToggle({ showPhotos, onToggle }) {
  return (
    <div className="teams-page-photo-toggle">
      <span className="teams-page-photo-toggle-label">Show photos</span>
      <button
        type="button"
        className={`teams-page-photo-toggle-switch${showPhotos ? " on" : ""}`}
        role="switch"
        aria-checked={showPhotos}
        onClick={onToggle}
      />
    </div>
  );
}

export function personInitials(firstName, lastName) {
  const f = (firstName ?? "").trim()[0] ?? "";
  const l = (lastName ?? "").trim()[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

export function PersonPhotoTile({ ballkid }) {
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
      <span className="team-photo-role-icons">
        <Icons ballkid={ballkid} margin={0} isTeamsPage />
      </span>
    </div>
  );
}
