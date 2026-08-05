import React, { useState, useEffect } from "react";
import "./teams-page.css";
import { useDrop } from "react-dnd";

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
  Alerts,
  HideShowToggle,
  isCurrentHour,
  CourtAssignment,
  useIsMobile,
  ConfirmDialog,
  HovercardToggle,
} from "../Utils";
import {
  POSITIONS,
  TIMEOUT_MS,
  TARGET_NUM_BALLKIDS_PER_TEAM,
} from "../Consts";
import { TeamsChairpersonPageHeader } from "./TeamsChairpersonShared";
import { DraggableBallkidChip } from "../BallkidChip";
import { teams, finalsTeams } from "../HelpMessages.js";
import "../ballkid-row.css";

export function renderSwitchButton(ballkid, setUpdated, isFinalsPage = false) {
  const field = isFinalsPage ? "finals_position" : "position";

  return (
    <Tooltip title="Switch">
      <IconButton
        size="small"
        sx={{ p: 0.5 }}
        onClick={() =>
          fetch("/api/update-ballkid", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              first_name: ballkid.first_name,
              last_name: ballkid.last_name,
              [field]: ballkid[field] === "Back" ? "Net" : "Back",
            }),
          })
            .then((response) => response.json())
            .then(() => setUpdated(true))
        }
      >
        <SwapVert className="teams-chairperson-ballkid-action-icon" sx={{ color: "#7c5ce0" }} />
      </IconButton>
    </Tooltip>
  );
}

function renderUnassignButton(ballkid, setUpdated, isFinalsPage = false) {
  const patch = isFinalsPage ? { finals_team: "" } : { current_team: 0 };

  return (
    <Tooltip title="Unassign">
      <IconButton
        size="small"
        sx={{ p: 0.5 }}
        onClick={() => {
          fetch("/api/update-ballkid", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              first_name: ballkid.first_name,
              last_name: ballkid.last_name,
              ...patch,
            }),
          })
            .then((response) => response.json())
            .then(() => setUpdated(true));
        }}
      >
        <RemoveCircleOutline className="teams-chairperson-ballkid-action-icon" color="primary" />
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
        onClick={() => {
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
        <HighlightOff className="teams-chairperson-ballkid-action-icon" color="error" />
      </IconButton>
    </Tooltip>
  );
}

function ballkidCanSwitchPosition(ballkid) {
  return ballkid.preferred_position && String(ballkid.preferred_position).includes("/");
}

function renderBallkidRowActions(
  ballkid,
  setUpdated,
  { showCheckout = true, isFinalsPage = false } = {}
) {
  const showSwitch = ballkidCanSwitchPosition(ballkid, isFinalsPage);

  return (
    <div className="teams-chairperson-ballkid-actions">
      <div
        className={`teams-chairperson-ballkid-switch-slot${
          showSwitch ? "" : " is-empty"
        }`}
      >
        {showSwitch ? renderSwitchButton(ballkid, setUpdated, isFinalsPage) : null}
      </div>
      {renderUnassignButton(ballkid, setUpdated, isFinalsPage)}
      {showCheckout && !isFinalsPage ? renderCheckoutButton(ballkid, setUpdated) : null}
    </div>
  );
}

export function renderBallkidsOnTeam(
  ballkids,
  setUpdated,
  commentTypes,
  showHovercard,
  hoverCommentTypes,
  isFinalsPage = false
) {
  return (
    <div className="team-member-list">
      {ballkids.map((ballkid) => (
        <div key={`ballkid${ballkid.id}`} className="ballkid-row">
          <div className="teams-chairperson-ballkid-chip-wrap">
            <DraggableBallkidChip
              ballkid={ballkid}
              commentTypes={commentTypes}
              showHovercard={showHovercard}
              hoverCommentTypes={hoverCommentTypes}
            />
          </div>
          {renderBallkidRowActions(ballkid, setUpdated, { isFinalsPage })}
        </div>
      ))}
    </div>
  );
}

