import React from "react";
import Tooltip from "@mui/material/Tooltip";

import { DraggableBallkidAndIcon } from "./Utils";
import "./ballkid-chip.css";

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

export function renderBallkidChipDragSurface({
  ref,
  isDragging,
  children,
  hoverHandlers,
  dense = true,
}) {
  return (
    <div
      ref={ref}
      className={`ballkid-chip${dense ? " ballkid-chip--dense" : ""}${
        isDragging ? " is-dragging" : ""
      }`}
      {...(hoverHandlers || {})}
    >
      <BallkidChipHandle />
      {children}
    </div>
  );
}

export function DraggableBallkidChip({
  commentTypes = [],
  ...props
}) {
  return (
    <DraggableBallkidAndIcon
      layout="cut-chip"
      renderCustom={renderBallkidChipDragSurface}
      commentTypes={commentTypes}
      {...props}
    />
  );
}