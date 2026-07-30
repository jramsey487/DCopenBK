import React, { useState, useEffect, useCallback } from "react";
import { useDrop } from "react-dnd";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";

import Dangerous from "@mui/icons-material/Dangerous";

import {
  filterBallkids,
  getAuthHeader,
  getLocalStorage,
  SearchAndFilter,
  ConfirmDialog,
  DraggableBallkidAndIcon,
  HelpIcon,
  Banners,
  Alerts,
  HovercardToggle,
} from "../Utils";
import {
  CUT_STATUSES,
  POSITIONS,
  ICON_DICT,
  TOOLTIP_DICT,
  SUPERVET_THRESHOLD,
  NUM_RATINGS_WARNING_THRESHOLD,
} from "../Consts";
import { cut } from "../HelpMessages";
import { renderTeamsChipDragSurface } from "../teams/TeamsChairpersonShared";
import "./cut-page-desktop.css";

export function patchCutBallkidInState(setActive, refetchActive, ballkid, patch) {
  setActive((prev) => {
    if (patch.is_cut === true) {
      return prev.filter((b) => b.id !== ballkid.id);
    }
    return prev.map((b) =>
      b.id === ballkid.id ? { ...b, ...patch } : b
    );
  });

  fetch("/api/update-ballkid", {
    method: "PATCH",
    headers: getAuthHeader(),
    body: JSON.stringify({
      first_name: ballkid.first_name,
      last_name: ballkid.last_name,
      ...patch,
    }),
  }).then((response) => {
    if (!response.ok) {
      refetchActive();
    }
  });
}

function hasCalibratedAverage(ballkid) {
  const avg = ballkid.calibrated_avg;
  if (avg === null || avg === undefined || avg === "") {
    return false;
  }
  const numericAvg = Number(avg);
  if (Number.isNaN(numericAvg)) {
    return false;
  }
  const numRatings = ballkid.num_ratings;
  if (
    numRatings !== null &&
    numRatings !== undefined &&
    numRatings !== ""
  ) {
    return Number(numRatings) > 0;
  }
  return numericAvg !== 0;
}

function cutCalibratedRankDisplay(ballkid) {
  if (hasCalibratedAverage(ballkid)) {
    return {
      label: "Calibrated average",
      value: Number(ballkid.calibrated_avg).toFixed(3),
    };
  }
  if (ballkid.rank !== null && ballkid.rank !== undefined && ballkid.rank !== "") {
    return {
      label: "Calibrated rank",
      value: String(ballkid.rank),
    };
  }
  return null;
}

function CalibratedRankPill({ ballkid }) {
  const display = cutCalibratedRankDisplay(ballkid);
  if (display == null) {
    return null;
  }
  const muted =
    display.label === "Calibrated average" &&
    ballkid.num_ratings <= NUM_RATINGS_WARNING_THRESHOLD;

  return (
    <Tooltip title={display.label} arrow>
      <span
        className={`cut-chip-pill cut-chip-pill--rank${
          muted ? " cut-chip-pill--muted" : ""
        }`}
      >
        {display.value}
      </span>
    </Tooltip>
  );
}

function LastDayPill({ ballkid }) {
  const label =
    ballkid.last_day === null ||
    ballkid.last_day === "" ||
    ballkid.last_day === "End"
      ? "End"
      : ballkid.last_day.length > 3
        ? ballkid.last_day.substring(0, 3)
        : ballkid.last_day;
  const isEnd = label === "End";

  return (
    <Tooltip title="Last day" arrow>
      <span
        className={`cut-chip-pill cut-chip-pill--last${
          isEnd ? " cut-chip-pill--muted" : ""
        }`}
      >
        {label}
      </span>
    </Tooltip>
  );
}

