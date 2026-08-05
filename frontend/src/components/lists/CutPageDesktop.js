import React, { useState, useEffect, useCallback } from "react";
import { useDrop } from "react-dnd";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";

import Dangerous from "@mui/icons-material/Dangerous";

import {
  filterBallkids,
  getAuthHeader,
  SearchAndFilter,
  ConfirmDialog,
  HelpIcon,
  Banners,
  Alerts,
  HovercardToggle,
} from "../Utils";
import {
  CUT_STATUSES,
  POSITIONS,
} from "../Consts";
import { cut } from "../HelpMessages";
import { DraggableBallkidRow } from "../BallkidChip";
import "./cut-page-desktop.css";
import "../ballkid-badges.css";
import "../ballkid-row.css";

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

/** Cut page list order: years of experience (desc), then calibrated rank (asc). */
export function compareCutPageBallkids(a, b) {
  const yoeDiff =
    (b.num_years_experience ?? 0) - (a.num_years_experience ?? 0);
  if (yoeDiff !== 0) {
    return yoeDiff;
  }

  const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
  const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
  if (rankA !== rankB) {
    return rankA - rankB;
  }

  return `${a.last_name} ${a.first_name}`.localeCompare(
    `${b.last_name} ${b.first_name}`
  );
}

const CUT_HOVER_COMMENT_TYPES = [
  "experience",
  "rank",
  "calibrated_avg",
  "last_day",
];

function cutCommentTypesForSection(section) {
  return section === "Self-Cut"
    ? ["last_day"]
    : ["experience", "rank", "last_day"];
}

function CutBallkidGrid({ ballkids, ...rowProps }) {
  const midpoint = Math.ceil(ballkids.length / 2);
  const leftColumn = ballkids.slice(0, midpoint);
  const rightColumn = ballkids.slice(midpoint);

  return (
    <div className="cut-page-two-columns">
      <div className="cut-page-two-columns__col">
        {leftColumn.map((ballkid) => (
          <DraggableBallkidRow
            key={ballkid.id}
            ballkid={ballkid}
            dense
            {...rowProps}
          />
        ))}
      </div>
      <div className="cut-page-two-columns__col">
        {rightColumn.map((ballkid) => (
          <DraggableBallkidRow
            key={ballkid.id}
            ballkid={ballkid}
            dense
            {...rowProps}
          />
        ))}
      </div>
    </div>
  );
}

function CutBallkidStack({ ballkids, actionsForBallkid, ...rowProps }) {
  return (
    <div className="cut-page-chip-list">
      {ballkids.map((ballkid) => (
        <DraggableBallkidRow
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
          <div style={{ display: "flex", alignItems: "center", flexWrap: "nowrap", gap: 8, width: "100%" }}>
            <Box
              sx={{
                minWidth: 0,
                flex: "1 1 auto",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              <Typography
                component="span"
                variant="h6"
                sx={{
                  display: "inline",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  color: "#1e293b",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {section}
              </Typography>
              {" "}
              <Typography
                component="span"
                variant="subtitle1"
                sx={{
                  opacity: 0.5,
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                ({active.length})
              </Typography>
            </Box>
            <Button
              size="small"
              color={cutAllColor}
              variant={cutAllVariant}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "10px",
                px: 2,
                fontFamily: "Inter, sans-serif",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
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
          <CutDecisionSectionList
            ballkids={active}
            section={section}
            showHovercard={showHovercard}
            patchCutBallkid={patchCutBallkid}
          />
        </CardContent>
      </Card>
    </Grid>
  );
}

export function CutDecisionSectionList({
  ballkids,
  section,
  showHovercard = false,
  patchCutBallkid,
}) {
  const sorted = [...ballkids].sort(compareCutPageBallkids);

  return (
    <CutBallkidStack
      ballkids={sorted}
      commentTypes={cutCommentTypesForSection(section)}
      showHovercard={showHovercard}
      hoverCommentTypes={CUT_HOVER_COMMENT_TYPES}
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
      className="cut-page-active-panel teams-chairperson-unassigned-panel"
      sx={{
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
          mb: 1.5,
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

      <Typography
        className="teams-chairperson-drop-hint"
        variant="body2"
        sx={{ color: "#64748b", mb: 2, fontSize: "0.8rem", lineHeight: 1.45 }}
      >
        Drag ballkids onto a decision card to categorize them, or drop here to return them to Active.
      </Typography>

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
                ballkids={[...filtered].sort(compareCutPageBallkids)}
                commentTypes={["experience", "rank", "last_day"]}
                showHovercard={showHovercard}
                hoverCommentTypes={CUT_HOVER_COMMENT_TYPES}
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
          <div style={{ display: "flex", alignItems: "center", flexWrap: "nowrap", gap: 8, width: "100%" }}>
            <Box
              sx={{
                minWidth: 0,
                flex: "1 1 auto",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              <Typography
                component="span"
                variant="h6"
                sx={{
                  display: "inline",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  color: "#1e293b",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Self-Cut
              </Typography>
              {" "}
              <Typography
                component="span"
                variant="subtitle1"
                sx={{
                  opacity: 0.5,
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                ({selfCut.length})
              </Typography>
            </Box>
            <Button
              size="small"
              color="error"
              variant="contained"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "10px",
                px: 2,
                fontFamily: "Inter, sans-serif",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onClick={(e) => setOpen(true)}
            >
              Cut All
            </Button>
          </div>

          <CutDecisionSectionList
            ballkids={selfCut}
            section="Self-Cut"
            showHovercard={showHovercard}
            patchCutBallkid={patchCutBallkid}
          />
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