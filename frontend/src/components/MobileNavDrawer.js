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

function getNavSections(group) {
  const list = {
    label: "List",
    Icon: NavIconRoster,
    items: [
      { label: "Check-In", url: "/checkin" },
      { label: "By Name", url: "/list" },
      { label: "Cut", url: "/cut" },
      { label: "Inactive", url: "/inactive" },
    ],
  };
  const teams = {
    label: "Teams",
    Icon: NavIconTeams,
    items: [
      { label: "Teams", url: "/teams" },
      { label: "Finals Teams", url: "/finals-teams" },
      { label: "Past Finals Teams", url: "/past-finals" },
    ],
  };
  const schedule = {
    label: "Schedule",
    url: "/schedule",
    Icon: NavIconSchedule,
  };
  const ratings = {
    label: "Ratings",
    Icon: NavIconRatings,
    items: [
      { label: "View Ratings", url: "/ratings" },
      { label: "View My Ratings", url: "/my-ratings" },
      { label: "Rate By Name", url: "/rate-by-name" },
      { label: "Rate By Current Team", url: "/rate-by-team" },
      { label: "Rate By Past Team", url: "/rate-by-past-team" },
    ],
  };
  const leaderboards = {
    label: "Leaderboards",
    Icon: NavIconRatings,
    items: [
      { label: "Check-in", url: "/leaderboards/checkin" },
      { label: "Court Time", url: "/leaderboards/court" },
      { label: "Ratings - Ballkid", url: "/leaderboards/ballkid" },
      { label: "Ratings - Captain", url: "/leaderboards/captain" },
    ],
  };

  switch (group) {
    case "chairperson":
      return [list, teams, schedule, ratings, leaderboards];
    case "captain":
      return [
        { ...list, items: [{ label: "By Name", url: "/list" }] },
        teams,
        schedule,
        ratings,
        leaderboards,
      ];
    default:
      return [
        { ...list, items: [{ label: "By Name", url: "/list" }] },
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
      { label: "Debug", url: "/debug", Icon: NavIconSettings },
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
  const [openSections, setOpenSections] = useState({});
  const location = useLocation();

  const pk = getLocalStorage("ballkid_id");
  const username = getLocalStorage("username");

  const toggleSection = (label) =>
    setOpenSections((s) => ({ ...s, [label]: !s[label] }));

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

  const navSections = useMemo(() => getNavSections(group), [group]);
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
            {navSections.map((section) => {
              const Icon = section.Icon;

              // Plain single-link item (like Schedule) — no expand/collapse
              if (section.url) {
                const isOn = pathActive(location.pathname, section);
                return (
                  <Link
                    key={section.label}
                    to={section.url}
                    className={`mobile-nav-category-header mobile-nav-link${
                      isOn ? " is-active" : ""
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="mobile-nav-item-icon">
                      <Icon />
                    </span>
                    <span className="mobile-nav-category-label">{section.label}</span>
                  </Link>
                );
              }

              // Expandable category
              const isOpen = !!openSections[section.label];
              return (
                <div key={section.label} className="mobile-nav-category">
                  <button
                    type="button"
                    className="mobile-nav-category-header"
                    onClick={() => toggleSection(section.label)}
                    aria-expanded={isOpen}
                  >
                    <span className="mobile-nav-item-icon">
                      <Icon />
                    </span>
                    <span className="mobile-nav-category-label">
                      {section.label}
                    </span>
                    <span
                      className={`mobile-nav-chevron${
                        isOpen ? " is-open" : ""
                      }`}
                      aria-hidden
                    >
                      ⌄
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="mobile-nav-subitems">
                      {section.items.map((item) => {
                        const isOn = pathActive(location.pathname, item);
                        return (
                          <Link
                            key={item.label}
                            to={item.url}
                            className={`mobile-nav-subitem${
                              isOn ? " on" : ""
                            }`}
                            onClick={() => setOpen(false)}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
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