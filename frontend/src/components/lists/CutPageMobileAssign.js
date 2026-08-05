import React, { useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";

import { BallkidAndIcon, CommentsText } from "../Utils";
import {
  CutStatusSection,
  SelfCutCard,
  compareCutPageBallkids,
} from "./CutPageDesktop";

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
  return (
    <CutStatusSection
      section={section}
      active={active}
      showHovercard={false}
      patchCutBallkid={patchCutBallkid}
      refetchActive={refetchActive}
      emptyMessage="No ballkids in this category."
    />
  );
}

export function SelfCutCardMobile({
  active,
  patchCutBallkid,
  refetchActive,
}) {
  return (
    <SelfCutCard
      active={active}
      showHovercard={false}
      patchCutBallkid={patchCutBallkid}
      refetchActive={refetchActive}
      emptyMessage="No self-cut ballkids."
    />
  );
}
