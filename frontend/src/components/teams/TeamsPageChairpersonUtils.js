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
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import RemoveCircleOutline from "@mui/icons-material/RemoveCircleOutline";
import SwapVert from "@mui/icons-material/SwapVert";
import HighlightOff from "@mui/icons-material/HighlightOff";
import AutoAwesome from "@mui/icons-material/AutoAwesome";

import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

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
import {
  ON_COURT_GREEN,
  MARGINS,
  POSITIONS,
  TIMEOUT_MS,
  TARGET_NUM_BALLKIDS_PER_TEAM,
} from "../Consts";
import { teams } from "../HelpMessages.js";

function renderSwitchButton(ballkid, setUpdated) {
  return (
    <Tooltip title="Switch">
      <IconButton
        // variant="outlined"
        size="small"
        sx={{ p: 0.5 }}
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
      >
        <SwapVert color="secondary" />
      </IconButton>
    </Tooltip>
  );
}

function renderUnassignButton(ballkid, setUpdated) {
  return (
    <Tooltip title="Unassign">
      <IconButton
        size="small"
        sx={{ p: 0.5 }}
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
        <RemoveCircleOutline color="primary" />
      </IconButton>
    </Tooltip>
  );
}

function renderCheckoutButton(ballkid, setUpdated) {
  return (
    <Tooltip title="Check Out">
      <IconButton
        size="small"
        sx={{ p: 0.5 }}
        onClick={(e) => {
          fetch("/api/update-ballkid", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              first_name: ballkid.first_name,
              last_name: ballkid.last_name,
              is_checked_in: false,
            }),
          })
            .then((response) => response.json())
            .then(() => setUpdated(true));
        }}
      >
        <HighlightOff color="error" />
      </IconButton>
    </Tooltip>
  );
}