function Team({
  team,
  assigned,
  nextShifts = [],
  showHovercard,
  setUpdated,
  isNewTeam = false,
  isFinalsPage = false,
}) {
  const isCurrentlyOn =
    !isFinalsPage && nextShifts.length > 0 && isCurrentHour(nextShifts[0]["start"]);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const teamField = isFinalsPage ? "finals_team" : "current_team";
  const positionField = isFinalsPage ? "finals_position" : "position";

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          [teamField]: team,
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  const cardClass = [
    "team-card",
    "teams-chairperson-card",
    isOver ? "is-drop-over" : "",
    isCurrentlyOn ? "is-on-court" : "",
    isNewTeam ? "is-new-team" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const teamLabel = isFinalsPage ? team : `Team ${team}`;

  return (
    <div ref={dropRef} className={cardClass}>
      {!isFinalsPage && (
        <ConfirmDialog
          message={`You are about to check out all ${assigned.length} ballkid${
            assigned.length > 1 ? "s" : ""
          } on Team ${team} and delete all future shifts for Team ${team} from the schedule.`}
          url={"/api/checkout-all"}
          body={{ checkout_group: team }}
          open={checkoutOpen}
          setOpen={setCheckoutOpen}
          setUpdated={setUpdated}
        />
      )}

      <ConfirmDialog
        message={
          isFinalsPage
            ? `You are about to clear Team ${team} and unassign all ${
                assigned.length
              } ballkid${assigned.length > 1 ? "s" : ""}.`
            : `You are about to clear Team ${team}, unassign all ${
                assigned.length
              } ballkid${
                assigned.length > 1 ? "s" : ""
              }, and delete all future shifts for Team ${team} from the schedule.`
        }
        url={"/api/clear-team"}
        body={{ [teamField]: team }}
        open={clearOpen}
        setOpen={setClearOpen}
        setUpdated={setUpdated}
      />

      {isNewTeam ? (
        <div className="team-card-head">
          <div className="team-card-title-group">
            <span className="team-card-title">New Team</span>
          </div>
        </div>
      ) : (
        <>
          <div className="team-card-head">
            <div className="team-card-title-group">
              <span className="team-card-title">{teamLabel}</span>
              <span className="team-card-count">({assigned.length})</span>
              {isCurrentlyOn ? (
                <span className="team-card-oncourt-badge">On court</span>
              ) : null}
            </div>
            {isFinalsPage && assigned.length > 0 ? (
              <div className="teams-chairperson-head-actions">
                <Button
                  size="small"
                  variant="outlined"
                  className="teams-chairperson-team-btn teams-chairperson-team-btn--end"
                  onClick={() => setClearOpen(true)}
                >
                  Unassign team
                </Button>
              </div>
            ) : null}
          </div>

          {!isFinalsPage && assigned.length > 0 ? (
            <div className="teams-chairperson-head-secondary">
              <div className="teams-chairperson-head-secondary__assignment">
                <CourtAssignment nextShifts={nextShifts} showIcon />
              </div>
              <div className="teams-chairperson-head-secondary__buttons">
                <Button
                  size="small"
                  variant="outlined"
                  className="teams-chairperson-team-btn teams-chairperson-team-btn--end"
                  startIcon={<RemoveCircleOutline fontSize="small" />}
                  onClick={() => setClearOpen(true)}
                >
                  Unassign team
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  className="teams-chairperson-team-btn teams-chairperson-team-btn--checkout-team"
                  startIcon={<HighlightOff fontSize="small" />}
                  onClick={() => setCheckoutOpen(true)}
                >
                  Check out team
                </Button>
              </div>
            </div>
          ) : null}

          <div className="team-card-body">
            {assigned.length === 0
              ? ""
              : POSITIONS.map((position) => {
                  const positionBallkids = assigned.filter(
                    (ballkid) => ballkid[positionField] === position
                  );

                  return (
                    <div className="team-position-block" key={position}>
                      <div className="team-position-head">
                        <span className="team-position-label">{position}s</span>
                        <span className="team-position-count">
                          ({positionBallkids.length})
                        </span>
                      </div>
                      {positionBallkids.length === 0 ? (
                        <div className="team-position-empty">
                          No {position.toLowerCase()}s assigned yet.
                        </div>
                      ) : (
                        renderBallkidsOnTeam(
                          positionBallkids,
                          setUpdated,
                          isFinalsPage ? ["rank", "experience"] : undefined,
                          showHovercard,
                          isFinalsPage ? ["experience", "rank", "calibrated_avg"] : undefined,
                          isFinalsPage
                        )
                      )}
                    </div>
                  );
                })}
          </div>
        </>
      )}
    </div>
  );
}

export function assignBallkidToTeam(ballkid, team, { isFinalsPage = false } = {}) {
  const teamAssignDict = isFinalsPage
    ? { finals_team: team }
    : { current_team: team };

  return fetch("/api/update-ballkid", {
    method: "PATCH",
    headers: getAuthHeader(),
    body: JSON.stringify({
      first_name: ballkid.first_name,
      last_name: ballkid.last_name,
      ...teamAssignDict,
    }),
  });
}

export function renderCheckoutUnassignedButton(setOpen) {
  return (
    <Button
      variant="outlined"
      size="small"
      className="teams-chairperson-team-btn teams-chairperson-team-btn--checkout-team"
      startIcon={<HighlightOff fontSize="small" />}
      onClick={() => setOpen(true)}
    >
      Check out all
    </Button>
  );
}

export function Teams({ assigned, teams, nextShifts, setUpdated }) {
  const isMobile = useIsMobile();

  const sortedTeams = [...teams].sort((a, b) => {
    const aEmpty = !assigned.some((ballkid) => ballkid.current_team === a);
    const bEmpty = !assigned.some((ballkid) => ballkid.current_team === b);
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
    return a - b;
  });

  return (
    <div className="teams-page-grid teams-chairperson-teams-grid">
      {sortedTeams.map((team) => (
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
    </div>
  );
}

// Finals page calls this as a plain function (not a JSX component),
// matching its existing call convention.
export function renderTeams(assigned, teams, showHovercard, setUpdated) {
  return (
    <div className="teams-page-grid teams-chairperson-teams-grid">
      {teams.map((team) => (
        <Team
          key={team}
          team={team}
          assigned={assigned.filter((ballkid) => ballkid.finals_team === team)}
          showHovercard={showHovercard}
          setUpdated={setUpdated}
          isFinalsPage
        />
      ))}
    </div>
  );
}

export function Header({ topBarActions, showHovercard, setShowHovercard, isFinalsPage = false }) {
  const [tournament, setTournament] = useState();
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/get-tournament", { method: "GET", headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTournament(data));
  }, []);

  return tournament === null || tournament === undefined ? "" : (
    <TeamsChairpersonPageHeader
      title={isFinalsPage ? "Finals Teams" : "Current Teams"}
      helpPage={isFinalsPage ? "Finals Teams" : "Teams"}
      helpMessage={isFinalsPage ? finalsTeams : teams}
      alerts={<Alerts successMsg={successMsg} errorMsg={errorMsg} setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg} />}
      toolbar={
        <>
          <div className="teams-chairperson-pill">
            <span className="teams-chairperson-pill-label">Visible to ballkids</span>
            <HideShowToggle
              teamType={isFinalsPage ? "finals" : ""}
              defaultShow={isFinalsPage ? tournament["show_finals_teams"] : tournament["show_teams"]}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          </div>
          {isFinalsPage ? <HovercardToggle enabled={showHovercard} setEnabled={setShowHovercard} /> : null}
        </>
      }
      actions={topBarActions}
    />
  );
}

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
            type="number"
            InputProps={{
              inputProps: { style: { textAlign: "center" } },
            }}
            style={{ width: 50 }}
            sx={{ mx: 1 }}
            onChange={(e) => setNumTeams(e.target.value)}
          />
        </Box>
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
              body: JSON.stringify({ numTeams: numTeams }),
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
      <CreateTeamsDialog open={teamsOpen} setOpen={setTeamsOpen} setUpdated={setUpdated} />

      <ConfirmDialog
        message={`You are about to unassign all currently assigned teams.`}
        url={"/api/clear-team"}
        body={{ current_team: 0 }}
        open={unassignOpen}
        setOpen={setUnassignOpen}
        setUpdated={setUpdated}
      />

      <ConfirmDialog
        message={`You are about to check out all currently assigned ballkids.`}
        url={"/api/checkout-all"}
        body={{ checkout_group: "assigned" }}
        open={checkoutOpen}
        setOpen={setCheckoutOpen}
        setUpdated={setUpdated}
      />

      <Box className="teams-chairperson-actions" component="div">
        <Button
          variant="outlined"
          size="small"
          disabled={numAssigned > 0}
          className="teams-chairperson-action-btn teams-chairperson-action-btn--create"
          startIcon={<AutoAwesome fontSize="small" />}
          onClick={() => setTeamsOpen(true)}
        >
          Auto-create teams
        </Button>

        <Button
          variant="outlined"
          size="small"
          disabled={numAssigned === 0}
          className="teams-chairperson-action-btn teams-chairperson-action-btn--unassign"
          startIcon={<RemoveCircleOutline fontSize="small" />}
          onClick={() => setUnassignOpen(true)}
        >
          Unassign all teams
        </Button>

        <Button
          variant="outlined"
          size="small"
          disabled={numAssigned === 0}
          className="teams-chairperson-action-btn teams-chairperson-action-btn--checkout"
          startIcon={<HighlightOff fontSize="small" />}
          onClick={() => setCheckoutOpen(true)}
        >
          Check out all teams
        </Button>
      </Box>
    </div>
  );
}