export function CutBallkidMeta({ ballkid, compact = false, dense = false }) {
  const group = getLocalStorage("group");
  const iconBadges = [];

  const addIcon = (key, icon, title) => {
    iconBadges.push(
      <Tooltip key={key} title={title} arrow>
        <span className="cut-chip-icon-badge">{icon}</span>
      </Tooltip>
    );
  };

  if (ballkid.is_chairperson) {
    addIcon("chair", ICON_DICT.chairperson, TOOLTIP_DICT.chairperson);
  }
  if (ballkid.is_captain) {
    addIcon("captain", ICON_DICT.captain, TOOLTIP_DICT.captain);
  }
  if (
    group !== "ballkid" &&
    ballkid.num_years_experience === 0 &&
    ballkid.is_out_of_town
  ) {
    addIcon("oot-rookie", ICON_DICT.outOfTownRookie, TOOLTIP_DICT.outOfTownRookie);
  } else if (group !== "ballkid" && ballkid.is_out_of_town) {
    addIcon("oot", ICON_DICT.outOfTownBallkid, TOOLTIP_DICT.outOfTownBallkid);
  }
  if (group !== "ballkid" && ballkid.num_years_experience === 0) {
    addIcon("rookie", ICON_DICT.rookie, TOOLTIP_DICT.rookie);
  }
  if (ballkid.num_years_experience > SUPERVET_THRESHOLD) {
    addIcon("supervet", ICON_DICT.supervet, TOOLTIP_DICT.supervet);
  }

  if (compact) {
    return (
      <div className="cut-chip-meta-row">
        <CalibratedRankPill ballkid={ballkid} />
        <LastDayPill ballkid={ballkid} />
      </div>
    );
  }

  return (
    <div className="cut-chip-meta-row">
      {iconBadges.length > 0 ? (
        <div className="cut-chip-icon-group">{iconBadges}</div>
      ) : null}
      {ballkid.num_years_experience > 0 ? (
        <Tooltip title="Years at Citi Open" arrow>
          <span className="cut-chip-pill cut-chip-pill--yrs">
            {dense
              ? ballkid.num_years_experience
              : `${ballkid.num_years_experience} yr`}
          </span>
        </Tooltip>
      ) : null}
      <CalibratedRankPill ballkid={ballkid} />
      <LastDayPill ballkid={ballkid} />
    </div>
  );
}

