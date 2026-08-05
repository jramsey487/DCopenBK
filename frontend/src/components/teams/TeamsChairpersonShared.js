import React from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { HelpIcon } from "../Utils";

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
  titleExtra = null,
  titleEnd = null,
  alerts = null,
  toolbar = null,
  actions = null,
}) {
  const hasEnd = Boolean(toolbar || actions);

  return (
    <header className="teams-chairperson-page-header">
      {alerts}
      <Box className="cut-page-top-bar" sx={{ mb: 2 }}>
        <Box
          className={`cut-page-top-bar__title${
            titleEnd ? " cut-page-top-bar__title--with-end" : ""
          }`}
        >
          <Typography className="ballkid-list-title" variant="h4" component="h1">
            {title}
          </Typography>
          {titleExtra}
          <HelpIcon page={helpPage} message={helpMessage} />
          {titleEnd ? (
            <Box className="cut-page-top-bar__title-end">{titleEnd}</Box>
          ) : null}
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