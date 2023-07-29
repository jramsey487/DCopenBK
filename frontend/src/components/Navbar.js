import React, { useState } from "react";
import { Link } from "react-router-dom";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Icon from "@mui/material/Icon";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Collapse from "@mui/material/Collapse";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import ListItemButton from "@mui/material/ListItemButton";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";

import AccountCircle from "@mui/icons-material/AccountCircle";
import SportsTennis from "@mui/icons-material/SportsTennis";
import Close from "@mui/icons-material/Close";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";

import { getLocalStorage, useIsMobile, TournamentBanner } from "./Utils";

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
    ],
  },
  { label: "Schedule", url: "/schedule" },
  {
    label: "Ratings",
    url: "/rate-by-name",
    subtabs: [
      { label: "Rate By Name", url: "/rate-by-name" },
      { label: "Rate By Current Team", url: "/rate-by-team" },
      { label: "Rate By Past Team", url: "/rate-by-past-team" },
      { label: "View Ratings", url: "/ratings" },
      { label: "View My Ratings", url: "/my-ratings" },
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

const nonchairpersonAccountTab = {
  icon: <AccountCircle />,
  label: "Account",
  url: "/me",
  subtabs: [
    { label: "My Profile", url: "/me" },
    // { label: "Game", url: "/game" },
    { label: "Account Settings", url: "/settings" },
    { label: "Feedback", url: "/feedback" },
    { label: "Logout", url: "/login" },
  ],
};

const chairpersonAccountTab = {
  icon: <AccountCircle />,
  label: "Account",
  url: "/me",
  subtabs: [
    { label: "My Profile", url: "/me" },
    // { label: "Game", url: "/game" },
    { label: "Account Settings", url: "/settings" },
    { label: "Tournament Settings", url: "/tournament-settings" },
    { label: "Debug", url: "/debug" },
    { label: "Feedback", url: "/feedback" },
    { label: "Logout", url: "/login" },
  ],
};

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
    // Set a timeout so that the menu doesn't close before the user has time to
    // move their mouse over it
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
          color="inherit"
          onMouseEnter={enterButton}
          onMouseLeave={leaveButton}
          component={Link}
          to={tab.url}
        >
          {tab.icon}
        </IconButton>
      ) : (
        <Button
          color="inherit"
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
          anchorEl={anchorEl}
          open={overButton || overMenu}
          sx={{
            pointerEvents: "none",
          }}
          disableRestoreFocus
          MenuListProps={{
            onMouseEnter: enterMenu,
            onMouseLeave: leaveMenu,
            style: { pointerEvents: "auto" },
          }}
        >
          {tab.subtabs.map((subtab) => (
            <MenuItem
              key={subtab.label}
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

function MobileSubtab({ tab, setOpen, setToken }) {
  const [subtabOpen, setSubtabOpen] = useState(false);

  return (
    <div>
      {!tab.subtabs ? (
        <ListItemButton
          component={Link}
          to={tab.url}
          onClick={() => setOpen(false)}
        >
          <ListItemText primary={tab.label} />
        </ListItemButton>
      ) : (
        <ListItemButton onClick={() => setSubtabOpen(!subtabOpen)}>
          <ListItemText primary={tab.label} />
          {subtabOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
      )}
      {!tab.subtabs ? (
        ""
      ) : (
        <Collapse in={subtabOpen}>
          <List component="div" disablePadding>
            {tab.subtabs.map((subtab) => (
              <ListItemButton
                key={subtab.label}
                component={Link}
                to={subtab.url}
                sx={{ pl: 4 }}
                onClick={
                  subtab.label !== "Logout"
                    ? () => setOpen(false)
                    : () => {
                        setToken("");
                        localStorage.clear();
                      }
                }
              >
                <ListItemText primary={subtab.label} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      )}
    </div>
  );
}

function MobileNavbar({ tabs, accountTab, setToken }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <IconButton onClick={() => setOpen(true)}>
        <MenuIcon sx={{ color: "white" }} />
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: { width: "70%" },
        }}
      >
        <Box sx={{ p: 1 }}>
          <IconButton onClick={() => setOpen(false)}>
            <Close />
          </IconButton>

          <Divider sx={{ my: 1 }} />

          {tabs.map((tab) => (
            <MobileSubtab
              key={tab.label}
              tab={tab}
              setOpen={setOpen}
              setToken={setToken}
            />
          ))}

          <Divider sx={{ my: 1 }} />

          <MobileSubtab
            tab={accountTab}
            setOpen={setOpen}
            setToken={setToken}
          />
        </Box>
      </Drawer>
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
      accountTab = nonchairpersonAccountTab;
      break;
    case "captain":
      tabs = captainTabs;
      accountTab = nonchairpersonAccountTab;
      break;
    case "chairperson":
      tabs = chairpersonTabs;
      accountTab = chairpersonAccountTab;
      break;
    default:
      break;
    // console.log("Unrecognized group: " + group);
  }

  return (
    <AppBar position="sticky">
      {!isLoggedIn ? "" : <TournamentBanner />}
      <Toolbar>
        <div className="justify" style={{ height: "100%" }}>
          <div className="sxs">
            <Box
              className="sxs"
              component={Link}
              to="/list"
              sx={{ textDecoration: "none", color: "white" }}
            >
              <Icon>
                <SportsTennis />
              </Icon>
              <Typography variant="h6" sx={{ mx: 2 }}>
                Mubadala Citi Open Ballcrew
              </Typography>
            </Box>

            {!isLoggedIn || isMobile ? (
              ""
            ) : (
              <div className="sxs">
                {tabs.map((tab) => (
                  <DesktopNavbarItem
                    key={tab.label}
                    tab={tab}
                    useIconButton={false}
                  />
                ))}
              </div>
            )}
          </div>

          {!isLoggedIn ? (
            <Button color="inherit" component={Link} to="/login">
              Login
            </Button>
          ) : isMobile ? (
            <MobileNavbar
              tabs={tabs}
              accountTab={accountTab}
              setToken={setToken}
            />
          ) : (
            <DesktopNavbarItem
              tab={accountTab}
              useIconButton={true}
              setToken={setToken}
            />
          )}
        </div>
      </Toolbar>
    </AppBar>
  );
}
