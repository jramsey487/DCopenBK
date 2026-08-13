import React, { useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";

import {
  BallkidLink,
  BallkidPopover,
  CommentsText,
  Icons,
  ballkidIconNodes,
  getAuthHeader,
} from "./Utils";
import "./ballkid-chip.css";
import "./ballkid-row.css";

export function BallkidChipHandle() {
  return (
    <Tooltip title="Drag to reassign or reorder" enterDelay={400}>
      <div className="ballkid-chip__handle" aria-hidden="true">
        <div className="ballkid-chip__handle-dots">
          {[...Array(6)].map((_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>
    </Tooltip>
  );
}

function BallkidMetaIcons({ ballkid }) {
  if (ballkidIconNodes(ballkid).length === 0) {
    return null;
  }

  return (
    <span className="badge-item ballkid-meta-icons">
      <Icons ballkid={ballkid} margin={0} />
    </span>
  );
}

export function sortBallkidsByBoardOrder(ballkids) {
  return [...ballkids].sort((a, b) => {
    const orderDiff = (a.board_order ?? 0) - (b.board_order ?? 0);
    if (orderDiff !== 0) {
      return orderDiff;
    }
    const last = String(a.last_name || "").localeCompare(String(b.last_name || ""));
    if (last !== 0) {
      return last;
    }
    return String(a.first_name || "").localeCompare(String(b.first_name || ""));
  });
}

/**
 * Move / insert a ballkid before another row (or at end when beforeId is null).
 * assignFields e.g. { current_team: 2, position: "Net" }
 * groupBy e.g. ["current_team", "position"]
 */
export function reorderBallkid({
  ballkid,
  beforeId = null,
  assignFields = {},
  groupBy = null,
}) {
  const body = {
    ballkid_id: ballkid.id,
    before_id: beforeId,
    ...assignFields,
  };
  if (groupBy) {
    body.group_by = groupBy;
  }
  return fetch("/api/reorder-ballkids", {
    method: "PATCH",
    headers: getAuthHeader(),
    body: JSON.stringify(body),
  });
}

/**
 * Shared draggable ballkid row for teams / finals / cut.
 * When dropAssign / dropGroupBy are set, dropping another ballkid onto this
 * row inserts them before it (and applies assignment fields).
 */
export function DraggableBallkidRow({
  ballkid,
  commentTypes = [],
  showHovercard = false,
  hoverCommentTypes = [],
  actions = null,
  dense = true,
  setUpdated = null,
  dropAssign = null,
  dropGroupBy = null,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const rowRef = useRef(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ballkid",
    item: { ...ballkid },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  const canReorderDrop = Boolean(dropAssign && setUpdated);

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: "ballkid",
      canDrop: (item) => canReorderDrop && item.id !== ballkid.id,
      drop: (item, monitor) => {
        if (monitor.didDrop() || !canReorderDrop) {
          return;
        }
        reorderBallkid({
          ballkid: item,
          beforeId: ballkid.id,
          assignFields: dropAssign,
          groupBy: dropGroupBy,
        }).then(() => setUpdated(true));
        return { handled: true };
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
      }),
    }),
    [ballkid.id, canReorderDrop, dropAssign, dropGroupBy, setUpdated]
  );

  const setRowRef = (node) => {
    rowRef.current = node;
    if (canReorderDrop) {
      drop(node);
    }
  };

  const hoverHandlers = showHovercard
    ? {
        onMouseEnter: (e) => setAnchorEl(e.currentTarget),
        onMouseLeave: () => setAnchorEl(null),
      }
    : null;

  useEffect(() => {
    if (!showHovercard) {
      setAnchorEl(null);
    }
  }, [showHovercard]);

  const rowClass = [
    "ballkid-row",
    dense ? "ballkid-row--dense" : "",
    actions ? "" : "ballkid-row--fit",
    isOver && canDrop ? "is-drop-before" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={setRowRef} className={rowClass}>
      <div
        ref={drag}
        className={`ballkid-chip${dense ? " ballkid-chip--dense" : ""}${
          isDragging ? " is-dragging" : ""
        }`}
        {...(hoverHandlers || {})}
      >
        <BallkidChipHandle />
        <Box className="ballkid-chip__content" sx={{ flex: 1, minWidth: 0 }}>
          <Box className="ballkid-chip__name">
            <BallkidLink
              id={ballkid.id}
              name={`${ballkid.first_name} ${ballkid.last_name}`}
            />
          </Box>
          <Box className="ballkid-chip__meta">
            <div className="badge-row">
              <BallkidMetaIcons ballkid={ballkid} />
              {commentTypes.map((commentType) => (
                <CommentsText
                  key={commentType}
                  ballkid={ballkid}
                  commentType={commentType}
                />
              ))}
            </div>
          </Box>
        </Box>
      </div>
      {actions ? (
        <div className="ballkid-row__actions">{actions}</div>
      ) : null}
      {showHovercard ? (
        <BallkidPopover
          ballkid={ballkid}
          hoverCommentTypes={hoverCommentTypes}
          anchorEl={anchorEl}
          setAnchorEl={setAnchorEl}
          showChart
        />
      ) : null}
    </div>
  );
}

/** Split a ballkid list into two equal columns (cut active / teams unassigned). */
export function DraggableBallkidRowTwoColumns({
  ballkids,
  setUpdated = null,
  dropAssign = null,
  dropGroupBy = null,
  ...rowProps
}) {
  const ordered = sortBallkidsByBoardOrder(ballkids);
  const midpoint = Math.ceil(ordered.length / 2);
  const leftColumn = ordered.slice(0, midpoint);
  const rightColumn = ordered.slice(midpoint);

  return (
    <div className="ballkid-row-two-columns">
      <div className="ballkid-row-two-columns__col ballkid-row-list">
        {leftColumn.map((ballkid) => (
          <DraggableBallkidRow
            key={ballkid.id}
            ballkid={ballkid}
            setUpdated={setUpdated}
            dropAssign={dropAssign}
            dropGroupBy={dropGroupBy}
            {...rowProps}
          />
        ))}
      </div>
      <div className="ballkid-row-two-columns__col ballkid-row-list">
        {rightColumn.map((ballkid) => (
          <DraggableBallkidRow
            key={ballkid.id}
            ballkid={ballkid}
            setUpdated={setUpdated}
            dropAssign={dropAssign}
            dropGroupBy={dropGroupBy}
            {...rowProps}
          />
        ))}
      </div>
    </div>
  );
}
