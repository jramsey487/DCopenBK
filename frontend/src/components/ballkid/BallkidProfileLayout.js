import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import CircularProgress from "@mui/material/CircularProgress";

import { Banners, ballkidImageSrc, Icons } from "../Utils";
import "./ballkid-profile.css";

const BackChevron = () => (
  <svg viewBox="0 0 14 14" fill="none" aria-hidden>
    <path
      d="M9 2L4 7l5 5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function profileInitials(firstName, lastName) {
  const f = (firstName ?? "").trim()[0] ?? "";
  const l = (lastName ?? "").trim()[0] ?? "";
  const initials = (f + l).toUpperCase();
  return initials || "?";
}

function positionsFromLabel(label) {
  if (!label) {
    return [];
  }
  const s = String(label).trim();
  if (s.includes("/")) {
    return s.split("/").map((p) => p.trim()).filter(Boolean);
  }
  return [s];
}

export function ProfilePositionPills({ preferred, current }) {
  const parts = new Set();
  positionsFromLabel(preferred).forEach((p) => parts.add(p));
  if (current) {
    positionsFromLabel(current).forEach((p) => parts.add(p));
  }
  if (parts.size === 0) {
    return null;
  }
  return (
    <div className="ballkid-profile-hero-pills">
      {[...parts].map((pos) => {
        const key = pos.toLowerCase();
        const variant =
          key === "net"
            ? "ballkid-profile-pill--net"
            : key === "back"
            ? "ballkid-profile-pill--back"
            : "ballkid-profile-pill--rookie";
        return (
          <span
            key={pos}
            className={`ballkid-profile-pill ${variant}`}
            title={`Position: ${pos}`}
          >
            {pos}
          </span>
        );
      })}
    </div>
  );
}

export function ProfileRolePills({ ballkid }) {
  const showRookie =
    ballkid?.num_years_experience === 0 &&
    !ballkid?.is_captain &&
    !ballkid?.is_chairperson;

  if (!ballkid?.is_chairperson && !ballkid?.is_captain && !showRookie) {
    return null;
  }

  return (
    <span className="ballkid-profile-hero-role-icons">
      <Icons ballkid={ballkid} margin={0} />
    </span>
  );
}

export function ProfileAvatar({ firstName, lastName, image }) {
  const src = ballkidImageSrc(image);
  const initials = profileInitials(firstName, lastName);
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <div className="ballkid-profile-hero-photo">
        <img src={src} alt="" onError={() => setFailed(true)} />
      </div>
    );
  }

  return <div className="ballkid-profile-hero-photo">{initials}</div>;
}

export function ProfilePageShell({ children }) {
  return (
    <div className="page ballkid-profile-shell">
      <Banners />
      {children}
    </div>
  );
}

export function ProfileLoadingState({ message = "Loading profile…" }) {
  return (
    <ProfilePageShell>
      <div className="ballkid-profile-state">
        <CircularProgress size={28} />
        <span>{message}</span>
      </div>
    </ProfilePageShell>
  );
}

export function ProfileErrorState({ children }) {
  return (
    <ProfilePageShell>
      <div className="ballkid-profile-state-card">{children}</div>
    </ProfilePageShell>
  );
}

export function ProfileBackLink({
  to = "/list",
  label = "Back to roster",
}) {
  return (
    <RouterLink to={to} className="ballkid-profile-back">
      <BackChevron />
      {label}
    </RouterLink>
  );
}

export function ProfileBrandedHero({
  ballkid,
  backTo = "/list",
  backLabel = "Back to roster",
  nameExtra,
  actions,
  status,
}) {
  const name = `${ballkid.first_name} ${ballkid.last_name}`;
  const showCurrentPosition =
    ballkid.is_active &&
    ballkid.is_cut !== true &&
    ballkid.is_cut !== "true" &&
    ballkid.position;

  return (
    <div className="ballkid-profile-hero-band">
      <ProfileBackLink to={backTo} label={backLabel} />
      <div className="ballkid-profile-hero-main">
        <ProfileAvatar
          firstName={ballkid.first_name}
          lastName={ballkid.last_name}
          image={ballkid.image}
        />
        <div className="ballkid-profile-hero-body">
          <div className="ballkid-profile-hero-top">
            <div className="ballkid-profile-hero-title-block">
              <div className="ballkid-profile-hero-name-row">
                <h1 className="ballkid-profile-hero-name">{name}</h1>
                <ProfileRolePills ballkid={ballkid} />
              </div>
            </div>
            {nameExtra ? (
              <div className="ballkid-profile-hero-menu">{nameExtra}</div>
            ) : null}
          </div>
          <div className="ballkid-profile-hero-meta">
            <div className="ballkid-profile-hero-meta-pills">
              <ProfilePositionPills
                preferred={ballkid.preferred_position}
                current={showCurrentPosition ? ballkid.position : null}
              />
            </div>
            {status ? (
              <div className="ballkid-profile-hero-status">{status}</div>
            ) : null}
            {actions ? (
              <div className="ballkid-profile-hero-actions">{actions}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileTabs({ tabs, active, onChange }) {
  return (
    <div className="ballkid-profile-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={
            active === tab.id
              ? "ballkid-profile-tab is-active"
              : "ballkid-profile-tab"
          }
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function ProfileContent({ children }) {
  return <div className="ballkid-profile-content">{children}</div>;
}

export function ProfilePanel({ id, active, children }) {
  return (
    <div
      id={`profile-panel-${id}`}
      role="tabpanel"
      className={
        active === id
          ? "ballkid-profile-panel is-active"
          : "ballkid-profile-panel"
      }
    >
      {children}
    </div>
  );
}

export function ProfileCard({ title, action, children, padded }) {
  return (
    <div className="ballkid-profile-card-v2">
      {title ? (
        <div className="ballkid-profile-card-header">
          <span className="ballkid-profile-card-title">{title}</span>
          {action}
        </div>
      ) : null}
      <div
        className={
          padded ? "ballkid-profile-card-body--padded" : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}

export function ProfileInfoRow({ label, value, children, stack }) {
  return (
    <div
      className={
        stack
          ? "ballkid-profile-info-row ballkid-profile-info-row--stack"
          : "ballkid-profile-info-row"
      }
    >
      <span className="ballkid-profile-info-key">{label}</span>
      <span className="ballkid-profile-info-val">
        {children !== undefined ? children : value}
      </span>
    </div>
  );
}

/** @deprecated use ProfileCard + ProfileInfoRow */
export function ProfileSection({ title, children, className = "" }) {
  return (
    <ProfileCard title={title}>
      <div className={className}>{children}</div>
    </ProfileCard>
  );
}

/** @deprecated use ProfileInfoRow */
export function ProfileField({ label, value, children }) {
  return (
    <ProfileInfoRow label={label} value={value}>
      {children}
    </ProfileInfoRow>
  );
}

/** @deprecated hero photo is in ProfileBrandedHero */
export function ProfileHero() {
  return null;
}

export function ProfilePhoto() {
  return null;
}

export function ProfileMainLayout({ children }) {
  return <ProfileContent>{children}</ProfileContent>;
}
