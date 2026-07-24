import React, { useState, useEffect } from "react";
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

import RemoveCircleOutline from "@mui/icons-material/RemoveCircleOutline";
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
  renderSwitch,
} from "../Utils";
import {
  CUT_STATUSES,
  POSITIONS,
  ICON_DICT,
  TOOLTIP_DICT,
  NUM_RATINGS_WARNING_THRESHOLD,
} from "../Consts";
import { cut } from "../HelpMessages";
import "./cut-page-desktop.css";

function CutDragHandle() {
  return (
    <div className="cut-ballkid-chip__handle" aria-hidden="true">
      <div className="cut-ballkid-chip__handle-dots">
        {[...Array(6)].map((_, i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}

function renderCutChipDragSurface({ ref, isDragging, children, dense = false }) {
  return (
    <div
      ref={ref}
      className={`cut-ballkid-chip${dense ? " cut-ballkid-chip--dense" : ""}${
        isDragging ? " is-dragging" : ""
      }`}
    >
      <CutDragHandle />
      {children}
    </div>
  );
}

function cutLastDayLabel(ballkid) {
  const day = ballkid.last_day;
  if (day === "End" || day == null || day === "") {
    return null;
  }
  return day.length > 3 ? day.substring(0, 3) : day;
}

function CutBallkidMeta({ ballkid, compact = false, dense = false }) {
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

  const lastDay = cutLastDayLabel(ballkid);
  const rank = ballkid.rank;
  const showRank = rank !== null && rank !== undefined && rank !== "";
  const lowRatings =
    ballkid.num_ratings != null &&
    ballkid.num_ratings <= NUM_RATINGS_WARNING_THRESHOLD;

  if (compact) {
    return lastDay ? (
      <div className="cut-chip-meta-row">
        <Tooltip title="Last day" arrow>
          <span className="cut-chip-pill cut-chip-pill--last">{lastDay}</span>
        </Tooltip>
      </div>
    ) : null;
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
      {showRank ? (
        <Tooltip title="Calibrated rank" arrow>
          <span
            className={`cut-chip-pill cut-chip-pill--rank${
              lowRatings ? " cut-chip-pill--muted" : ""
            }`}
          >
            {dense ? rank : `#${rank}`}
          </span>
        </Tooltip>
      ) : null}
      {lastDay ? (
        <Tooltip title="Last day" arrow>
          <span className="cut-chip-pill cut-chip-pill--last">{lastDay}</span>
        </Tooltip>
      ) : null}
    </div>
  );
}

function CutBallkidRow({
  ballkid,
  showHovercard,
  hoverCommentTypes,
  actions,
  compactMeta = false,
  dense = false,
}) {
  return (
    <div className={`cut-ballkid-row${dense ? " cut-ballkid-row--dense" : ""}`}>
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
          renderCutChipDragSurface({ ...props, dense })
        }
      />
      {actions ? (
        <div className="cut-ballkid-row__actions">{actions}</div>
      ) : null}
    </div>
  );
}

function TwoColumnBallkidList({ ballkids, dense, ...rowProps }) {
  const half = Math.ceil(ballkids.length / 2);
  const columns = [ballkids.slice(0, half), ballkids.slice(half)];

  return (
    <div className="cut-page-two-columns">
      {columns.map((column, colIdx) =>
        column.length === 0 ? null : (
          <div key={colIdx} className="cut-page-two-columns__col">
            {column.map((ballkid) => (
              <CutBallkidRow
                key={ballkid.id}
                ballkid={ballkid}
                dense={dense}
                {...rowProps}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

export function CutStatusSection({
  section,
  active,
  showHovercard,
  setUpdated,
}) {
  const [open, setOpen] = useState(false);

  const shouldCut = section.includes("Cut") ? true : false;
  const cutAllStr = section.includes("Cut") ? "Cut All" : "Keep All";
  const cutAllColor = section.includes("Cut") ? "error" : "success";
  const cutAllVariant = section.includes("Cut") ? "contained" : "outlined";

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          cut_status: section,
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true)),
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
        setUpdated={setUpdated}
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
                      .then(() => setUpdated(true));
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
                  setUpdated
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
  setUpdated
) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {active.map((ballkid) =>
        !ballkid.preferred_position.startsWith(position) ? (
          ""
        ) : (
          <CutBallkidRow
            key={`ballkid${ballkid.id}`}
            ballkid={ballkid}
            dense
            compactMeta={section === "Self-Cut"}
            showHovercard={showHovercard}
            hoverCommentTypes={["experience", "rank", "last_day"]}
            actions={
              <>
                {section === "Self-Cut" ? (
                  ""
                ) : (
                  <Tooltip title="Uncategorize">
                    <IconButton
                      size="small"
                      sx={{
                        p: 0.6,
                        borderRadius: "8px",
                        "&:hover": { backgroundColor: "rgba(37, 99, 235, 0.08)" },
                      }}
                      onClick={() => {
                        fetch("/api/update-ballkid", {
                          method: "PATCH",
                          headers: getAuthHeader(),
                          body: JSON.stringify({
                            first_name: ballkid.first_name,
                            last_name: ballkid.last_name,
                            cut_status: "",
                          }),
                        })
                          .then((response) => response.json())
                          .then(() => setUpdated(true));
                      }}
                    >
                      <RemoveCircleOutline color="primary" sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                )}

                {!section.includes("Cut") ? (
                  ""
                ) : (
                  <Tooltip title="Cut">
                    <IconButton
                      size="small"
                      sx={{
                        p: 0.6,
                        borderRadius: "8px",
                        "&:hover": { backgroundColor: "rgba(220, 38, 38, 0.08)" },
                      }}
                      onClick={() => {
                        fetch("/api/update-ballkid", {
                          method: "PATCH",
                          headers: getAuthHeader(),
                          body: JSON.stringify({
                            first_name: ballkid.first_name,
                            last_name: ballkid.last_name,
                            is_cut: true,
                            self_cut: section === "Self-Cut",
                          }),
                        })
                          .then((response) => response.json())
                          .then(() => setUpdated(true));
                      }}
                    >
                      <Dangerous color="error" sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            }
          />
        )
      )}
    </Box>
  );
}

function ActiveSection({ active, showHovercard, setUpdated }) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          cut_status: "",
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true)),
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
              <TwoColumnBallkidList
                ballkids={filtered}
                dense
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

export function SelfCutCard({ updated, showHovercard, setUpdated }) {
  const [selfCut, setSelfCut] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/self-cut-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setSelfCut(data));
  }, [updated]);

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          cut_status: "Self-Cut",
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true)),
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
        setUpdated={setUpdated}
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
                  setUpdated
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
  const [updated, setUpdated] = useState(false);
  const [showHovercard, setShowHovercard] = useState(true);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const sections = Object.keys(CUT_STATUSES).map((key) => CUT_STATUSES[key]);

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
      .then((data) => setEmails(data["emails"]))
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page ballkid-list-page">
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

          <Box className="cut-page-top-bar__switch">
            {renderSwitch(
              showHovercard,
              setShowHovercard,
              "Disable Hovercard",
              "Enable Hovercard"
            )}
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
                setUpdated={setUpdated}
              />
            ))}

            <SelfCutCard
              updated={updated}
              showHovercard={showHovercard}
              setUpdated={setUpdated}
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
            setUpdated={setUpdated}
          />
        </Grid>
      </Grid>
    </div>
  );
}