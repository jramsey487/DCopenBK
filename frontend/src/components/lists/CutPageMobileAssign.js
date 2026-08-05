import React, { useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { BallkidAndIcon, CommentsText, ConfirmDialog, getAuthHeader } from "../Utils";
import { CutDecisionSectionList, compareCutPageBallkids } from "./CutPageDesktop";

export const CUT_ASSIGN_LABELS = {
  "Definitely Keep": "Def. keep",
  "Possibly Keep": "Poss. keep",
  "Possibly Cut": "Poss. cut",
  "Definitely Cut": "Def. cut",
  "Self-Cut": "Self-cut",
  "": "Active",
};

function sectionButtonColor(section) {
  switch (section) {
    case "Definitely Keep":
      return "success";
    case "Possibly Keep":
      return "primary";
    case "Possibly Cut":
      return "warning";
    case "Definitely Cut":
    case "Self-Cut":
      return "error";
    default:
      return "inherit";
  }
}

function preferredPositionLabel(ballkid) {
  const pos = ballkid.preferred_position || "";
  if (pos.includes("/")) {
    return pos;
  }
  if (pos) {
    return pos;
  }
  return "—";
}

function assignButtonLines(status) {
  if (status === "") {
    return ["Active"];
  }
  if (status === "Self-Cut") {
    return ["Self", "Cut"];
  }
  const space = status.indexOf(" ");
  if (space === -1) {
    return [status];
  }
  return [status.slice(0, space), status.slice(space + 1)];
}

function CutMobileAssignButtonLabel({ status }) {
  const lines = assignButtonLines(status);
  return (
    <span className="cut-mobile-assign-btn__label">
      {lines.map((line) => (
        <span key={line} className="cut-mobile-assign-btn__line">
          {line}
        </span>
      ))}
    </span>
  );
}

/** Active (uncategorized) ballkids only — full meta + assign buttons */
export function CutMobileAssignTable({
  ballkids,
  assignOptions,
  onAssign,
  assignColumnTitle = "Assign",
  commentTypes = ["experience", "rank"],
}) {
  const [assigningId, setAssigningId] = useState(null);

  if (ballkids.length === 0) {
    return null;
  }

  const handleAssign = (ballkid, status) => {
    setAssigningId(ballkid.id);
    Promise.resolve(onAssign(ballkid, status)).finally(() =>
      setAssigningId(null)
    );
  };

  return (
    <div className="cut-mobile-assign-table-scroll">
      <div className="teams-mobile-unassigned-table cut-mobile-assign-table">
        <div className="teams-mobile-unassigned-table__head">
          <span>Name</span>
          <span className="cut-mobile-assign-table__head-pos">Pos.</span>
          <span className="cut-mobile-assign-table__head-assign">
            {assignColumnTitle}
          </span>
        </div>

        {ballkids.map((ballkid) => (
          <div key={ballkid.id} className="teams-mobile-unassigned-table__row">
            <div className="teams-mobile-unassigned-table__name cut-mobile-assign-table__name">
              <BallkidAndIcon ballkid={ballkid} />
              <div className="badge-row">
                {commentTypes.map((commentType) => (
                  <CommentsText
                    key={commentType}
                    ballkid={ballkid}
                    commentType={commentType}
                  />
                ))}
              </div>
            </div>
            <div className="teams-mobile-unassigned-table__position">
              {preferredPositionLabel(ballkid)}
            </div>
            <div className="teams-mobile-unassigned-assign-col cut-mobile-assign-col">
              {assignOptions.map((option) => (
                <Tooltip
                  key={`${ballkid.id}-${option.status}-tip`}
                  title={option.status === "" ? "Active" : option.status}
                  arrow
                >
                  <span className="cut-mobile-assign-btn-wrap">
                    <Button
                      size="small"
                      variant="outlined"
                      color={option.color || sectionButtonColor(option.status)}
                      disabled={assigningId === ballkid.id}
                      className="teams-mobile-assign-team-btn cut-mobile-assign-btn"
                      aria-label={
                        option.status === "" ? "Active" : option.status
                      }
                      onClick={() => handleAssign(ballkid, option.status)}
                    >
                      <CutMobileAssignButtonLabel status={option.status} />
                    </Button>
                  </span>
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function buildCutAssignOptions({
  sections,
  currentStatus,
  includeSelfCut = true,
}) {
  const options = [];

  sections.forEach((section) => {
    if (section !== currentStatus) {
      options.push({
        status: section,
        label: CUT_ASSIGN_LABELS[section] || section,
        color: sectionButtonColor(section),
      });
    }
  });

  if (includeSelfCut && currentStatus !== "Self-Cut") {
    options.push({
      status: "Self-Cut",
      label: CUT_ASSIGN_LABELS["Self-Cut"],
      color: "error",
    });
  }

  return options;
}

export function CutStatusSectionMobile({
  section,
  active,
  patchCutBallkid,
  refetchActive,
}) {
  const [open, setOpen] = useState(false);
  const shouldCut = section.includes("Cut");
  const cutAllStr = shouldCut ? "Cut all" : "Keep all";
  const cutAllColor = shouldCut ? "error" : "success";
  const cutAllVariant = shouldCut ? "contained" : "outlined";

  const sorted = [...active].sort(compareCutPageBallkids);

  return (
    <Card elevation={0} sx={{ mb: 2, borderRadius: "16px", border: "1px solid", borderColor: "divider" }}>
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

      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
            mb: active.length ? 1.5 : 0,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
            {section}{" "}
            <Typography component="span" sx={{ opacity: 0.5, fontWeight: 600 }}>
              ({active.length})
            </Typography>
          </Typography>
          {active.length === 0 ? (
            ""
          ) : (
            <Button
              size="small"
              color={cutAllColor}
              variant={cutAllVariant}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px" }}
              onClick={() => {
                if (shouldCut) {
                  setOpen(true);
                } else {
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
                }
              }}
            >
              {cutAllStr}
            </Button>
          )}
        </Box>

        {active.length === 0 ? (
          <Typography sx={{ opacity: 0.7, fontSize: "0.9rem" }}>
            No ballkids in this category.
          </Typography>
        ) : (
          <CutDecisionSectionList
            ballkids={sorted}
            section={section}
            patchCutBallkid={patchCutBallkid}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function SelfCutCardMobile({
  active,
  patchCutBallkid,
  refetchActive,
}) {
  const selfCut = active.filter((ballkid) => ballkid.cut_status === "Self-Cut");
  const [open, setOpen] = useState(false);

  const sorted = [...selfCut].sort(compareCutPageBallkids);

  return (
    <Card
      elevation={0}
      sx={{
        mb: 2,
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "error.light",
      }}
    >
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

      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
            mb: selfCut.length ? 1.5 : 0,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
            Self-Cut{" "}
            <Typography component="span" sx={{ opacity: 0.5, fontWeight: 600 }}>
              ({selfCut.length})
            </Typography>
          </Typography>
          {selfCut.length === 0 ? (
            ""
          ) : (
            <Button
              size="small"
              color="error"
              variant="contained"
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px" }}
              onClick={() => setOpen(true)}
            >
              Cut all
            </Button>
          )}
        </Box>

        {selfCut.length === 0 ? (
          <Typography sx={{ opacity: 0.7, fontSize: "0.9rem" }}>
            No self-cut ballkids.
          </Typography>
        ) : (
          <CutDecisionSectionList
            ballkids={sorted}
            section="Self-Cut"
            patchCutBallkid={patchCutBallkid}
          />
        )}
      </CardContent>
    </Card>
  );
}