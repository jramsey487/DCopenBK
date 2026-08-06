import React, { useState, useEffect, useCallback } from "react";
import { useDrop } from "react-dnd";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";

import Dangerous from "@mui/icons-material/Dangerous";
import RemoveCircleOutline from "@mui/icons-material/RemoveCircleOutline";

import {
  filterBallkids,
  getAuthHeader,
  SearchAndFilter,
  ConfirmDialog,
  Banners,
  Alerts,
  HovercardToggle,
} from "../Utils";
import {
  CUT_STATUSES,
  POSITIONS,
} from "../Consts";
import { cut } from "../HelpMessages";
import { DraggableBallkidRow, DraggableBallkidRowTwoColumns, sortBallkidsByBoardOrder } from "../BallkidChip";
import { TeamsChairpersonPageHeader } from "../teams/TeamsChairpersonShared";
import "../teams/teams-page.css";
import "../ballkid-row.css";

/** Shared decision / Self-Cut card chrome matching teams chairperson cards. */
export function CutDecisionCard({
  title,
  count,
  isOver = false,
  dropRef = null,
  action = null,
  emptyMessage = null,
  dialog = null,
  children,
  className = "",
}) {
  const cardClass = [
    "team-card",
    "teams-chairperson-card",
    "cut-decision-card",
    isOver ? "is-drop-over" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={dropRef} className={cardClass}>
      {dialog}
      <div className="team-card-head">
        <div className="team-card-title-group">
          <span className="team-card-title">{title}</span>
          <span className="team-card-count">({count})</span>
        </div>
        {action ? (
          <div className="teams-chairperson-head-actions">{action}</div>
        ) : null}
      </div>
      <div className="team-card-body">
        {count === 0 && emptyMessage ? (
          <div className="team-position-empty">{emptyMessage}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function CutBulkActionButton({ shouldCut, onClick, label }) {
  return (
    <Button
      size="small"
      variant="outlined"
      className={
        shouldCut
          ? "teams-chairperson-team-btn teams-chairperson-team-btn--checkout-team"
          : "teams-chairperson-team-btn teams-chairperson-team-btn--end"
      }
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

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

function CutBallkidStack({
  ballkids,
  actionsForBallkid,
  setUpdated = null,
  dropAssign = null,
  dropGroupBy = null,
  ...rowProps
}) {
  const ordered = sortBallkidsByBoardOrder(ballkids);
  return (
    <div className="cut-page-chip-list ballkid-row-list">
      {ordered.map((ballkid) => (
        <DraggableBallkidRow
          key={ballkid.id}
          ballkid={ballkid}
          dense
          setUpdated={setUpdated}
          dropAssign={dropAssign}
          dropGroupBy={dropGroupBy}
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
  emptyMessage = null,
}) {
  const [open, setOpen] = useState(false);
  const shouldCut = section.includes("Cut");
  const cutAllStr = shouldCut ? "Cut All" : "Keep All";

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid, monitor) => {
      if (monitor.didDrop()) {
        return;
      }
      patchCutBallkid(ballkid, { cut_status: section });
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
  });

  return (
    <CutDecisionCard
      title={section}
      count={active.length}
      isOver={isOver}
      dropRef={dropRef}
      emptyMessage={emptyMessage}
      dialog={
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
      }
      action={
        active.length === 0 && emptyMessage ? null : (
          <CutBulkActionButton
            shouldCut={shouldCut}
            label={cutAllStr}
            onClick={() => {
              if (shouldCut) {
                setOpen(true);
                return;
              }
              fetch("/api/cut-all", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  cut_status: section,
                  should_cut: false,
                }),
              })
                .then((response) => response.json())
                .then(() => refetchActive());
            }}
          />
        )
      }
    >
      <CutDecisionSectionList
        ballkids={active}
        section={section}
        showHovercard={showHovercard}
        patchCutBallkid={patchCutBallkid}
        setUpdated={refetchActive}
      />
    </CutDecisionCard>
  );
}

export function CutDecisionSectionList({
  ballkids,
  section,
  showHovercard = false,
  patchCutBallkid,
  setUpdated = null,
}) {
  const canCut = section.includes("Cut");

  return (
    <CutBallkidStack
      ballkids={ballkids}
      commentTypes={cutCommentTypesForSection(section)}
      showHovercard={showHovercard}
      hoverCommentTypes={CUT_HOVER_COMMENT_TYPES}
      setUpdated={setUpdated}
      dropAssign={{ cut_status: section }}
      dropGroupBy={["cut_status"]}
      actionsForBallkid={(ballkid) => (
        <div className="teams-chairperson-ballkid-actions">
          <Tooltip title="Unassign">
            <IconButton
              size="small"
              sx={{ p: 0.5 }}
              onClick={() => patchCutBallkid(ballkid, { cut_status: "" })}
            >
              <RemoveCircleOutline
                className="teams-chairperson-ballkid-action-icon"
                color="primary"
              />
            </IconButton>
          </Tooltip>
          {canCut ? (
            <Tooltip title="Cut">
              <IconButton
                size="small"
                sx={{ p: 0.5 }}
                onClick={() => {
                  patchCutBallkid(ballkid, {
                    is_cut: true,
                    self_cut: section === "Self-Cut",
                  });
                }}
              >
                <Dangerous
                  className="teams-chairperson-ballkid-action-icon"
                  color="error"
                />
              </IconButton>
            </Tooltip>
          ) : null}
        </div>
      )}
    />
  );
}

function ActiveSection({ active, showHovercard, patchCutBallkid, refetchActive }) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid, monitor) => {
      if (monitor.didDrop()) {
        return;
      }
      patchCutBallkid(ballkid, { cut_status: "" });
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
  });

  const filteredCount = filterBallkids(active, searchKeyword, filterGroup).length;

  return (
    <Box
      component={Paper}
      ref={dropRef}
      elevation={0}
      className={[
        "ballkid-pool-panel",
        "teams-chairperson-unassigned-panel",
        "cut-page-active-panel",
        isOver ? "is-drop-over" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Box className="ballkid-pool-panel__head teams-chairperson-unassigned-panel__head">
        <Box className="sxs" sx={{ alignItems: "center", gap: 0.5 }}>
          <span className="teams-chairperson-unassigned-title">
            Active Ballkids
          </span>
          <span className="teams-chairperson-unassigned-count">
            ({filteredCount})
          </span>
        </Box>
      </Box>

      <Typography className="teams-chairperson-drop-hint" variant="body2">
        Drag ballkids onto a decision card to categorize them, or drop here to
        return them to Active.
      </Typography>

      <Box className="ballkid-pool-panel__search teams-chairperson-unassigned-search">
        <SearchAndFilter
          stacked
          setSearchKeyword={setSearchKeyword}
          filterGroup={filterGroup}
          setFilterGroup={setFilterGroup}
          filters={["rookie", "supervet", "captain", "back", "net"]}
        />
      </Box>

      {active.length === 0 ? (
        <div className="team-position-empty">
          There are currently no active ballkids left to categorize.
        </div>
      ) : (
        POSITIONS.map((position) => {
          const ballkids = filterBallkids(
            active,
            searchKeyword,
            filterGroup
          ).filter((ballkid) =>
            ballkid.preferred_position.startsWith(position)
          );

          return (
            <div
              className="ballkid-pool-position-block teams-chairperson-position-block"
              key={position}
            >
              <div className="team-position-head cut-page-section-label">
                <span className="team-position-label">{position}s</span>
                <span className="team-position-count">({ballkids.length})</span>
              </div>

              {ballkids.length === 0 ? (
                <div className="team-position-empty">
                  No {position.toLowerCase()}s in this pool.
                </div>
              ) : (
                <DraggableBallkidRowTwoColumns
                  ballkids={ballkids}
                  commentTypes={["experience", "rank", "last_day"]}
                  showHovercard={showHovercard}
                  hoverCommentTypes={CUT_HOVER_COMMENT_TYPES}
                  setUpdated={refetchActive}
                  dropAssign={{ cut_status: "" }}
                  dropGroupBy={["cut_status"]}
                />
              )}
            </div>
          );
        })
      )}
    </Box>
  );
}

export function renderCopyButtons(active, emails, setSuccessMsg) {
  return (
    <Box className="teams-chairperson-actions" component="div">
      <Button
        size="small"
        variant="outlined"
        className="teams-chairperson-action-btn teams-chairperson-action-btn--unassign"
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
        className="teams-chairperson-action-btn teams-chairperson-action-btn--unassign"
        onClick={() => {
          navigator.clipboard.writeText(emails);
          setSuccessMsg(
            "Successfully copied all currently active, non-cut ballkid emails!"
          );
        }}
      >
        Copy all ballkid emails
      </Button>
    </Box>
  );
}

export function SelfCutCard({
  active,
  showHovercard,
  patchCutBallkid,
  refetchActive,
  emptyMessage = null,
}) {
  const selfCut = active.filter((ballkid) => ballkid.cut_status === "Self-Cut");
  const [open, setOpen] = useState(false);

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid, monitor) => {
      if (monitor.didDrop()) {
        return;
      }
      patchCutBallkid(ballkid, { cut_status: "Self-Cut" });
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
  });

  return (
    <CutDecisionCard
      title="Self-Cut"
      count={selfCut.length}
      isOver={isOver}
      dropRef={dropRef}
      emptyMessage={emptyMessage}
      dialog={
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
      }
      action={
        selfCut.length === 0 && emptyMessage ? null : (
          <CutBulkActionButton
            shouldCut
            label="Cut All"
            onClick={() => setOpen(true)}
          />
        )
      }
    >
      <CutDecisionSectionList
        ballkids={selfCut}
        section="Self-Cut"
        showHovercard={showHovercard}
        patchCutBallkid={patchCutBallkid}
        setUpdated={refetchActive}
      />
    </CutDecisionCard>
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
    <div className="page ballkid-list-page teams-page-shell teams-chairperson-page cut-page">
      <Banners />

      <TeamsChairpersonPageHeader
        title="Cut Page"
        helpPage="Cut"
        helpMessage={cut}
        alerts={
          <Alerts
            successMsg={successMsg}
            errorMsg={errorMsg}
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
          />
        }
        actions={renderCopyButtons(active, emails, setSuccessMsg)}
        toolbar={
          <HovercardToggle
            enabled={showHovercard}
            setEnabled={setShowHovercard}
          />
        }
      />

      <Grid container className="justify-top teams-chairperson-split" spacing={2}>
        <Grid
          item
          xs={12}
          md={7}
          lg={8}
          xl={9}
          className="teams-chairperson-main"
        >
          <div className="teams-page-grid teams-chairperson-teams-grid">
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
          </div>
        </Grid>

        <Grid
          item
          xs={12}
          md={5}
          lg={4}
          xl={3}
          className="teams-chairperson-sidebar ballkid-pool-panel-slot"
        >
          <ActiveSection
            active={active.filter((ballkid) => ballkid.cut_status === "")}
            showHovercard={showHovercard}
            patchCutBallkid={patchCutBallkid}
            refetchActive={refetchActive}
          />
        </Grid>
      </Grid>
    </div>
  );
}