function renderBallkidsOnTeam(ballkids, setUpdated) {
  return (
    <div>
      {ballkids.map((ballkid) => (
        <div key={`ballkid${ballkid.id}`} className="justify">
          <DraggableBallkidAndIcon ballkid={ballkid} type={"checkout-teams"} />

          <div className="sxs">
            {!ballkid.preferred_position.includes("/")
              ? ""
              : renderSwitchButton(ballkid, setUpdated)}
            {renderUnassignButton(ballkid, setUpdated)}
            {renderCheckoutButton(ballkid, setUpdated)}
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
            End Team
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
        } on Team ${team} and delete all future shifts for Team ${team} from the schedule.`}
        url={"/api/checkout-all"}
        body={{
          checkout_group: team,
        }}
        open={checkoutOpen}
        setOpen={setCheckoutOpen}
        setUpdated={setUpdated}
      />

      <ConfirmDialog
        message={`You are about to clear Team ${team}, unassign all ${
          assigned.length
        } ballkid${
          assigned.length > 1 ? "s" : ""
        }, and delete all future shifts for Team ${team} from the schedule.`}
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

            {assigned.length === 0
              ? ""
              : POSITIONS.map((position) => (
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
                      assigned.filter(
                        (ballkid) => ballkid.position === position
                      ),
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
  const [tournament, setTournament] = useState();

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setTournament(data));
  }, []);

  return tournament === null || tournament === undefined ? (
    ""
  ) : (
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
          defaultShow={tournament["show_teams"]}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      </Box>
    </div>
  );
}

// function renderBalancedSlider(balanceCoeff, setBalanceCoeff) {
//   const marks = [
//     { value: 1, label: "More Balanced" },
//     { value: 2, label: "" },
//     { value: 3, label: "More Adjusted" },
//   ];

//   return (
//     <Box>
//       <DialogContentText sx={{ mt: 4, mb: 1, color: "black" }}>
//         How much should skill/experience be balanced across teams?
//       </DialogContentText>
//       <Box width="75%" sx={{ mx: "auto" }}>
//         <Slider
//           value={balanceCoeff}
//           valueLabelDisplay="off"
//           step={null}
//           marks={marks}
//           min={1}
//           max={3}
//           onChange={(e) => setBalanceCoeff(e.target.value)}
//         />
//       </Box>
//       <Box width="90%" sx={{ mx: "auto" }}>
//         <DialogContentText sx={{ mt: 1 }} variant="body2">
//           Note: More balanced teams will have similar levels of skill/experience
//           between main and outer courts. More adjusted teams will have a larger
//           disparity in skill/experience between main and outer courts.
//         </DialogContentText>
//       </Box>
//     </Box>
//   );
// }

// function renderRecreateToggle(shouldRecreate, setShouldRecreate) {
//   return (
//     <Box>
//       <DialogContentText sx={{ mt: 4, mb: 1, color: "black" }}>
//         Should existing teams be re-created?
//       </DialogContentText>
//       <Box width="75%" sx={{ mx: "auto" }}>
//         <Box className="sxs">
//           <Typography variant="body2" width="45%">
//             Keep existing teams; only assign unassigned ballkids
//           </Typography>
//           <Switch
//             checked={shouldRecreate}
//             onClick={(e) => setShouldRecreate(e.target.checked)}
//           />
//           <Typography variant="body2" width="45%">
//             Unassign all ballkids; re-create all teams
//           </Typography>
//         </Box>
//       </Box>
//     </Box>
//   );
// }

function CreateTeamsDialog({ open, setOpen, setUpdated }) {
  const [numTeams, setNumTeams] = useState(10);

  const [loading, setLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) =>
        setNumTeams(
          Math.min(
            10,
            Math.round(
              data.filter((ballkid) => ballkid.is_checked_in === true).length /
                TARGET_NUM_BALLKIDS_PER_TEAM
            )
          )
        )
      );
  }, []);

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
        Auto-create Teams
      </DialogTitle>

      <DialogContent>
        <Box className="sxs">
          <DialogContentText sx={{ my: 1, color: "black" }}>
            Enter number of teams to auto-create:
          </DialogContentText>

          <TextField
            value={numTeams}
            variant="standard"
            required
            InputProps={{
              inputProps: {
                style: { textAlign: "center" },
              },
            }}
            style={{ width: 25 }}
            sx={{ mx: 1 }}
            onChange={(e) => setNumTeams(e.target.value)}
          />
        </Box>

        {/* {renderRecreateToggle(shouldRecreate, setShouldRecreate)} */}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <LoadingButton
          loading={loading}
          onClick={() => {
            setLoading(true);

            fetch("/api/create-teams", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                numTeams: numTeams,
              }),
            })
              .then((response) => {
                if (response.ok) {
                  setUpdated(true);
                  setSuccessMsg("Teams auto-created!");
                  setTimeout(() => {
                    setOpen(false);
                    setSuccessMsg("");
                    setErrorMsg("");
                  }, TIMEOUT_MS);
                } else {
                  setErrorMsg("Error creating teams.");
                }
              })
              .then(() => setLoading(false));
          }}
        >
          Create
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export function ActionsButtons({ numAssigned, setUpdated }) {
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [unassignOpen, setUnassignOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <div>
      <CreateTeamsDialog
        open={teamsOpen}
        setOpen={setTeamsOpen}
        setUpdated={setUpdated}
      />

      <ConfirmDialog
        message={`You are about to unassign all currently assigned teams.`}
        url={"/api/clear-team"}
        body={{
          current_team: 0,
        }}
        open={unassignOpen}
        setOpen={setUnassignOpen}
        setUpdated={setUpdated}
      />

      <ConfirmDialog
        message={`You are about to check out all currently assigned ballkids.`}
        url={"/api/checkout-all"}
        body={{
          checkout_group: "assigned",
        }}
        open={checkoutOpen}
        setOpen={setCheckoutOpen}
        setUpdated={setUpdated}
      />

      <Box
        className="sxs"
        component="div"
        sx={{
          my: 0.5,
          pb: 1,
          overflowX: "scroll",
          button: {
            flex: "none",
          },
        }}
      >
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          disabled={numAssigned > 0}
          startIcon={<AutoAwesome />}
          onClick={() => setTeamsOpen(true)}
          sx={{ mr: 0.3 }}
        >
          Auto-create Teams
        </Button>

        <Button
          variant="outlined"
          size="small"
          color="primary"
          startIcon={<RemoveCircleOutline />}
          onClick={() => setUnassignOpen(true)}
          sx={{ mx: 0.3 }}
        >
          Unassign all teams
        </Button>

        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<HighlightOff />}
          onClick={() => setCheckoutOpen(true)}
          sx={{ mx: 0.3 }}
        >
          Check out all teams
        </Button>
      </Box>
    </div>
  );
}
