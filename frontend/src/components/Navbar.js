import React, { useState } from "react";
import { Link } from "react-router-dom";

import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";

import BallcrewLogo from "./BallcrewLogo";
import MobileNavDrawer from "./MobileNavDrawer";
import { getLocalStorage, useIsMobile } from "./Utils";
import "./navbar.css";

const ballkidTabs = [
  { label: "By Name", url: "/list" },
  {
    label: "Teams",
    url: "/teams",
    subtabs: [
      { label: "Teams", url: "/teams" },
      { label: "Finals Teams", url: "/finals-teams" },
    ],
  },
  { label: "Schedule", url: "/schedule" },
];

const captainTabs = [
  { label: "By Name", url: "/list" },
  {
    label: "Teams",
    url: "/teams",
    subtabs: [
      { label: "Teams", url: "/teams" },
      { label: "Finals Teams", url: "/finals-teams" },
    ],
  },
  { label: "Schedule", url: "/schedule" },
  {
    label: "Ratings",
    url: "/rate-by-name",
    subtabs: [
      { label: "Rate By Name", url: "/rate-by-name" },
      { label: "Rate By Current Team", url: "/rate-by-team" },
      { label: "Rate By Past Teams", url: "/rate-by-past-team" },
      { label: "View My Ratings", url: "/my-ratings" },
    ],
  },
];

const chairpersonTabs = [
  {
    label: "List",
    url: "/checkin",
    subtabs: [
      { label: "Check-In", url: "/checkin" },
      { label: "By Name", url: "/list" },
      { label: "Cut", url: "/cut" },
      { label: "Inactive", url: "/inactive" },
    ],
  },
  {
    label: "Teams",
    url: "/teams",
    subtabs: [
      { label: "Teams", url: "/teams" },
      { label: "Finals Teams", url: "/finals-teams" },
      { label: "Past Finals Teams", url: "/past-finals" },
    ],
  },
  { label: "Schedule", url: "/schedule" },
  {
    label: "Ratings",
    url: "/ratings",
    subtabs: [
      { label: "View Ratings", url: "/ratings" },
      { label: "View My Ratings", url: "/my-ratings" },
      { label: "Rate By Name", url: "/rate-by-name" },
      { label: "Rate By Current Team", url: "/rate-by-team" },
      { label: "Rate By Past Team", url: "/rate-by-past-team" },
    ],
  },
  {
    label: "Leaderboards",
    url: "/leaderboards",
    subtabs: [
      { label: "Check-in", url: "/leaderboards/checkin" },
      { label: "Court Time", url: "/leaderboards/court" },
      { label: "Ratings - Ballkid", url: "/leaderboards/ballkid" },
      { label: "Ratings - Captain", url: "/leaderboards/captain" },
    ],
  },
];

const ballkidAccountTab = {
  label: "Account",
  url: "/me",
  subtabs: [
    { label: "My Profile", url: "/me" },
    { label: "Feedback", url: "/feedback" },
    { label: "Logout", url: "/login" },
  ],
};

const captainAccountTab = {
  label: "Account",
  url: "/me",
  subtabs: [
    { label: "My Profile", url: "/me" },
    { label: "Account Settings", url: "/settings" },
    { label: "Feedback", url: "/feedback" },
    { label: "Logout", url: "/login" },
  ],
};

const chairpersonAccountTab = {
  label: "Account",
  url: "/me",
  subtabs: [
    { label: "My Profile", url: "/me" },
    { label: "Account Settings", url: "/settings" },
    { label: "Tournament Settings", url: "/tournament-settings" },
    { label: "Debug", url: "/debug" },
    { label: "Feedback", url: "/feedback" },
    { label: "Logout", url: "/login" },
  ],
};

function getUserInitials() {
  const username = getLocalStorage("username") || "";
  if (!username) {
    return "";
  }
  const parts = String(username).split(".").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return String(username).slice(0, 2).toUpperCase();
}

