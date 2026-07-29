import React from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { DraggableBallkidAndIcon, HelpIcon } from "../Utils";

export function TeamsDragHandle() {
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

export function renderTeamsChipDragSurface({
  ref,
  isDragging,
  children,
  hoverHandlers,
  dense = true,
}) {
  return (
    <div
      ref={ref}
      className={`cut-ballkid-chip${dense ? " cut-ballkid-chip--dense" : ""}${
        isDragging ? " is-dragging" : ""
      }`}
      {...(hoverHandlers || {})}
    >
      <TeamsDragHandle />
      {children}
    </div>
  );
}

export function TeamsDraggableBallkid(props) {
  return (
    <DraggableBallkidAndIcon
      layout="cut-chip"
      renderCustom={renderTeamsChipDragSurface}
      {...props}
    />
  );
}

export function TeamsPageTopBar({ title, helpPage, helpMessage, controls = null }) {
  return (
    <Box className="cut-page-top-bar" sx={{ mb: 2 }}>
      <Box className="cut-page-top-bar__title">
        <Typography className="ballkid-list-title" variant="h4" component="h1">
          {title}
        </Typography>
        <HelpIcon page={helpPage} message={helpMessage} />
      </Box>
      {controls ? (
        <Box className="cut-page-top-bar__end">
          <Box className="teams-page-top-bar__controls">{controls}</Box>
        </Box>
      ) : null}
    </Box>
  );
}

export function TeamsChairpersonPageHeader({
  title,
  helpPage,
  helpMessage,
  alerts = null,
  toolbar = null,
  actions = null,
}) {
  const hasEnd = Boolean(toolbar || actions);

  return (
    <header className="teams-chairperson-page-header">
      {alerts}
      <Box className="cut-page-top-bar" sx={{ mb: 2 }}>
        <Box className="cut-page-top-bar__title">
          <Typography className="ballkid-list-title" variant="h4" component="h1">
            {title}
          </Typography>
          <HelpIcon page={helpPage} message={helpMessage} />
        </Box>
        {hasEnd ? (
          <Box className="cut-page-top-bar__end">
            {actions ? (
              <Box className="cut-page-top-bar__actions">{actions}</Box>
            ) : null}
            {toolbar ? (
              <Box className="teams-page-top-bar__controls">{toolbar}</Box>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </header>
  );
}
