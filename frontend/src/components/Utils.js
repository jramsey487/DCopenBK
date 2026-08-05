import React, { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { Link as RouterLink } from "react-router-dom";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import CardActionArea from "@mui/material/CardActionArea";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import "./search-and-filter.css";
import "./ratings/rating-dialog.css";

import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

import AspectRatio from "@mui/joy/AspectRatio";

import GridView from "@mui/icons-material/GridView";
import Edit from "@mui/icons-material/Edit";
import List from "@mui/icons-material/List";
import Check from "@mui/icons-material/Check";
import Help from "@mui/icons-material/Help";
import BedtimeOutlined from "@mui/icons-material/BedtimeOutlined";

import RatingDialog from "./ratings/RatingDialog";
import { CheckinHistoryChart } from "./ballkid/CheckinHistoryChart";
import {
  END_DATE,
  START_DATE,
  ICON_DICT,
  TOOLTIP_DICT,
  NUM_RATINGS_WARNING_THRESHOLD,
  SUPERVET_THRESHOLD,
} from "./Consts";
import { Popover } from "@mui/material";
import { YoePill } from "./teams/TeamsShared";
import "./ballkid-badges.css";

export function Icons({
  ballkid,
  margin,
  isTeamsPage = false,
}) {
  const group = getLocalStorage("group");

  return (
    <Icon sx={{ mb: margin }}>
      {ballkid.is_chairperson && ICON_DICT["chairperson"]}
      {ballkid.is_captain && ICON_DICT["captain"]}
      {group !== "ballkid" &&
        ballkid.num_years_experience === 0 &&
        ballkid.is_out_of_town &&
        isTeamsPage &&
        ICON_DICT["outOfTownRookie"]}
      {group !== "ballkid" &&
        ballkid.num_years_experience > 0 &&
        ballkid.is_out_of_town &&
        isTeamsPage &&
        ICON_DICT["outOfTownBallkid"]}
      {group !== "ballkid" &&
        ballkid.num_years_experience === 0 &&
        ICON_DICT["rookie"]}
      {ballkid.num_years_experience > SUPERVET_THRESHOLD &&
        isTeamsPage &&
        ICON_DICT["supervet"]}
    </Icon>
  );
}

export function LayoutButtons({ layout, setLayout }) {
  return (
    <ToggleButtonGroup
      value={layout}
      size="small"
      exclusive
      onChange={(e, newVal) => {
        if (newVal !== null) {
          setLayout(newVal);
          setLocalStorage("layout", newVal);
        }
      }}
    >
      {["grid", "list"].map((layoutStr) => (
        <ToggleButton key={layoutStr} value={layoutStr}>
          <Tooltip title={layoutStr === "grid" ? "Grid View" : "List View"}>
            {layoutStr === "grid" ? <GridView /> : <List />}
          </Tooltip>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export function Alerts({ successMsg, errorMsg, setSuccessMsg, setErrorMsg }) {
  const showSuccess = Boolean(successMsg);
  const showError = Boolean(errorMsg);

  return (
    <Collapse in={showSuccess || showError}>
      {showSuccess ? (
        <Alert
          severity="success"
          onClose={() => {
            setSuccessMsg("");
          }}
        >
          {successMsg}
        </Alert>
      ) : showError ? (
        <Alert
          severity="error"
          onClose={() => {
            setErrorMsg("");
          }}
        >
          {errorMsg}
        </Alert>
      ) : null}
    </Collapse>
  );
}

export function RatingButton({ ballkid, setUpdated, isMobile, date = null }) {
  const [open, setOpen] = useState(false);
  const hasRated = ballkid.num_my_ratings > 0;

  return (
    <div className="ballkid-profile-hero-rating-row">
      <RatingDialog
        open={open}
        setOpen={setOpen}
        ballkid={ballkid}
        setUpdated={setUpdated}
        inputDate={date}
      />

      <Button
        className={`rating-btn ${hasRated ? "rating-btn--rated" : "rating-btn--unrated"}`}
        variant={hasRated ? "outlined" : "contained"}
        disableElevation
        color="primary"
        size="small"
        endIcon={hasRated ? <Check /> : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        sx={{ my: isMobile ? 1 : 0.2 }}
      >
        GIVE RATING
      </Button>
    </div>
  );
}

export function DraftRatingButton({ ballkid, setUpdated }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState();
  const pk = getLocalStorage("ballkid_id");
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch(`/api/get-draft-rating/${pk}/${ballkid.id}`, {
      headers: getAuthHeader(),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setDraft(data && data.id ? data : null))
      .catch(() => setDraft(null));
  }, [pk, ballkid.id]);

  if (draft === null || draft === undefined) {
    return "";
  }

  return (
    <div className="ballkid-profile-hero-rating-row">
      <RatingDialog
        open={open}
        setOpen={setOpen}
        ballkid={ballkid}
        setUpdated={setUpdated}
        draft={draft}
      />
      <Button
        className="rating-btn rating-btn--unrated"
        color="secondary"
        variant="contained"
        disableElevation
        size="small"
        endIcon={<Edit />}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        sx={{ my: isMobile ? 1 : 0.2 }}
      >
        View Draft
      </Button>
    </div>
  );
}

export function SearchBox({ setSearchKeyword }) {
  return (
    <TextField
      size="small"
      type="search"
      variant="outlined"
      fullWidth
      sx={{ py: 1 }}
      placeholder="Search by name..."
      onChange={(e) => setSearchKeyword(e.target.value)}
    />
  );
}

export function SearchAndFilter({
  setSearchKeyword,
  filterGroup,
  setFilterGroup,
  filters = ["rookie", "captain", "chairperson", "back", "net"],
  stacked = false,
}) {
  const filterControls = (
    <div className="sxs search-and-filter__filters">
      <Typography
        component="span"
        variant="body1"
        className="search-and-filter__label"
      >
        Filter to:
      </Typography>
      <ToggleButtonGroup
        value={filterGroup}
        size="small"
        exclusive
        onChange={(e, newVal) => setFilterGroup(newVal)}
        className="search-and-filter__toggle-group"
      >
        {filters.map((filterName) => (
          <ToggleButton
            key={filterName}
            value={filterName}
            style={{ border: 0 }}
          >
            <Tooltip title={TOOLTIP_DICT[filterName]}>
              {ICON_DICT[filterName]}
            </Tooltip>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );

  if (stacked) {
    return (
      <div className="search-and-filter search-and-filter--stacked">
        <SearchBox setSearchKeyword={setSearchKeyword} />
        {filterControls}
      </div>
    );
  }

  return (
    <div className="search-and-filter search-and-filter--inline">
      <div className="search-and-filter__search">
        <SearchBox setSearchKeyword={setSearchKeyword} />
      </div>
      {filterControls}
    </div>
  );
}

function Banner({ banner }) {
  const [open, setOpen] = useState(true);
  const group = getLocalStorage("group");

  const bannerAlert = (
    <Collapse in={open}>
      <Alert
        severity="warning"
        variant="filled"
        onClose={() => setOpen(false)}
        sx={{ mt: 0.5 }}
      >
        {`${banner.message} [Last Updated: ${dayHourToStr(
          banner.timestamp,
          true
        )}]`}
      </Alert>
    </Collapse>
  );

  if (banner.audience === "all") {
    return bannerAlert;
  }

  if (
    banner.audience === "captains" &&
    (group === "chairperson" || group === "captain")
  ) {
    return bannerAlert;
  }

  if (
    banner.audience === "ballkid" &&
    getLocalStorage("ballkid_id") === banner?.ballkid
  ) {
    return bannerAlert;
  }

  return "";
}

export function Banners() {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    fetch("/api/banner-list", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setBanners(data));
  }, []);

  return banners === undefined || banners === null ? (
    ""
  ) : (
    <Box
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translate(-50%, 0)",
        width: "100%",
        zIndex: 999,
      }}
    >
      {banners.map((banner) => (
        <Banner key={banner.id} banner={banner} />
      ))}
    </Box>
  );
}

export function HovercardToggle({ enabled, setEnabled }) {
  return (
    <div className="teams-chairperson-pill">
      <span className="teams-chairperson-pill-label">Hover previews</span>
      <Box className="sxs">
        <Typography variant="body1">Disable</Typography>
        <Switch
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          inputProps={{ "aria-label": "Hover previews" }}
        />
        <Typography variant="body1">Enable</Typography>
      </Box>
    </div>
  );
}

export function HideShowToggle({
  teamType,
  defaultShow,
  setSuccessMsg,
  setErrorMsg,
}) {
  const [showTeams, setShowTeams] = useState(defaultShow);

  const teamStr = teamType === "finals" ? "Finals teams" : "Teams";
  const showMessage = `${teamStr} are now visible to ballkids and captains.`;
  const hideMessage = `${teamStr} are now hidden from ballkids and captains.`;

  return (
    <Box className="sxs">
      <Typography variant="body1">Hide</Typography>
      <Switch
        checked={showTeams}
        onClick={(e) => {
          setShowTeams(e.target.checked);
          fetch("/api/get-tournament", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify(
              teamType === ""
                ? {
                    show_teams: e.target.checked,
                  }
                : {
                    show_finals_teams: e.target.checked,
                  }
            ),
          }).then((response) => {
            if (response.ok) {
              setSuccessMsg(e.target.checked ? showMessage : hideMessage);
            } else {
              setErrorMsg(`${teamStr} visibility setting not updated.`);
            }
          });
        }}
      />
      <Typography variant="body1">Show</Typography>
    </Box>
  );
}

export function TabbedSections({ sections }) {
  const [tabIndex, setTabIndex] = useState(0);
  const [mobileSelection, setMobileSelection] = useState(
    Object.keys(sections)[0]
  );

  const isMobile = useIsMobile();

  return isMobile ? (
    <div>
      <Select
        value={mobileSelection}
        sx={{ mb: 1 }}
        onChange={(e) => setMobileSelection(e.target.value)}
      >
        {Object.keys(sections).map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
      <Box sx={{ mx: 1 }}>{sections[mobileSelection]}</Box>
    </div>
  ) : (
    <Box
      sx={{
        flexGrow: 1,
        bgcolor: "background.paper",
        display: "flex",
        height: 400,
        width: "95%",
      }}
    >
      <Tabs
        orientation="vertical"
        variant="scrollable"
        value={tabIndex}
        onChange={(e, newVal) => setTabIndex(newVal)}
        sx={{ borderRight: 1, borderColor: "divider", minWidth: 250 }}
      >
        {Object.keys(sections).map((label, index) => (
          <Tab key={index} label={label} />
        ))}
      </Tabs>

      {Object.keys(sections).map((label, index) => (
        <Box key={index} hidden={tabIndex !== index} sx={{ mx: 4 }}>
          {tabIndex === index && sections[label]}
        </Box>
      ))}
    </Box>
  );
}

export function CourtAssignment({ nextShifts, showIcon = false }) {
  const hasAnotherShift = nextShifts.length > 0;
  const isCurrentlyOn =
    hasAnotherShift && isCurrentHour(nextShifts[0]["start"]);
  const court = hasAnotherShift ? nextShifts[0]["court"] : "";
  const time = hasAnotherShift ? dayHourToStr(nextShifts[0]["start"]) : "";

  return (
    <Typography
      variant="subtitle2"
      sx={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
    >
      {showIcon && !hasAnotherShift ? (
        <BedtimeOutlined sx={{ fontSize: "1rem", color: "text.secondary" }} />
      ) : null}
      {!hasAnotherShift
        ? "No more shifts"
        : isCurrentlyOn
        ? `Currently on: ${court}`
        : `On at ${time}: ${court}`}
    </Typography>
  );
}

export function ConfirmDialog({
  message,
  url,
  body,
  open,
  setOpen,
  setUpdated,
  method = "PATCH",
}) {
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>Confirm</DialogTitle>
      <DialogContent>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />

        <DialogContentText>{message} Do you wish to proceed?</DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <LoadingButton
          loading={loading}
          variant="contained"
          color="error"
          onClick={() => {
            setLoading(true);
            fetch(url, {
              method: method,
              headers: getAuthHeader(),
              body: JSON.stringify(body),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Success!");
                setTimeout(() => {
                  setOpen(false);
                  setSuccessMsg("");
                  if (setUpdated) {
                    setUpdated(true);
                  }
                }, 2000);
              } else {
                setErrorMsg("Error.");
              }
              setLoading(false);
            });
          }}
        >
          Confirm
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export function BallkidPopover({
  ballkid,
  hoverCommentTypes,
  anchorEl,
  setAnchorEl,
}) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      sx={{
        pointerEvents: "none",
      }}
      // onMouseEnter={(e) => setAnchorEl(e.currentTarget)}
      // onMouseLeave={() => setAnchorEl(null)}
      // transformOrigin={{
      //   vertical: "top",
      //   horizontal: "left",
      // }}
      // PaperProps={{
      //   onMouseEnter: (e) => setAnchorEl(e.currentTarget),
      //   onMouseLeave: () => setAnchorEl(null),
      // }}
    >
      <Card>
        <CardActionArea
          component={RouterLink}
          to={
            ballkid.id === getLocalStorage("ballkid_id")
              ? "/me"
              : `/ballkid/${ballkid.id}`
          }
        >
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {ballkid.first_name} {ballkid.last_name}
            </Typography>
            {hoverCommentTypes.map((hoverCommentType) => (
              <Box className="sxs" key={`${ballkid.id}_${hoverCommentType}`}>
                <CommentsText
                  ballkid={ballkid}
                  commentType={hoverCommentType}
                  showLabel={true}
                />
              </Box>
            ))}

            <Box style={{ maxWidth: 500 }}>
              <CheckinHistoryChart pk={ballkid.id} />
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </Popover>
  );
}

export function BallkidAndIcon({
  ballkid,
  plainName = false,
  showYoe = false,
}) {
  const displayName = `${ballkid.first_name} ${ballkid.last_name}`;

  return (
    <Box
      className="ballkid-and-icon"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "4px",
        width: "max-content",
        maxWidth: "100%",
        minWidth: 0,
        flexWrap: "wrap",
      }}
    >
      {plainName ? (
        <Typography
          component="span"
          variant="subtitle1"
          className="ballkid-list-plain-name"
          sx={{
            fontWeight: 700,
            lineHeight: 1.25,
            color: "inherit",
          }}
        >
          {displayName}
        </Typography>
      ) : (
        <BallkidLink id={ballkid.id} name={displayName} />
      )}
      {showYoe ? <YoePill ballkid={ballkid} /> : null}
      <Icons ballkid={ballkid} margin={0} />
    </Box>
  );
}

export function BallkidLink({ id, name }) {
  return (
    <Link
      variant="body2"
      component={RouterLink}
      to={id === getLocalStorage("ballkid_id") ? "/me" : `/ballkid/${id}`}
      sx={{
        lineHeight: 1.25,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {name}
    </Link>
  );
}

export function BallkidCard({ ballkid, renderAdditional }) {
  const layout = getLocalStorage("layout") ?? "list";

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardActionArea
        component={RouterLink}
        to={
          ballkid.id === getLocalStorage("ballkid_id")
            ? "/me"
            : `/ballkid/${ballkid.id}`
        }
        sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch" }}
      >
        {layout === "list" ? (
          ""
        ) : (
          <AspectRatio ratio="1/1">
            <CardMedia component="img" image={ballkid.image} />
          </AspectRatio>
        )}
        <CardContent>
          {layout === "grid" ? (
            <>
              <Box
                className="ballkid-card-name-row"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flexDirection: "row",
                  flexWrap: "nowrap",
                  gap: 0.5,
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  lineHeight: 1.25,
                }}
              >
                <Typography
                  variant="subtitle1"
                  component="span"
                  className="ballkid-card-name"
                  title={`${ballkid.first_name} ${ballkid.last_name}`}
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.25,
                    flex: "1 1 auto",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ballkid.first_name} {ballkid.last_name}
                </Typography>
                <Box
                  component="span"
                  className="ballkid-card-name-icons"
                  sx={{
                    flexShrink: 0,
                    lineHeight: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <Icons ballkid={ballkid} margin={0} />
                </Box>
              </Box>
              {renderAdditional ? (
                <Box className="ballkid-card-meta">{renderAdditional}</Box>
              ) : null}
            </>
          ) : (
            <div className="justify">
              <div className="sxs">
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {ballkid.first_name} {ballkid.last_name}
                </Typography>
                &thinsp;
                <Icons ballkid={ballkid} margin={0} />
              </div>
              {renderAdditional}
            </div>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function HelpIcon({ page, message }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{page} Help</DialogTitle>
        <DialogContent>{message}</DialogContent>
      </Dialog>

      <Tooltip title="Help">
        <IconButton color="disabled" onClick={() => setOpen(true)}>
          <Help />
        </IconButton>
      </Tooltip>
    </div>
  );
}

function CheckoutTimePill({ ballkid, hideWhenEnd = false }) {
  const value = ballkid?.checkout_comments ?? "End";
  if (hideWhenEnd && value === "End") {
    return null;
  }
  const isEnd = value === "End";
  return (
    <Tooltip title="Today's checkout time" arrow>
      <span
        className={`ballkid-pill ballkid-pill--last${
          isEnd ? " ballkid-pill--muted" : ""
        }`}
      >
        {value}
      </span>
    </Tooltip>
  );
}

function ExperiencePill({ ballkid, dense = true }) {
  if (!ballkid.num_years_experience) {
    return null;
  }
  return (
    <Tooltip title="Years at Citi Open" arrow>
      <span className="ballkid-pill ballkid-pill--yrs">
        {dense
          ? ballkid.num_years_experience
          : `${ballkid.num_years_experience} yr`}
      </span>
    </Tooltip>
  );
}

function CalibratedRankPill({ ballkid }) {
  if (ballkid.rank === null || ballkid.rank === undefined || ballkid.rank === "") {
    return null;
  }
  const muted = ballkid.num_ratings <= NUM_RATINGS_WARNING_THRESHOLD;
  return (
    <Tooltip title="Calibrated rank" arrow>
      <span
        className={`ballkid-pill ballkid-pill--rank${
          muted ? " ballkid-pill--muted" : ""
        }`}
      >
        {String(ballkid.rank)}
      </span>
    </Tooltip>
  );
}

function LastDayPill({ ballkid, showFull = false }) {
  if (
    ballkid.last_day === null ||
    ballkid.last_day === "" ||
    ballkid.last_day === "End"
  ) {
    if (showFull) {
      return (
        <span className="ballkid-pill ballkid-pill--last ballkid-pill--muted">
          End
        </span>
      );
    }
    return null;
  }

  const label =
    showFull || ballkid.last_day.length <= 3
      ? ballkid.last_day
      : ballkid.last_day.substring(0, 3);

  return (
    <Tooltip title="Last day" arrow>
      <span className="ballkid-pill ballkid-pill--last">{label}</span>
    </Tooltip>
  );
}

function CalibratedAvgPill({ ballkid }) {
  const muted = ballkid.num_ratings <= NUM_RATINGS_WARNING_THRESHOLD;
  return (
    <Tooltip title="Calibrated average" arrow>
      <span
        className={`ballkid-pill ballkid-pill--rank${
          muted ? " ballkid-pill--muted" : ""
        }`}
      >
        {Number(ballkid.calibrated_avg).toFixed(3)}
      </span>
    </Tooltip>
  );
}

export function CommentsText({
  ballkid,
  commentType,
  showLabel = false,
  layout = "list",
}) {
  const labeled = (label, pill) => {
    if (!showLabel && pill == null) {
      return null;
    }
    return (
      <Box
        component="span"
        className={showLabel ? "sxs" : "badge-item"}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          my: layout === "grid" ? 1 : 0,
        }}
      >
        {showLabel ? <Typography variant="subtitle2">{label}</Typography> : null}
        {pill}
      </Box>
    );
  };

  switch (commentType) {
    case "checkout_teams": {
      const value = ballkid?.checkout_comments ?? "End";
      if (!showLabel && value === "End") {
        return null;
      }
      return labeled(
        "Today's Checkout Time: ",
        <CheckoutTimePill ballkid={ballkid} hideWhenEnd />
      );
    }

    case "checkout":
      return labeled(
        "Today's Checkout Time: ",
        <CheckoutTimePill ballkid={ballkid} />
      );

    case "experience": {
      if (!showLabel && !ballkid.num_years_experience) {
        return null;
      }
      return labeled(
        "Years Experience: ",
        <ExperiencePill ballkid={ballkid} dense={!showLabel} />
      );
    }

    case "rank": {
      if (
        !showLabel &&
        (ballkid.rank === null || ballkid.rank === undefined || ballkid.rank === "")
      ) {
        return null;
      }
      return labeled("Calibrated Rank: ", <CalibratedRankPill ballkid={ballkid} />);
    }

    case "last_day": {
      const isEnd =
        ballkid.last_day === null ||
        ballkid.last_day === "" ||
        ballkid.last_day === "End";
      if (!showLabel && isEnd) {
        return null;
      }
      return labeled(
        "Last Day: ",
        <LastDayPill ballkid={ballkid} showFull={showLabel} />
      );
    }

    case "calibrated_avg":
      return labeled(
        "Calibrated Average: ",
        <CalibratedAvgPill ballkid={ballkid} />
      );

    default:
      return null;
  }
}

export function renderSwitch(param, setParam, offStr, onStr) {
  return (
    <Box className="sxs">
      <Typography variant="body1">{offStr}</Typography>
      <Switch
        checked={param}
        onChange={(e) => setParam(e.target.checked)}
        inputProps={{ "aria-label": `${offStr} / ${onStr}` }}
      />
      <Typography variant="body1">{onStr}</Typography>
    </Box>
  );
}

export function filterBallkids(ballkids, searchKeyword, filterGroup) {
  return ballkids.filter(
    (ballkid) =>
      `${ballkid.first_name} ${ballkid.last_name}`
        .toLowerCase()
        .includes(searchKeyword.toLowerCase()) &
      (!filterGroup ||
        (filterGroup === "rookie" && ballkid.num_years_experience === 0) ||
        (filterGroup === "supervet" &&
          ballkid.num_years_experience > SUPERVET_THRESHOLD) ||
        (filterGroup === "captain" && ballkid.is_captain) ||
        (filterGroup === "chairperson" && ballkid.is_chairperson) ||
        (filterGroup === "back" && ballkid.preferred_position !== "Net") ||
        (filterGroup === "net" && ballkid.preferred_position !== "Back"))
  );
}

export function getCurrentYear() {
  return new Date().getFullYear();
}

// Converts a time of format
// [year]-[month]-[day]T[24hour]:[minute]:[seconds]
// into [12hour][am/pm]
export function dayHourToStr(dayHour, showMinutes = false) {
  if (dayHour === null || dayHour === undefined) {
    return "";
  }

  const military_hour = parseInt(dayHour.slice(11, 13));
  const suffix = military_hour >= 12 ? "pm" : "am";
  const hour = ((military_hour + 11) % 12) + 1;

  const minutes = dayHour.slice(14, 16);
  if (showMinutes) {
    return `${hour}:${minutes}${suffix}`;
  }
  return `${hour}${suffix}`;
}

export function getDays() {
  // Note that these dates are 0-indexed!!
  const startDate = new Date(START_DATE);
  const endDate = new Date(END_DATE);

  const days = [];
  const date = startDate;
  while (date <= endDate) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return days;
}

// Converts duration string into float as # of hours. Assumes format of:
// {days} {hours}:{minutes}:{seconds}.{milliseconds} OR
// {hours}:{minutes}:{seconds}.{milliseconds}. Returns as float of # hours
export function getTimeFloat(timeStr) {
  var day = 0;
  var hour = 0;
  var minute = 0;

  if (timeStr !== "" && timeStr !== null && timeStr !== undefined) {
    const hourStr = timeStr.split(":")[0];

    if (hourStr.length > 2) {
      day = parseInt(hourStr.split(" ")[0]);
      hour = parseInt(hourStr.split(" ")[1]);
    } else {
      hour = parseInt(hourStr);
    }

    minute = parseInt(timeStr.split(":")[1]);
  }

  return day * 24 + hour + minute / 60;
}

// Takes as input a float which represents the total duration in # hours
// as a float. Outputs as {hours} hrs {minutes} mins
export function getDurationStr(timeFloat, verbose = true) {
  if (timeFloat === null || isNaN(timeFloat)) {
    timeFloat = 0;
  }

  const hours = Math.floor(timeFloat);
  const mins = parseInt((timeFloat % 1) * 60).toLocaleString("en-US", {
    minimumIntegerDigits: 2,
  });

  return verbose ? hours + " hrs " + mins + " mins" : hours + ":" + mins;
}

// Takes as input a string or float which represents the time. Outputs as
// {hour}:{minute} AM/PM. If a string, assumes a format of {hour}:{minute}:{seconds}...
// If a float, assumes that the time is given in hours.
export function getTimeStr(input) {
  if (
    input === null ||
    input === undefined ||
    input === "" ||
    Number.isNaN(input)
  ) {
    return "";
  }

  var military_hour, minute;

  if (typeof input === "string" || input instanceof String) {
    const index = input.indexOf(":");
    military_hour = Number.parseInt(input.slice(0, index));
    minute = input.slice(index + 1, index + 3);
  } else {
    military_hour = Math.floor(input) % 24;
    minute = String(Math.round((input % 1) * 60)).padStart(2, "0");
  }

  const suffix = military_hour >= 12 ? " PM" : " AM";
  const hour = ((military_hour + 11) % 12) + 1;
  return `${hour}:${minute} ${suffix}`;
}

// Renders a float as a percent with 1 decimal point
export function toPercent(val) {
  const percent = Number((val * 100).toFixed(1));
  return `${percent}%`;
}

// Checks if the shift start time string in the format
// [year]-[month]-[day]T[24hour]:[minute]:[seconds]
// is occurring right now
export function isCurrentHour(hour) {
  const shiftDate = hour.substring(0, 10);
  const shiftHour = parseInt(hour.substring(11, 14));

  const nowDate = getToday("hyphen");
  const nowHours = new Date().getHours();

  return shiftHour === nowHours && shiftDate === nowDate;
}

// Returns today as a string of the format:
// slash: [month]/[day]/[year]
// hyphen: [year]-[month]-[day]
// No other formats are recognized.
export function getToday(format = "slash", isForRating = false) {
  var today = new Date();
  if (isForRating && today.getHours() <= 10) {
    today.setDate(today.getDate() - 1);
  }

  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  const yyyy = today.getFullYear();

  if (format === "slash") {
    return `${mm}/${dd}/${yyyy}`;
  } else if (format === "hyphen") {
    return `${yyyy}-${mm}-${dd}`;
  }
}

// Returns date in the format: [week abbrev], [month abbrev] [day]
//  as a string of the format: [month]/[day]/[year]
export function getDay(dateStr) {
  const yyyy = getCurrentYear();
  const date = new Date(`${dateStr.slice(5)}, ${yyyy}`);
  const dd = String(date.getDate());
  const mm = String(date.getMonth() + 1); //January is 0!
  return `${mm}/${dd}/${yyyy}`;
}

// Returns date in the format: [year]-[month]-[day]
//  as a string of the format: [month]/[day]/[year]
export function getDayFromHyphenated(dateStr) {
  if (dateStr === null || dateStr === undefined) {
    return null;
  }

  const yyyy = dateStr.slice(0, 4);
  const mm = dateStr.slice(5, 7);
  const dd = dateStr.slice(8);
  return `${mm}/${dd}/${yyyy}`;
}

export function calcDistanceToIdeal(scale, offset) {
  const a = scale;
  const b = offset;

  if (a === 0 && b === 0) {
    return null;
  }

  // distance to ideal is 1/(4.5) int_{.5}^5 (ax + b - x)**2
  return (1 / 4) * (37 * a ** 2 + a * (22 * b - 74) + 4 * b ** 2 - 22 * b + 37);
}

export function getLocalStorage(key) {
  const valString = localStorage.getItem(key);
  return JSON.parse(valString);
}

/** Persist login response before navigation so /me and API calls see ballkid_id. */
export function setSessionFromLogin(setToken, username, data) {
  setToken(data?.token ?? "");
  const rawId = data?.ballkid_id;
  const ballkidId =
    rawId !== null && rawId !== undefined && rawId !== ""
      ? Number(rawId)
      : null;
  setLocalStorage("username", (username ?? "").toLowerCase());
  setLocalStorage("ballkid_id", Number.isFinite(ballkidId) ? ballkidId : null);
  setLocalStorage("group", data?.group ?? "");
}

/** Resolve ballkid image for CRA dev (proxied to Django static). */
export function ballkidImageSrc(image) {
  if (!image) {
    return "";
  }
  if (String(image).startsWith("http")) {
    return image;
  }
  const normalized = String(image).replace(/^\.\.\//, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

/** Logged-in user's ballkid primary key, or null if missing / invalid. */
export function getBallkidId() {
  const raw = getLocalStorage("ballkid_id");
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const id = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(id) ? id : null;
}

export function setLocalStorage(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

export function getToken() {
  return getLocalStorage("token");
}

export function getAuthHeader() {
  return new Headers({
    Authorization: "Token " + getToken(),
    "Content-Type": "application/json",
  });
}

export function useToken() {
  const getToken = () => {
    const tokenString = localStorage.getItem("token");
    return JSON.parse(tokenString);
  };
  const [token, setToken] = useState(getToken());

  const saveToken = (userToken) => {
    localStorage.setItem("token", JSON.stringify(userToken));
    setToken(userToken);
  };

  return { setToken: saveToken, token };
}

export function handleChange(e, state, setState) {
  setState({ ...state, [e.target.name]: e.target.value });
}

export function useIsMobile() {
  return useMediaQuery({ query: "(max-width: 750px)" });
}