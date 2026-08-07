import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import CircularProgress from "@mui/material/CircularProgress";

import { Banners, ballkidImageSrc, Icons, useIsMobile, getLocalStorage, getAuthHeader } from "../Utils";
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

export function ProfilePositionPills({ value }) {
  const parts = positionsFromLabel(value);
  if (parts.length === 0) {
    return null;
  }
  return (
    <div className="ballkid-profile-position-pills">
      {parts.map((pos) => {
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

export function isBallkidCut(ballkid) {
  return ballkid?.is_cut === true || ballkid?.is_cut === "true";
}

/** Whether read-only profiles should show current position/team chips. */
export function shouldShowCurrentTournament(ballkid, showTeams) {
  return Boolean(showTeams && ballkid?.is_active && !isBallkidCut(ballkid));
}

export function fetchTournament() {
  return fetch("/api/get-tournament", {
    method: "GET",
    headers: getAuthHeader(),
  }).then((response) =>
    response.ok ? response.json() : { show_teams: false }
  );
}

export function ProfileTeamChip({ team }) {
  if (!team) {
    return "Unassigned";
  }
  return <span className={`chip t${team}`}>{team}</span>;
}

function ballkidShowsHeroRolePills(ballkid) {
  const group = getLocalStorage("group");
  const showRookie =
    group !== "ballkid" &&
    ballkid?.num_years_experience === 0 &&
    !ballkid?.is_captain &&
    !ballkid?.is_chairperson;
  return Boolean(ballkid?.is_chairperson || ballkid?.is_captain || showRookie);
}

export function ProfileRolePills({ ballkid }) {
  if (!ballkidShowsHeroRolePills(ballkid)) {
    return null;
  }

  return (
    <span className="ballkid-profile-hero-role-icons">
      <Icons ballkid={ballkid} margin={0} />
    </span>
  );
}

export function ballkidHasHeroRolePills(ballkid) {
  return ballkidShowsHeroRolePills(ballkid);
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
  const isMobile = useIsMobile();
  const hasRolePills = ballkidHasHeroRolePills(ballkid);
  const hasAccent = hasRolePills || Boolean(status);

  return (
    <div className="ballkid-profile-hero-band">
      <ProfileBackLink to={backTo} label={backLabel} />
      <div className="ballkid-profile-hero-main">
        <ProfileAvatar
          firstName={ballkid.first_name}
          lastName={ballkid.last_name}
          image={ballkid.image}
        />
        <div className="ballkid-profile-hero-head">
          <div className="ballkid-profile-hero-top">
            <div className="ballkid-profile-hero-title-block">
              <div className="ballkid-profile-hero-name-row">
                <div className="ballkid-profile-hero-name-group">
                  <h1 className="ballkid-profile-hero-name">{name}</h1>
                </div>
                {nameExtra ? (
                  <div className="ballkid-profile-hero-menu">{nameExtra}</div>
                ) : null}
              </div>
            </div>
          </div>
          {hasAccent || (actions && !isMobile) ? (
            <div className="ballkid-profile-hero-meta-line">
              {hasAccent ? (
                <div className="ballkid-profile-hero-meta-row ballkid-profile-hero-meta-row--accent">
                  {hasRolePills ? (
                    <div className="ballkid-profile-hero-accent-line">
                      <ProfileRolePills ballkid={ballkid} />
                    </div>
                  ) : null}
                  {status ? (
                    <div className="ballkid-profile-hero-status">{status}</div>
                  ) : null}
                </div>
              ) : null}
              {actions && !isMobile ? (
                <div className="ballkid-profile-hero-actions-bar ballkid-profile-hero-actions-bar--inline">
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {actions && isMobile ? (
          <div className="ballkid-profile-hero-actions-bar ballkid-profile-hero-actions-bar--dock">
            {actions}
          </div>
        ) : null}
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
  // Only mount active tab content so heavy analytics charts don't fetch on Info.
  if (active !== id) {
    return null;
  }

  return (
    <div
      id={`profile-panel-${id}`}
      role="tabpanel"
      className="ballkid-profile-panel is-active"
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

export function ProfileCurrentTournamentCard({ ballkid }) {
  return (
    <ProfileCard title="Current tournament">
      <ProfileInfoRow label="Position">
        <ProfilePositionPills value={ballkid.position} />
      </ProfileInfoRow>
      <ProfileInfoRow label="Current team">
        <ProfileTeamChip team={ballkid.current_team} />
      </ProfileInfoRow>
    </ProfileCard>
  );
}