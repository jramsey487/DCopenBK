import React, { useEffect, useState } from "react";
import { useDrag } from "react-dnd";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";

import {
  BallkidLink,
  BallkidPopover,
  CommentsText,
  Icons,
  ballkidIconNodes,
} from "./Utils";
import "./ballkid-chip.css";
import "./ballkid-row.css";

export function BallkidChipHandle() {
  return (
    <Tooltip title="Drag to reassign" enterDelay={400}>
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

/**
 * Shared draggable ballkid row for teams / finals / cut.
 * Configure per-view metadata with commentTypes / hoverCommentTypes;
 * pass optional trailing actions (unassign, cut, etc.).
 */
export function DraggableBallkidRow({
  ballkid,
  commentTypes = [],
  showHovercard = false,
  hoverCommentTypes = [],
  actions = null,
  dense = true,
}) {
  const [anchorEl, setAnchorEl] = useState(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ballkid",
    item: { ...ballkid },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

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
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rowClass}>
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
        />
      ) : null}
    </div>
  );
}

/** Split a ballkid list into two equal columns (cut active / teams unassigned). */
export function DraggableBallkidRowTwoColumns({ ballkids, ...rowProps }) {
  const midpoint = Math.ceil(ballkids.length / 2);
  const leftColumn = ballkids.slice(0, midpoint);
  const rightColumn = ballkids.slice(midpoint);

  return (
    <div className="ballkid-row-two-columns">
      <div className="ballkid-row-two-columns__col ballkid-row-list">
        {leftColumn.map((ballkid) => (
          <DraggableBallkidRow
            key={ballkid.id}
            ballkid={ballkid}
            {...rowProps}
          />
        ))}
      </div>
      <div className="ballkid-row-two-columns__col ballkid-row-list">
        {rightColumn.map((ballkid) => (
          <DraggableBallkidRow
            key={ballkid.id}
            ballkid={ballkid}
            {...rowProps}
          />
        ))}
      </div>
    </div>
  );
}
