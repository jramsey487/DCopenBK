import React, { useState, useEffect } from "react";
import { useDrop } from "react-dnd";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";

import Close from "@mui/icons-material/Close";
import SwapVert from "@mui/icons-material/SwapVert";

import {
  getAuthHeader,
  DraggableBallkidAndIcon,
  Alerts,
  HideShowToggle,
  isCurrentHour,
  CourtAssignment,
  useIsMobile,
  ConfirmDialog,
  HelpIcon,
} from "../Utils";
import { ON_COURT_GREEN, MARGINS, POSITIONS } from "../Consts";
import { teams } from "../HelpMessages.js";

function renderSwitchButton(ballkid, setUpdated) {
  return (
    <Button
      variant="outlined"
      size="small"
      onClick={(e) =>
        fetch("/api/update-ballkid", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            first_name: ballkid.first_name,
            last_name: ballkid.last_name,
            position: ballkid.position === "Back" ? "Net" : "Back",
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true))
      }
      sx={{ minWidth: 0 }}
    >
      <SwapVert />
    </Button>
  );
}

function renderUnassignButton(ballkid, setUpdated) {
  return (
    <IconButton
      size="small"
      onClick={(e) => {
        fetch("/api/update-ballkid", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            first_name: ballkid.first_name,
            last_name: ballkid.last_name,
            current_team: 0,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      <Close />
    </IconButton>
  );
}

function renderBallkidsOnTeam(ballkids, setUpdated) {
  return (
    <div>
      {ballkids.map((ballkid) => (
        <div key={`ballkid${ballkid.id}`} className="justify">
          {<DraggableBallkidAndIcon ballkid={ballkid} />}

          <div className="sxs">
            {!ballkid.preferred_position.includes("/")
              ? ""
              : renderSwitchButton(ballkid, setUpdated)}

            {renderUnassignButton(ballkid, setUpdated)}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderTeamCardHeader(
  team,
  assigned,
  nextShifts,
  setCheckoutOpen,
  setClearOpen
) {
  return (
    <div>
      <div className="justify">
        <div className="sxs">
          <Typography variant="h6">Team {team}</Typography>
          <Typography variant="subtitle1" sx={{ ml: 1 }}>
            ({assigned.length})
          </Typography>
        </div>

        {assigned.length === 0 ? (
          ""
        ) : (
          <Button size="small" onClick={(e) => setClearOpen(true)}>
            Clear
          </Button>
        )}
      </div>

      <div className="justify">
        <CourtAssignment nextShifts={nextShifts} />

        {assigned.length === 0 ? (
          ""
        ) : (
          <Button
            size="small"
            color="error"
            onClick={() => setCheckoutOpen(true)}
          >
            Check Out All
          </Button>
        )}
      </div>
    </div>
  );
}

function Team({ team, assigned, nextShifts, setUpdated, isNewTeam = false }) {
  const isCurrentlyOn =
    nextShifts.length > 0 && isCurrentHour(nextShifts[0]["start"]);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const isMobile = useIsMobile();

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          current_team: team,
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Grid
      item
      xs={12}
      sm={isMobile ? 6 : 12}
      md={6}
      lg={4}
      xl={3}
      ref={dropRef}
    >
      <ConfirmDialog
        message={`You are about to check out all ${assigned.length} ballkid${
          assigned.length > 1 ? "s" : ""
        } on Team ${team}.`}
        url={"/api/checkout-all"}
        body={{
          checkout_group: team,
        }}
        open={checkoutOpen}
        setOpen={setCheckoutOpen}
        setUpdated={setUpdated}
      />

      <ConfirmDialog
        message={`You are about to clear Team ${team} and unassign all ${
          assigned.length
        } ballkid${assigned.length > 1 ? "s" : ""}.`}
        url={"/api/clear-team"}
        body={{
          current_team: team,
        }}
        open={clearOpen}
        setOpen={setClearOpen}
        setUpdated={setUpdated}
      />

      <Card
        sx={{
          mb: 1,
          backgroundColor: isCurrentlyOn ? ON_COURT_GREEN : "",
          borderWidth: isNewTeam ? 1 : 0,
          borderStyle: "dashed",
          borderColor: "gray",
        }}
        elevation={isOver ? 10 : isNewTeam ? 0 : 1}
      >
        {isNewTeam ? (
          <CardContent>
            <Typography variant="h6">
              {isNewTeam ? "New Team" : `Team ${team}`}
            </Typography>
          </CardContent>
        ) : (
          <CardContent>
            {renderTeamCardHeader(
              team,
              assigned,
              nextShifts,
              setCheckoutOpen,
              setClearOpen
            )}

            {POSITIONS.map((position) => (
              <div key={position}>
                <Divider sx={{ my: 1 }} />
                <div className="sxs">
                  <Typography variant="subtitle1">{position}s</Typography>
                  <Typography variant="subtitle2" sx={{ ml: 1 }}>
                    (
                    {
                      assigned.filter(
                        (ballkid) => ballkid.position === position
                      ).length
                    }
                    )
                  </Typography>
                </div>
                {renderBallkidsOnTeam(
                  assigned.filter((ballkid) => ballkid.position === position),
                  setUpdated
                )}
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </Grid>
  );
}

export function renderCheckoutUnassignedButton(setOpen) {
  return (
    <Button
      variant="outlined"
      size="small"
      color="error"
      sx={MARGINS}
      onClick={() => setOpen(true)}
    >
      Check Out All
    </Button>
  );
}

export function Teams({ assigned, teams, nextShifts, setUpdated }) {
  const isMobile = useIsMobile();

  return (
    <Grid container spacing={2}>
      {teams.map((team) => (
        <Team
          key={team}
          team={team}
          assigned={assigned.filter((ballkid) => ballkid.current_team === team)}
          nextShifts={nextShifts.filter((shift) => shift.team === team)}
          setUpdated={setUpdated}
        />
      ))}

      {isMobile ? (
        ""
      ) : (
        <Team
          team={teams.length === 0 ? 1 : parseInt(teams.slice(-1)) + 1}
          assigned={[]}
          nextShifts={[]}
          setUpdated={setUpdated}
          isNewTeam={true}
        />
      )}
    </Grid>
  );
}

export function Header() {
  const [showTeams, setShowTeams] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setShowTeams(data["show_teams"]));
  });

  return (
    <div>
      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />
      <Box className="justify" sx={{ mb: 1 }}>
        <Box className="sxs">
          <Typography variant="h4">Current Teams</Typography>
          &thinsp;
          <HelpIcon page="Teams" message={teams} />
        </Box>

        <HideShowToggle
          teamType=""
          showTeams={showTeams}
          setShowTeams={setShowTeams}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </Box>
    </div>
  );
}
