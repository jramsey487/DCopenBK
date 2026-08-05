import React, { useState, useEffect } from "react";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";

import AddCircle from "@mui/icons-material/AddCircle";
import Done from "@mui/icons-material/Done";
import Close from "@mui/icons-material/Close";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Delete from "@mui/icons-material/Delete";
import KeyboardDoubleArrowDown from "@mui/icons-material/KeyboardDoubleArrowDown";
import KeyboardDoubleArrowUp from "@mui/icons-material/KeyboardDoubleArrowUp";

import {
  getAuthHeader,
  Banners,
  useIsMobile,
  HelpIcon,
  BallkidLink,
} from "../Utils";
import { ticketsPage } from "../HelpMessages";
import { TICKET_LIMIT, TICKET_SESSIONS } from "../Consts";

function Ticket({ ticket, ticketRepr, setUpdated }) {
  const ticketDict = {
    requested: <RadioButtonUnchecked color="primary" />,
    granted: <CheckCircleOutline color="secondary" />,
    delivered: <CheckCircle color="success" />,
  };

  return (
    <IconButton
      size="small"
      sx={{ p: 0.1 }}
      onClick={(e) => {
        fetch("/api/update-ticket", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            session: ticket.session,
            ballkidId: ticket.ballkid,
            action: "tick",
            oldState: ticketRepr,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      {ticketDict[ticketRepr]}
    </IconButton>
  );
}

function toTicketRepr(ticket) {
  const numDelivered = ticket.num_delivered;
  const deltaNumGranted = ticket.num_granted - ticket.num_delivered;
  const deltaNumRequested = ticket.num_requested - ticket.num_granted;

  const ticketRepr = [
    ...Array(numDelivered).fill("delivered"),
    ...Array(deltaNumGranted).fill("granted"),
    ...Array(deltaNumRequested).fill("requested"),
  ];

  return ticketRepr;
}

function AddTicketRequest({ session, ballkidsList, setUpdated }) {
  const [ballkid, setBallkid] = useState(null);
  const [numTickets, setNumTickets] = useState("");

  const [adding, setAdding] = useState(false);

  return !adding ? (
    <IconButton
      size="small"
      sx={{ p: 0.5, pl: 0 }}
      onClick={() => setAdding(true)}
    >
      <AddCircle />
    </IconButton>
  ) : (
    <Box className="sxs">
      <Autocomplete
        disablePortal
        openOnFocus
        required
        sx={{ width: 250 }}
        options={ballkidsList}
        value={ballkid}
        onChange={(e, newVal) => {
          setBallkid(newVal);
        }}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={(params) => (
          <TextField {...params} variant="standard" required />
        )}
      />
      <TextField
        select
        required
        value={numTickets}
        variant="standard"
        sx={{ mx: 1 }}
        style={{ minWidth: 30 }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onChange={(e) => setNumTickets(e.target.value)}
      >
        {[...Array(5).keys()].map((value) => (
          <MenuItem key={value} value={value + 1}>
            {value + 1}
          </MenuItem>
        ))}
      </TextField>

      <IconButton
        size="small"
        disabled={!ballkid || !numTickets}
        sx={{ ml: 2 }}
        onClick={() =>
          fetch("/api/update-ticket", {
            method: "POST",
            headers: getAuthHeader(),
            body: JSON.stringify({
              session: session,
              ballkidId: ballkid.id,
              numTickets: numTickets,
            }),
          }).then(() => {
            setAdding(false);
            setBallkid(null);
            setNumTickets("");
            setUpdated(true);
          })
        }
      >
        <Tooltip title="Save">
          <Done />
        </Tooltip>
      </IconButton>

      <IconButton
        size="small"
        onClick={() => {
          setBallkid(null);
          setNumTickets("");
          setAdding(false);
        }}
      >
        <Tooltip title="Cancel">
          <Close />
        </Tooltip>
      </IconButton>
    </Box>
  );
}

function Session({ session, tickets, ballkidsList, setUpdated }) {
  const isMobile = useIsMobile();

  const alreadyRequested = tickets.map((ticket) => ticket.ballkid);

  return (
    <Grid item xs={12} sm={isMobile ? 6 : 12} md={6} lg={4} xl={3}>
      <Card sx={{ mb: 1 }} elevation={1}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {session}
          </Typography>
          {tickets.map((ticket) => (
            <Box key={`${session}_${ticket.ballkid}`} className="justify">
              <Box className="sxs">
                <Box sx={{ mr: 2 }}>
                  <IconButton
                    size="small"
                    sx={{ p: 0.1 }}
                    disabled={ticket.order === 1}
                    onClick={() =>
                      fetch("/api/update-ticket", {
                        method: "PATCH",
                        headers: getAuthHeader(),
                        body: JSON.stringify({
                          session: ticket.session,
                          ballkidId: ticket.ballkid,
                          action: "reorder",
                          direction: "up",
                        }),
                      })
                        .then((response) => response.json())
                        .then(() => setUpdated(true))
                    }
                  >
                    <KeyboardDoubleArrowUp
                      color={ticket.order === 1 ? "" : "primary"}
                    />
                  </IconButton>
                  <IconButton
                    size="small"
                    sx={{ p: 0.1 }}
                    onClick={() =>
                      fetch("/api/update-ticket", {
                        method: "PATCH",
                        headers: getAuthHeader(),
                        body: JSON.stringify({
                          session: ticket.session,
                          ballkidId: ticket.ballkid,
                          action: "reorder",
                          direction: "down",
                        }),
                      })
                        .then((response) => response.json())
                        .then(() => setUpdated(true))
                    }
                  >
                    <KeyboardDoubleArrowDown color="primary" />
                  </IconButton>
                </Box>
                <Typography variant="subtitle2" sx={{ mr: 2 }}>
                  {ticket.order}
                </Typography>
                <BallkidLink id={ticket.ballkid} name={ticket.ballkid_name} />
                <Typography
                  className={
                    ticket.num_tickets < TICKET_LIMIT
                      ? undefined
                      : "ticket-count--hot"
                  }
                  sx={{ mx: 1, px: 0.5, my: 0.1 }}
                  variant="body2"
                >
                  {ticket.num_tickets}
                </Typography>
              </Box>
              <Box className="sxs">
                {toTicketRepr(ticket).map((ticketRepr, i) => (
                  <Ticket
                    key={`${ticket.session}_${ticket.ballkid}_${i}`}
                    ticket={ticket}
                    ticketRepr={ticketRepr}
                    setUpdated={setUpdated}
                  />
                ))}
                <IconButton
                  size="small"
                  sx={{ p: 0.1, ml: 1 }}
                  onClick={() =>
                    fetch("/api/update-ticket", {
                      method: "DELETE",
                      headers: getAuthHeader(),
                      body: JSON.stringify({
                        session: ticket.session,
                        ballkidId: ticket.ballkid,
                      }),
                    })
                      .then((response) => response.json())
                      .then(() => setUpdated(true))
                  }
                >
                  <Delete />
                </IconButton>
              </Box>
            </Box>
          ))}
          <AddTicketRequest
            session={session}
            ballkidsList={ballkidsList.filter(
              (ballkid) => !alreadyRequested.includes(ballkid.id)
            )}
            setUpdated={setUpdated}
          />
        </CardContent>
      </Card>
    </Grid>
  );
}

function Sessions({ tickets, setUpdated }) {
  const [ballkidsList, setBallkidsList] = useState([]);

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) =>
        setBallkidsList(
          data.map((ballkid) => ({
            label: ballkid.first_name + " " + ballkid.last_name,
            id: ballkid.id,
          }))
        )
      );
  }, []);

  return (
    <Grid container spacing={2}>
      {TICKET_SESSIONS.map((session) => (
        <Session
          key={session}
          session={session}
          tickets={tickets.filter((ticket) => ticket.session === session)}
          ballkidsList={ballkidsList}
          setUpdated={setUpdated}
        />
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
      .then((data) => setTickets(data))
      .then(() => setUpdated(false));
  }, [updated]);

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
