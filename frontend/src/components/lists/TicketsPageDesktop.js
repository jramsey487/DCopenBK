import React, { useState, useEffect } from "react";
import { useDrop } from "react-dnd";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

import { getAuthHeader, Banners, useIsMobile, HelpIcon } from "../Utils";
import { ticketsPage } from "../HelpMessages";
import { TICKET_SESSIONS } from "../Consts";

function Sessions({ tickets, setUpdated }) {
  const isMobile = useIsMobile();

  return (
    <Grid container spacing={2}>
      {TICKET_SESSIONS.map((session) => (
        <Typography>{session}</Typography>
      ))}
    </Grid>
  );
}

export default function TicketsPageDesktop(props) {
  const [tickets, setTickets] = useState([]);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    fetch("/api/ticket-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTickets(data));
  }, []);

  return (
    <div className="page">
      <Banners />

      <Box className="sxs" sx={{ mb: 1 }}>
        <Typography variant="h4">Tournament Tickets</Typography>
        &thinsp;
        <HelpIcon page="Tournament Tickets" message={ticketsPage} />
      </Box>

      <Sessions tickets={tickets} setUpdated={setUpdated} />
    </div>
  );
}