export function CutBallkidRow({
  ballkid,
  showHovercard,
  hoverCommentTypes,
  actions,
  compactMeta = false,
  dense = true,
}) {
  return (
    <div
      className={`teams-chairperson-ballkid-row cut-ballkid-row${
        dense ? " cut-ballkid-row--dense" : ""
      }`}
    >
      <div className="teams-chairperson-ballkid-chip-wrap">
        <DraggableBallkidAndIcon
          ballkid={ballkid}
          layout="cut-chip"
          showHovercard={showHovercard}
          hoverCommentTypes={hoverCommentTypes}
          metaSlot={
            <CutBallkidMeta
              ballkid={ballkid}
              compact={compactMeta}
              dense={dense}
            />
          }
          renderCustom={(props) =>
            renderTeamsChipDragSurface({
              ...props,
              dense: true,
              hoverHandlers: showHovercard ? props.hoverHandlers : null,
            })
          }
        />
      </div>
      {actions ? (
        <div className="teams-chairperson-ballkid-actions cut-ballkid-row__actions">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

function CutBallkidGrid({ ballkids, ...rowProps }) {
  return (
    <div className="teams-chairperson-unassigned-grid cut-page-chip-grid">
      {ballkids.map((ballkid) => (
        <CutBallkidRow
          key={ballkid.id}
          ballkid={ballkid}
          dense
          {...rowProps}
        />
      ))}
    </div>
  );
}

function CutBallkidStack({ ballkids, actionsForBallkid, ...rowProps }) {
  return (
    <div className="cut-page-chip-list">
      {ballkids.map((ballkid) => (
        <CutBallkidRow
          key={ballkid.id}
          ballkid={ballkid}
          dense
          actions={
            actionsForBallkid ? actionsForBallkid(ballkid) : undefined
          }
          {...rowProps}
        />
      ))}
    </div>
  );
}

export function CutStatusSection({
  section,
  active,
  showHovercard,
  patchCutBallkid,
  refetchActive,
}) {
  const [open, setOpen] = useState(false);

  const shouldCut = section.includes("Cut") ? true : false;
  const cutAllStr = section.includes("Cut") ? "Cut All" : "Keep All";
  const cutAllColor = section.includes("Cut") ? "error" : "success";
  const cutAllVariant = section.includes("Cut") ? "contained" : "outlined";

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) => {
      patchCutBallkid(ballkid, { cut_status: section });
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Grid item xs={12} sm={12} md={6} lg={6} xl={3} ref={dropRef}>
      <ConfirmDialog
        message={`You are about to cut all ${active.length} ballkid${
          active.length > 1 ? "s" : ""
        }. This will be publicly visible to all ballkids and captains.`}
        url={"/api/cut-all"}
        body={{
          cut_status: section,
          should_cut: true,
        }}
        open={open}
        setOpen={setOpen}
        setUpdated={refetchActive}
      />

      <Card 
        sx={{ 
          mb: 2, 
          borderRadius: "16px",
          transition: "all 0.2s ease-in-out",
          border: isOver ? "2px solid #2563eb" : "1px solid",
          borderColor: isOver ? "primary.main" : "divider",
          boxShadow: isOver ? "0 10px 25px -5px rgba(0, 0, 0, 0.05)" : "0 1px 3px 0 rgba(0, 0, 0, 0.02)"
        }} 
        elevation={0}
      >
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <div className="justify" style={{ alignItems: "center" }}>
            <div className="sxs" style={{ alignItems: "baseline" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.05rem", color: "#1e293b", fontFamily: "Inter, sans-serif" }}>
                {section}
              </Typography>
              &ensp;
              <Typography variant="subtitle1" sx={{ opacity: 0.5, fontWeight: 600, fontSize: "0.85rem", fontFamily: "Inter, sans-serif" }}>
                ({active.length})
              </Typography>
            </div>
            <Button
              size="small"
              color={cutAllColor}
              variant={cutAllVariant}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px", px: 2, fontFamily: "Inter, sans-serif" }}
              onClick={(e) => {
                shouldCut
                  ? setOpen(true)
                  : fetch("/api/cut-all", {
                      method: "PATCH",
                      headers: getAuthHeader(),
                      body: JSON.stringify({
                        cut_status: section,
                        should_cut: shouldCut,
                      }),
                    })
                      .then((response) => response.json())
                      .then(() => refetchActive());
              }}
            >
              {cutAllStr}
            </Button>
          </div>

          {POSITIONS.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1.5, mb: 1.5, opacity: 0.6 }} />
              <div className="sxs" style={{ alignItems: "center" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.8px", fontFamily: "Inter, sans-serif" }}>
                  {position}s
                </Typography>
                <Typography variant="caption" sx={{ ml: 1, opacity: 0.5, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>
                  (
                  {
                    active.filter((ballkid) =>
                      ballkid.preferred_position.startsWith(position)
                    ).length
                  }
                  )
                </Typography>
              </div>
              <Box sx={{ mt: 1 }}>
                {renderBallkidsInSection(
                  active.filter((ballkid) => ballkid.cut_status === section),
                  section,
                  position,
                  showHovercard,
                  patchCutBallkid
                )}
              </Box>
            </div>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

export function renderBallkidsInSection(
  active,
  section,
  position,
  showHovercard,
  patchCutBallkid
) {
  const rows = active.filter((ballkid) =>
    ballkid.preferred_position.startsWith(position)
  );

  return (
    <CutBallkidStack
      ballkids={rows}
      compactMeta={section === "Self-Cut"}
      showHovercard={showHovercard}
      hoverCommentTypes={[
        "experience",
        "rank",
        "calibrated_avg",
        "last_day",
      ]}
      actionsForBallkid={(ballkid) =>
        !section.includes("Cut") ? null : (
          <Tooltip title="Cut">
            <IconButton
              size="small"
              sx={{
                p: 0.6,
                borderRadius: "8px",
                "&:hover": { backgroundColor: "rgba(220, 38, 38, 0.08)" },
              }}
              onClick={() => {
                patchCutBallkid(ballkid, {
                  is_cut: true,
                  self_cut: section === "Self-Cut",
                });
              }}
            >
              <Dangerous color="error" sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )
      }
    />
  );
}

function ActiveSection({ active, showHovercard, patchCutBallkid }) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) => {
      patchCutBallkid(ballkid, { cut_status: "" });
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Box
      component={Paper}
      ref={dropRef}
      elevation={0}
      className="cut-page-active-panel"
      sx={{
        p: 3,
        borderRadius: "16px",
        border: isOver ? "2px solid #2563eb" : "1px solid",
        borderColor: isOver ? "primary.main" : "divider",
        backgroundColor: "background.paper",
        boxShadow: isOver
          ? "0 10px 25px -5px rgba(13, 27, 62, 0.08)"
          : "0 1px 3px 0 rgba(13, 27, 62, 0.04)",
      }}
    >
      <Box
        className="sxs"
        sx={{
          mt: 0,
          mb: 2,
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          pb: 1.5,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.15rem", color: "#1e293b", fontFamily: "Inter, sans-serif" }}>
          Active Ballkids
        </Typography>
        &ensp;
        <Typography variant="body1" sx={{ opacity: 0.5, fontWeight: 600, fontSize: "0.95rem", fontFamily: "Inter, sans-serif" }}>
          ({active.length})
        </Typography>
      </Box>

      <Box sx={{ mb: 2.5, width: "100%" }}>
        <SearchAndFilter
          setSearchKeyword={setSearchKeyword}
          filterGroup={filterGroup}
          setFilterGroup={setFilterGroup}
          filters={["rookie", "supervet", "captain", "back", "net"]}
        />
      </Box>

      {POSITIONS.map((position) => {
        const filtered = filterBallkids(
          active,
          searchKeyword,
          filterGroup
        ).filter((ballkid) => ballkid.preferred_position.startsWith(position));
        return (
          <div key={position}>
            <div className="cut-page-section-label">
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  fontSize: "0.7rem",
                  letterSpacing: "0.08em",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {position}s
              </Typography>
              <Typography
                variant="caption"
                sx={{ opacity: 0.55, fontWeight: 600, fontFamily: "Inter, sans-serif" }}
              >
                ({filtered.length})
              </Typography>
            </div>

            {active.length === 0 ? (
              <Typography sx={{ opacity: 0.7, py: 1, fontSize: "0.9rem", fontFamily: "Inter, sans-serif" }}>
                There are currently no active ballkids left to categorize.
              </Typography>
            ) : (
              <CutBallkidGrid
                ballkids={filtered}
                showHovercard={showHovercard}
                hoverCommentTypes={[
                  "experience",
                  "rank",
                  "calibrated_avg",
                  "last_day",
                ]}
              />
            )}
          </div>
        );
      })}
    </Box>
  );
}

export function renderCopyButtons(active, emails, setSuccessMsg) {
  const buttonSx = {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "10px",
    px: 1.5,
    fontFamily: "Inter, sans-serif",
    whiteSpace: "nowrap",
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        onClick={() => {
          const names = active
            .filter(
              (ballkid) =>
                ballkid.cut_status === "Definitely Keep" ||
                ballkid.cut_status === "Possibly Keep" ||
                ballkid.cut_status === ""
            )
            .map((ballkid) => `${ballkid.first_name} ${ballkid.last_name}`)
            .join("\n");
          navigator.clipboard.writeText(names);
          setSuccessMsg("Successfully copied non-cut ballkid names!");
        }}
      >
        Copy all keep ballkid names
      </Button>
      <Button
        size="small"
        variant="outlined"
        sx={buttonSx}
        onClick={() => {
          navigator.clipboard.writeText(emails);
          setSuccessMsg(
            "Successfully copied all currently active, non-cut ballkid emails!"
          );
        }}
      >
        Copy all ballkid emails
      </Button>
    </>
  );
}

export function SelfCutCard({
  active,
  showHovercard,
  patchCutBallkid,
  refetchActive,
}) {
  const selfCut = active.filter((ballkid) => ballkid.cut_status === "Self-Cut");
  const [open, setOpen] = useState(false);

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) => {
      patchCutBallkid(ballkid, { cut_status: "Self-Cut" });
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Grid item xs={12} sm={12} md={6} lg={6} xl={3} ref={dropRef}>
      <ConfirmDialog
        message={`You are about to cut all ${selfCut.length} ballkid${
          selfCut.length > 1 ? "s" : ""
        }. This will be publicly visible to all ballkids and captains.`}
        url={"/api/cut-all"}
        body={{
          should_cut: true,
          self_cut: true,
        }}
        open={open}
        setOpen={setOpen}
        setUpdated={refetchActive}
      />

      <Card 
        sx={{ 
          mb: 2, 
          borderRadius: "16px",
          border: isOver ? "2px solid #dc2626" : "1px solid",
          borderColor: isOver ? "error.main" : "divider",
          boxShadow: isOver ? "0 10px 25px -5px rgba(0, 0, 0, 0.05)" : "0 1px 3px 0 rgba(0, 0, 0, 0.02)"
        }} 
        elevation={0}
      >
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <div className="justify" style={{ alignItems: "center" }}>
            <div className="sxs" style={{ alignItems: "baseline" }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.05rem", color: "#1e293b", fontFamily: "Inter, sans-serif" }}>
                Self-Cut
              </Typography>
              &ensp;
              <Typography variant="subtitle1" sx={{ opacity: 0.5, fontWeight: 600, fontSize: "0.85rem", fontFamily: "Inter, sans-serif" }}>
                ({selfCut.length})
              </Typography>
            </div>

            <Button
              size="small"
              color="error"
              variant="contained"
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px", px: 2, fontFamily: "Inter, sans-serif" }}
              onClick={(e) => setOpen(true)}
            >
              Cut All
            </Button>
          </div>

          {POSITIONS.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1.5, mb: 1.5, opacity: 0.6 }} />
              <div className="sxs" style={{ alignItems: "center" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.8px", fontFamily: "Inter, sans-serif" }}>
                  {position}s
                </Typography>
                <Typography variant="caption" sx={{ ml: 1, opacity: 0.5, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>
                  (
                  {
                    selfCut.filter((ballkid) =>
                      ballkid.preferred_position.startsWith(position)
                    ).length
                  }
                  )
                </Typography>
              </div>
              <Box sx={{ mt: 1 }}>
                {renderBallkidsInSection(
                  selfCut,
                  "Self-Cut",
                  position,
                  showHovercard,
                  patchCutBallkid
                )}
              </Box>
            </div>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

export default function CutPageDesktop(props) {
  const [active, setActive] = useState([]);
  const [emails, setEmails] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showHovercard, setShowHovercard] = useState(true);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const sections = Object.keys(CUT_STATUSES).map((key) => CUT_STATUSES[key]);

  const refetchActive = useCallback(() => setRefreshKey((k) => k + 1), []);

  const patchCutBallkid = useCallback(
    (ballkid, patch) =>
      patchCutBallkidInState(setActive, refetchActive, ballkid, patch),
    [refetchActive]
  );

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) =>
        setActive(
          data.filter((ballkid) => !ballkid.is_cut && !ballkid.is_chairperson)
        )
      );

    fetch("/api/emails-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setEmails(data["emails"]));
  }, [refreshKey]);

  return (
    <div className="page ballkid-list-page cut-page">
      <Banners />

      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />

      <Box className="cut-page-top-bar">
        <Box className="cut-page-top-bar__title">
          <Typography
            className="ballkid-list-title"
            variant="h4"
            component="h1"
          >
            Cut Page
          </Typography>
          <HelpIcon page="Cut" message={cut} />
        </Box>

        <Box className="cut-page-top-bar__end">
          <Box className="cut-page-top-bar__actions">
            {renderCopyButtons(active, emails, setSuccessMsg)}
          </Box>

          <Box className="cut-page-top-bar__toolbar-pills">
            <HovercardToggle
              enabled={showHovercard}
              setEnabled={setShowHovercard}
            />
          </Box>
        </Box>
      </Box>

      <Grid container className="justify-top cut-page-columns" spacing={3}>
        <Grid
          item
          sm={12}
          md={7}
          lg={7}
          xl={8}
          style={{ maxHeight: "85vh", overflow: "auto" }}
        >
          <Grid container spacing={2}>
            {sections.map((section) => (
              <CutStatusSection
                key={section}
                section={section}
                active={active.filter(
                  (ballkid) => ballkid.cut_status === section
                )}
                showHovercard={showHovercard}
                patchCutBallkid={patchCutBallkid}
                refetchActive={refetchActive}
              />
            ))}

            <SelfCutCard
              active={active}
              showHovercard={showHovercard}
              patchCutBallkid={patchCutBallkid}
              refetchActive={refetchActive}
            />
          </Grid>
        </Grid>

        <Grid
          item
          sm={12}
          md={5}
          lg={5}
          xl={4}
          style={{ maxHeight: "85vh", overflow: "auto" }}
        >
          <ActiveSection
            active={active.filter((ballkid) => ballkid.cut_status === "")}
            showHovercard={showHovercard}
            patchCutBallkid={patchCutBallkid}
          />
        </Grid>
      </Grid>
    </div>
  );
}