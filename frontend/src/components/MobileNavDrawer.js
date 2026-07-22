import React, { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";

import { getAuthHeader, getLocalStorage } from "./Utils";
import {
  NavIconRoster,
  NavIconTeams,
  NavIconSchedule,
  NavIconRatings,
  NavIconProfile,
  NavIconSettings,
  NavIconLogout,
} from "./MobileNavIcons";
import "./mobile-nav-drawer.css";

function getInitials(firstName, lastName, username) {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  const parts = String(username || "")
    .split(".")
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return String(username || "?").slice(0, 2).toUpperCase();
}

function formatMeta(ballkid, group) {
  const parts = [];
  if (ballkid?.is_chairperson) {
    parts.push("Chairperson");
  } else if (ballkid?.is_captain) {
    parts.push("Captain");
  } else if (group === "captain") {
    parts.push("Captain");
  } else if (group === "chairperson") {
    parts.push("Chairperson");
  } else {
    parts.push("Ballkid");
  }

  const pos = ballkid?.preferred_position || ballkid?.position || "";
  if (pos) {
    const normalized = String(pos)
      .replace("Net/Back", "Net · Back")
      .replace("Back/Net", "Back · Net")
      .replace("/", " · ");
    if (!parts.includes(normalized)) {
      parts.push(normalized);
    }
  }
  return parts.join(" · ");
}

function pathActive(pathname, item) {
  if (item.match) {
    return item.match.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
  }
  return pathname === item.url || pathname.startsWith(item.url + "/");
}

function getNavItems(group) {
  const roster = {
    label: "Roster",
    url: "/list",
    match: ["/list", "/checkin", "/ballkid", "/cut", "/inactive"],
    Icon: NavIconRoster,
  };
  const teams = {
    label: "Teams",
    url: "/teams",
    match: ["/teams", "/finals-teams", "/past-finals"],
    Icon: NavIconTeams,
  };
  const schedule = {
    label: "Schedule",
    url: "/schedule",
    Icon: NavIconSchedule,
  };

  switch (group) {
    case "chairperson":
      return [
        roster,
        teams,
        schedule,
        {
          label: "Ratings",
          url: "/ratings",
          match: [
            "/ratings",
            "/rate-by-name",
            "/rate-by-team",
            "/rate-by-past-team",
            "/my-ratings",
          ],
          Icon: NavIconRatings,
        },
      ];
    case "captain":
      return [
        { ...roster, match: ["/list", "/ballkid"] },
        teams,
        schedule,
        {
          label: "Ratings",
          url: "/rate-by-name",
          match: [
            "/rate-by-name",
            "/rate-by-team",
            "/rate-by-past-team",
            "/my-ratings",
          ],
          Icon: NavIconRatings,
        },
      ];
    default:
      return [
        { ...roster, match: ["/list", "/ballkid"] },
        teams,
        schedule,
      ];
  }
}

function getAccountItems(group) {
  const base = [
    { label: "My Profile", url: "/me", Icon: NavIconProfile },
    { label: "Account Settings", url: "/settings", Icon: NavIconSettings },
  ];
  if (group === "chairperson") {
    return [
      ...base,
      {
        label: "Tournament Settings",
        url: "/tournament-settings",
        Icon: NavIconSettings,
      },
      { label: "Feedback", url: "/feedback", Icon: NavIconProfile },
    ];
  }
  if (group === "captain" || group === "ballkid") {
    return [...base, { label: "Feedback", url: "/feedback", Icon: NavIconProfile }];
  }
  return base;
}

export default function MobileNavDrawer({ group, setToken }) {
  const [open, setOpen] = useState(false);
  const [ballkid, setBallkid] = useState(null);
  const location = useLocation();

  const pk = getLocalStorage("ballkid_id");
  const username = getLocalStorage("username");

  useEffect(() => {
    if (!pk || !open) {
      return;
    }
    fetch(`/api/get-ballkid/${pk}/${pk}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkid(data));
  }, [pk, open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const navItems = useMemo(() => getNavItems(group), [group]);
  const accountItems = useMemo(() => getAccountItems(group), [group]);

  const displayName = ballkid
    ? `${ballkid.first_name} ${ballkid.last_name}`
    : username || "Ballcrew";
  const initials = getInitials(
    ballkid?.first_name,
    ballkid?.last_name,
    username
  );
  const meta = formatMeta(ballkid, group);

  const handleLogout = () => {
    setOpen(false);
    setToken("");
    localStorage.clear();
  };

  return (
    <>
      <IconButton
        className="app-navbar-menu-btn"
        disableRipple
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
      >
        <MenuIcon fontSize="small" />
      </IconButton>

      {open ? (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {open ? (
        <aside className="mobile-nav-drawer" role="dialog" aria-modal="true">
          <div className="mobile-nav-drawer-header">
            <div className="mobile-nav-drawer-user">
              <div className="mobile-nav-drawer-avatar">{initials}</div>
              <div>
                <div className="mobile-nav-drawer-name">{displayName}</div>
                <div className="mobile-nav-drawer-meta">{meta}</div>
              </div>
            </div>
            <button
              type="button"
              className="mobile-nav-drawer-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="mobile-nav-drawer-body">
            <div className="mobile-nav-section-label">Navigation</div>
            {navItems.map((item) => {
              const Icon = item.Icon;
              const isOn = pathActive(location.pathname, item);
              return (
                <Link
                  key={item.label}
                  to={item.url}
                  className={`mobile-nav-item${isOn ? " on" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="mobile-nav-item-icon">
                    <Icon />
                  </span>
                  {item.label}
                </Link>
              );
            })}

            <div className="mobile-nav-divider" />

            <div className="mobile-nav-section-label">Account</div>
            {accountItems.map((item) => {
              const Icon = item.Icon;
              return (
                <Link
                  key={item.label}
                  to={item.url}
                  className="mobile-nav-item"
                  onClick={() => setOpen(false)}
                >
                  <span className="mobile-nav-item-icon">
                    <Icon />
                  </span>
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              className="mobile-nav-item logout"
              onClick={handleLogout}
            >
              <span className="mobile-nav-item-icon">
                <NavIconLogout />
              </span>
              Log out
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