function DesktopNavbarItem({ tab, useIconButton, setToken }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [overButton, setOverButton] = useState(false);
  const [overMenu, setOverMenu] = useState(false);

  const handleClose = () => {
    setOverButton(false);
    setOverMenu(false);
  };

  const handleLogout = () => {
    handleClose();
    setToken("");
    localStorage.clear();
  };

  const enterButton = (e) => {
    setOverButton(true);
    setAnchorEl(e.currentTarget);
  };

  const leaveButton = () => {
    setTimeout(() => {
      setOverButton(false);
    }, 50);
  };

  const enterMenu = () => {
    setOverMenu(true);
  };

  const leaveMenu = () => {
    setOverMenu(false);
  };

  return (
    <div>
      {useIconButton ? (
        <IconButton
          className="app-navbar-account-btn"
          disableRipple
          onMouseEnter={enterButton}
          onMouseLeave={leaveButton}
          component={Link}
          to={tab.url}
          aria-label={tab.label}
        >
          <span className="app-navbar-account-initials" aria-hidden="true">
            {getUserInitials()}
          </span>
        </IconButton>
      ) : (
        <Button
          className="app-navbar-tab-btn"
          onMouseEnter={enterButton}
          onMouseLeave={leaveButton}
          component={Link}
          to={tab.url}
        >
          {tab.label}
        </Button>
      )}

      {!tab.subtabs ? (
        ""
      ) : (
        <Menu
          className="app-navbar-dropdown"
          anchorEl={anchorEl}
          open={overButton || overMenu}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          sx={{
            pointerEvents: "none",
          }}
          disableRestoreFocus
          PaperProps={{
            elevation: 0,
            className: "app-navbar-dropdown-paper",
          }}
          MenuListProps={{
            className: "app-navbar-dropdown-list",
            onMouseEnter: enterMenu,
            onMouseLeave: leaveMenu,
            style: { pointerEvents: "auto" },
          }}
        >
          {tab.subtabs.map((subtab) => (
            <MenuItem
              key={subtab.label}
              className={
                subtab.label === "Logout"
                  ? "app-navbar-dropdown-item logout"
                  : "app-navbar-dropdown-item"
              }
              component={Link}
              to={subtab.url}
              onClick={subtab.label !== "Logout" ? handleClose : handleLogout}
            >
              {subtab.label}
            </MenuItem>
          ))}
        </Menu>
      )}
    </div>
  );
}

export default function Navbar({ isLoggedIn, setToken }) {
  const group = getLocalStorage("group");
  const isMobile = useIsMobile();

  var accountTab = {};
  var tabs = [];
  switch (group) {
    case "ballkid":
      tabs = ballkidTabs;
      accountTab = ballkidAccountTab;
      break;
    case "captain":
      tabs = captainTabs;
      accountTab = captainAccountTab;
      break;
    case "chairperson":
      tabs = chairpersonTabs;
      accountTab = chairpersonAccountTab;
      break;
    default:
      break;
  }

  const homeUrl = isLoggedIn ? "/list" : "/login";

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        <div className="app-navbar-left">
          <Link className="app-navbar-brand" to={homeUrl}>
            <BallcrewLogo variant="crest" size={isMobile ? 32 : 36} />
            <span className="app-navbar-title">Mubadala DC Open Ballcrew</span>
          </Link>

          {isLoggedIn && !isMobile ? (
            <nav className="app-navbar-desktop-tabs" aria-label="Main">
              {tabs.map((tab) => (
                <DesktopNavbarItem
                  key={tab.label}
                  tab={tab}
                  useIconButton={false}
                />
              ))}
            </nav>
          ) : null}
        </div>

        <div className="app-navbar-right">
          {!isLoggedIn ? (
            <Button className="app-navbar-login" component={Link} to="/login">
              Login
            </Button>
          ) : (
            <>
              {isMobile ? (
                <MobileNavDrawer group={group} setToken={setToken} />
              ) : (
                <DesktopNavbarItem
                  tab={accountTab}
                  useIconButton={true}
                  setToken={setToken}
                />
              )}
            </>
          )}
        </div>
      </div>
      <div className="app-navbar-accent" aria-hidden="true" />
    </header>
  );
}
