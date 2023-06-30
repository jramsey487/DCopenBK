import React, { useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Link as RouterLink } from "react-router-dom";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";

import Close from "@mui/icons-material/Close";
import SwapVert from "@mui/icons-material/SwapVert";

import {
  getAuthHeader,
  Icons,
  Alerts,
  HideShowToggle,
  isCurrentHour,
  CourtAssignment,
  useIsMobile,
  CheckoutConfirmDialog,
} from "../Utils";
import { ON_COURT_GREEN, MARGINS } from "../Consts";

export function DraggableBallkidAndIcon(props) {
  const ballkid = props.ballkid;
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ballkid",
    item: { ...ballkid },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="sxs">
        <Link
          variant="body2"
          component={RouterLink}
          to={`/ballkid/${ballkid.id}`}
        >
          {ballkid.first_name} {ballkid.last_name}
        </Link>
        &thinsp;
        <Icons ballkid={ballkid} margin={0} />
      </div>
    </div>
  );
}

function renderSwitchButton(ballkid, setUpdated) {
  return (
    <Button
      variant="outlined"
      size="small"
      onClick={(e) => {
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
          .then(() => setUpdated(true));
      }}
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

function renderBallkidsOnTeam(ballkids, position, setUpdated) {
  return (
    <div>
      {ballkids.map((ballkid) =>
        ballkid.position === position ? (
          <div key={`ballkid${ballkid.id}`} className="justify">
            {<DraggableBallkidAndIcon ballkid={ballkid} />}

            <div className="sxs">
              {!ballkid.preferred_position.includes("/")
                ? ""
                : renderSwitchButton(ballkid, setUpdated)}

              {renderUnassignButton(ballkid, setUpdated)}
            </div>
          </div>
        ) : (
          ""
        )
      )}
    </div>
  );
}

function renderClearButton(team, setUpdated) {
  return (
    <Button
      size="small"
      onClick={(e) => {
        fetch("/api/clear-team", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            current_team: team,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      Clear
    </Button>
  );
}

function renderCheckoutTeamButton(setOpen) {
  return (
    <Button size="small" color="error" onClick={() => setOpen(true)}>
      Check Out All
    </Button>
  );
}

function renderTeamCardHeader(team, assigned, nextShifts, setOpen, setUpdated) {
  return (
    <div>
      <div className="justify">
        <div className="sxs">
          <Typography variant="h6">Team {team}</Typography>
          <Typography variant="subtitle1" sx={{ ml: 1 }}>
            ({assigned.length})
          </Typography>
        </div>

        {assigned.length === 0 ? "" : renderClearButton(team, setUpdated)}
      </div>

      <div className="justify">
        <CourtAssignment nextShifts={nextShifts} />

        {assigned.length === 0 ? "" : renderCheckoutTeamButton(setOpen)}
      </div>
    </div>
  );
}

function Team({ team, assigned, nextShifts, isMobile, isNewTeam, setUpdated }) {
  const positions = ["Net", "Back"];
  const isCurrentlyOn =
    nextShifts.length > 0 && isCurrentHour(nextShifts[0]["start"]);

  const [open, setOpen] = useState(false);

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
      <CheckoutConfirmDialog
        message={`You are about to check out all ${assigned.length} ballkid${
          assigned.length > 1 ? "s" : ""
        } on Team ${team}.`}
        group={team}
        open={open}
        setOpen={setOpen}
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
              setOpen,
              setUpdated
            )}

            {positions.map((position) => (
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
                  assigned.filter((ballkid) => ballkid.current_team === team),
                  position,
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

  return assigned.length > 0 ? (
    <Grid container spacing={2}>
      {teams.map((team) => (
        <Team
          key={team}
          team={team}
          assigned={assigned.filter((ballkid) => ballkid.current_team === team)}
          nextShifts={nextShifts.filter((shift) => shift.team === team)}
          isMobile={isMobile}
          isNewTeam={false}
          setUpdated={setUpdated}
        />
      ))}
      {isMobile ? (
        ""
      ) : (
        <Team
          team={parseInt(teams.slice(-1)) + 1}
          assigned={[]}
          nextShifts={[]}
          isMobile={isMobile}
          isNewTeam={true}
          setUpdated={setUpdated}
        />
      )}
    </Grid>
  ) : (
    <Typography variant="body1">
      There are currently no teams assigned.
    </Typography>
  );
}

export function Header() {
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <div>
      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />
      <div className="justify" style={{ marginBottom: 10 }}>
        <Typography variant="h4">Current Teams</Typography>
        <HideShowToggle
          teamType=""
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </div>
    </div>
  );
}
