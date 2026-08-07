import React, { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import CardActionArea from "@mui/material/CardActionArea";
import Link from "@mui/material/Link";
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { Popover } from "@mui/material";

import Edit from "@mui/icons-material/Edit";
import Check from "@mui/icons-material/Check";
import BedtimeOutlined from "@mui/icons-material/BedtimeOutlined";
import Close from "@mui/icons-material/Close";
import AspectRatio from "@mui/joy/AspectRatio";

import "./ratings/rating-dialog.css";
import "./app-banners.css";
import "./ballkid-badges.css";

import RatingDialog from "./ratings/RatingDialog";
import { CheckinHistoryChart } from "./ballkid/CheckinHistoryChart";
import {
  ICON_DICT,
  NUM_RATINGS_WARNING_THRESHOLD,
} from "./Consts";
import {
  getAuthHeader,
  getBallkidId,
  getLocalStorage,
} from "./authStorage";
import { dayHourToStr, isCurrentHour } from "./dateTime";

export function ballkidIconNodes(ballkid, { isTeamsPage = false } = {}) {
  const group = getLocalStorage("group");
  const icons = [];

  if (ballkid.is_chairperson) {
    icons.push(ICON_DICT.chairperson);
  }
  if (ballkid.is_captain) {
    icons.push(ICON_DICT.captain);
  }
  if (
    group !== "ballkid" &&
    ballkid.num_years_experience === 0 &&
    ballkid.is_out_of_town &&
    isTeamsPage
  ) {
    icons.push(ICON_DICT.outOfTownRookie);
  } else if (
    group !== "ballkid" &&
    ballkid.num_years_experience > 0 &&
    ballkid.is_out_of_town &&
    isTeamsPage
  ) {
    icons.push(ICON_DICT.outOfTownBallkid);
  }
  if (group !== "ballkid" && ballkid.num_years_experience === 0) {
    icons.push(ICON_DICT.rookie);
  }

  return icons;
}

export function Icons({
  ballkid,
  margin = 0,
  isTeamsPage = false,
}) {
  const icons = ballkidIconNodes(ballkid, { isTeamsPage });
  if (icons.length === 0) {
    return null;
  }

  return (
    <span
      className="ballkid-meta-icons"
      style={
        margin
          ? { marginBottom: typeof margin === "number" ? margin * 8 : margin }
          : undefined
      }
    >
      {icons}
    </span>
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

export function RatingButton({ ballkid, setUpdated, date = null }) {
  const [open, setOpen] = useState(false);
  const myId = getBallkidId();
  const isSelf = myId != null && Number(ballkid.id) === myId;
  const hasRated = ballkid.num_my_ratings > 0;

  if (isSelf) {
    return (
      <div className="ballkid-profile-hero-rating-row">
        <Button
          className="rating-btn rating-btn--self"
          variant="outlined"
          disableElevation
          disabled
          size="small"
        >
          Give Rating
        </Button>
      </div>
    );
  }

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
        variant="outlined"
        disableElevation
        size="small"
        endIcon={hasRated ? <Check /> : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
      >
        Give Rating
      </Button>
    </div>
  );
}

export function DraftRatingButton({ ballkid, setUpdated }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState();
  const pk = getLocalStorage("ballkid_id");

  useEffect(() => {
    fetch(`/api/get-draft-rating/${pk}/${ballkid.id}`, {
      headers: getAuthHeader(),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setDraft(data && data.id ? data : null))
      .catch(() => setDraft(null));
  }, [pk, ballkid.id]);

  const draftReady = draft !== null && draft !== undefined;

  return (
    <div className="ballkid-profile-hero-rating-row">
      {draftReady ? (
        <RatingDialog
          open={open}
          setOpen={setOpen}
          ballkid={ballkid}
          setUpdated={setUpdated}
          draft={draft}
        />
      ) : null}
      <Button
        className="rating-btn rating-btn--draft"
        variant="outlined"
        disableElevation
        size="small"
        endIcon={<Edit />}
        disabled={!draftReady}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (draftReady) setOpen(true);
        }}
      >
        View Draft
      </Button>
    </div>
  );
}
function Banner({ banner }) {
  const [open, setOpen] = useState(true);
  const group = getLocalStorage("group");

  const bannerAlert = (
    <Collapse in={open}>
      <div className="app-banner" role="status">
        <div className="app-banner__body">
          <p className="app-banner__message">{banner.message}</p>
          <span className="app-banner__time">
            Updated {dayHourToStr(banner.timestamp, true)}
          </span>
        </div>
        <button
          type="button"
          className="app-banner__close"
          aria-label="Dismiss banner"
          onClick={() => setOpen(false)}
        >
          <Close fontSize="small" />
        </button>
      </div>
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

  return null;
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

  if (!banners?.length) {
    return null;
  }

  return (
    <div className="app-banners">
      {banners.map((banner) => (
        <Banner key={banner.id} banner={banner} />
      ))}
    </div>
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
export function BallkidPopover({
  ballkid,
  hoverCommentTypes,
  anchorEl,
  setAnchorEl,
  showChart = false,
}) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      sx={{
        pointerEvents: "none",
      }}
      PaperProps={{
        className: showChart
          ? "ballkid-hover-popover ballkid-hover-popover--chart"
          : "ballkid-hover-popover",
        elevation: 3,
      }}
    >
      <Card elevation={0} className="ballkid-hover-popover__card">
        <CardActionArea
          component={RouterLink}
          to={
            ballkid.id === getLocalStorage("ballkid_id")
              ? "/me"
              : `/ballkid/${ballkid.id}`
          }
        >
          <CardContent className="ballkid-hover-popover__content">
            <Typography
              variant="subtitle1"
              className="ballkid-hover-popover__name"
            >
              {ballkid.first_name} {ballkid.last_name}
            </Typography>
            {hoverCommentTypes.map((hoverCommentType) => (
              <Box
                className="sxs ballkid-hover-popover__stat"
                key={`${ballkid.id}_${hoverCommentType}`}
              >
                <CommentsText
                  ballkid={ballkid}
                  commentType={hoverCommentType}
                  showLabel={true}
                />
              </Box>
            ))}

            {showChart ? (
              <Box className="ballkid-hover-popover__chart">
                <CheckinHistoryChart pk={ballkid.id} />
              </Box>
            ) : null}
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
      {showYoe ? <ExperiencePill ballkid={ballkid} dense={false} /> : null}
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

export function BallkidCard({ ballkid, renderAdditional, renderNameTrailing }) {
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
            <CardMedia
              component="img"
              image={ballkid.image}
              loading="lazy"
              decoding="async"
            />
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
                {renderNameTrailing ? (
                  <Box
                    component="span"
                    className="ballkid-card-name-trailing"
                    sx={{
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      minWidth: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {renderNameTrailing}
                  </Box>
                ) : null}
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

function hasLowRatingCount(ballkid) {
  const count = Number(ballkid.num_ratings);
  return Number.isFinite(count) && count <= NUM_RATINGS_WARNING_THRESHOLD;
}

function CalibratedRankPill({ ballkid }) {
  if (ballkid.rank === null || ballkid.rank === undefined || ballkid.rank === "") {
    return null;
  }
  // Pink when more than 5 ratings; gray when 5 or fewer (same as old app).
  const muted = hasLowRatingCount(ballkid);
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
  const muted = hasLowRatingCount(ballkid);
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

    case "checkout": {
      const value = ballkid?.checkout_comments ?? "End";
      if (!showLabel && value === "End") {
        return null;
      }
      return labeled(
        "Today's Checkout Time: ",
        <CheckoutTimePill ballkid={ballkid} hideWhenEnd={!showLabel} />
      );
    }

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
