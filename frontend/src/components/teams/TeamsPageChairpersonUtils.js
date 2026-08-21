import React, { useState, useEffect, useRef } from "react";
import "./teams-page.css";
import { useDrop } from "react-dnd";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";

import RemoveCircleOutline from "@mui/icons-material/RemoveCircleOutline";
import SwapVert from "@mui/icons-material/SwapVert";
import HighlightOff from "@mui/icons-material/HighlightOff";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import Add from "@mui/icons-material/Add";
import Remove from "@mui/icons-material/Remove";
import Check from "@mui/icons-material/Check";

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
  getToday,
} from "../Utils";
import {
  POSITIONS,
  TARGET_NUM_BALLKIDS_PER_TEAM,
} from "../Consts";
import { TeamsChairpersonPageHeader } from "./TeamsChairpersonShared";
import { CURRENT_TEAMS_MODE } from "./TeamsChairpersonMode";
import { DraggableBallkidRow, sortBallkidsByBoardOrder } from "../BallkidChip";
import { CourtNoteBlock } from "./CourtNote";
import "../ballkid-row.css";
import "../confirm-dialog.css";

export function renderSwitchButton(ballkid, setUpdated, mode = CURRENT_TEAMS_MODE) {
  const field = mode.positionField;

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

function renderUnassignButton(ballkid, setUpdated, mode = CURRENT_TEAMS_MODE) {
  const patch = mode.unassignPatch();

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
  { showCheckout = true, mode = CURRENT_TEAMS_MODE } = {}
) {
  const showSwitch = ballkidCanSwitchPosition(ballkid);

  return (
    <div className="teams-chairperson-ballkid-actions">
      <div
        className={`teams-chairperson-ballkid-switch-slot${
          showSwitch ? "" : " is-empty"
        }`}
      >
        {showSwitch ? renderSwitchButton(ballkid, setUpdated, mode) : null}
      </div>
      {renderUnassignButton(ballkid, setUpdated, mode)}
      {showCheckout && mode.showCheckout
        ? renderCheckoutButton(ballkid, setUpdated)
        : null}
    </div>
  );
}

export function renderBallkidsOnTeam(
  ballkids,
  setUpdated,
  commentTypes,
  showHovercard,
  hoverCommentTypes,
  mode = CURRENT_TEAMS_MODE,
  dropAssign = null,
  dropGroupBy = null
) {
  const ordered = sortBallkidsByBoardOrder(ballkids);
  return (
    <div className="team-member-list ballkid-row-list">
      {ordered.map((ballkid) => (
        <DraggableBallkidRow
          key={`ballkid${ballkid.id}`}
          ballkid={ballkid}
          commentTypes={commentTypes}
          showHovercard={showHovercard}
          hoverCommentTypes={hoverCommentTypes}
          actions={renderBallkidRowActions(ballkid, setUpdated, { mode })}
          setUpdated={setUpdated}
          dropAssign={dropAssign}
          dropGroupBy={dropGroupBy}
        />
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
  mode = CURRENT_TEAMS_MODE,
  courtNotes = {},
  setCourtNotes,
}) {
  const isCurrentlyOn =
    mode.showOnCourtUi &&
    nextShifts.length > 0 &&
    isCurrentHour(nextShifts[0]["start"]);
  const court =
    mode.showCourtNotes && nextShifts.length > 0 ? nextShifts[0].court : "";

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const teamField = mode.teamField;
  const positionField = mode.positionField;

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid, monitor) => {
      if (monitor.didDrop()) {
        return;
      }
      return fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          ...mode.assignPatch(team),
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true));
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
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

  const teamLabel = mode.teamLabel(team);

  return (
    <div ref={dropRef} className={cardClass}>
      {mode.showCheckout && (
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
        message={mode.clearTeamMessage(team, assigned.length)}
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
            {mode.isFinals && assigned.length > 0 ? (
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

          {!mode.isFinals && assigned.length > 0 ? (
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

          {mode.showCourtNotes && court && setCourtNotes ? (
            <CourtNoteBlock
              court={court}
              note={courtNotes[court]}
              date={getToday()}
              onNotesChange={setCourtNotes}
            />
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
                          mode.commentTypes,
                          showHovercard,
                          mode.hoverCommentTypes,
                          mode,
                          mode.dropAssignOnTeam(team, position),
                          mode.dropGroupBy
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

export function assignBallkidToTeam(ballkid, team, mode = CURRENT_TEAMS_MODE) {
  return fetch("/api/update-ballkid", {
    method: "PATCH",
    headers: getAuthHeader(),
    body: JSON.stringify({
      first_name: ballkid.first_name,
      last_name: ballkid.last_name,
      ...mode.assignPatch(team),
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

export function Teams({
  assigned,
  teams,
  nextShifts,
  setUpdated,
  courtNotes = {},
  setCourtNotes,
  mode = CURRENT_TEAMS_MODE,
}) {
  const isMobile = useIsMobile();

  const sortedTeams = [...teams].sort((a, b) => {
    const aEmpty = !assigned.some((ballkid) => mode.isOnTeam(ballkid, a));
    const bEmpty = !assigned.some((ballkid) => mode.isOnTeam(ballkid, b));
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
    return a - b;
  });

  return (
    <div className="teams-page-grid teams-chairperson-teams-grid">
      {sortedTeams.map((team) => (
        <Team
          key={team}
          team={team}
          assigned={assigned.filter((ballkid) => mode.isOnTeam(ballkid, team))}
          nextShifts={nextShifts.filter((shift) => shift.team === team)}
          setUpdated={setUpdated}
          courtNotes={courtNotes}
          setCourtNotes={setCourtNotes}
          mode={mode}
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
          mode={mode}
        />
      )}
    </div>
  );
}

// Finals page calls this as a plain function (not a JSX component),
// matching its existing call convention.
export function renderTeams(assigned, teams, showHovercard, setUpdated, mode) {
  return (
    <div className="teams-page-grid teams-chairperson-teams-grid">
      {teams.map((team) => (
        <Team
          key={team}
          team={team}
          assigned={assigned.filter((ballkid) => mode.isOnTeam(ballkid, team))}
          showHovercard={showHovercard}
          setUpdated={setUpdated}
          mode={mode}
        />
      ))}
    </div>
  );
}

export function Header({
  topBarActions,
  showHovercard,
  setShowHovercard,
  mode = CURRENT_TEAMS_MODE,
  showHovercardToggle = true,
}) {
  const [tournament, setTournament] = useState();
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!mode.showVisibilityToggle) {
      return;
    }
    fetch("/api/get-tournament", { method: "GET", headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTournament(data));
  }, [mode.showVisibilityToggle]);

  if (mode.showVisibilityToggle && (tournament === null || tournament === undefined)) {
    return "";
  }

  const toolbarItems = (
    <>
      {mode.showVisibilityToggle ? (
        <div className="teams-chairperson-pill">
          <span className="teams-chairperson-pill-label">Visible to ballkids</span>
          <HideShowToggle
            teamType=""
            defaultShow={tournament["show_teams"]}
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
          />
        </div>
      ) : null}
      {mode.isFinals && showHovercardToggle ? (
        <HovercardToggle
          enabled={showHovercard}
          setEnabled={setShowHovercard}
        />
      ) : null}
    </>
  );

  const hasToolbar =
    (mode.showVisibilityToggle && tournament) ||
    (mode.isFinals && showHovercardToggle);

  return (
    <TeamsChairpersonPageHeader
      title={mode.title}
      helpPage={mode.helpPage}
      helpMessage={mode.helpMessage}
      alerts={
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      }
      toolbar={hasToolbar ? toolbarItems : null}
      actions={topBarActions}
    />
  );
}

function CreateTeamsDialog({ open, setOpen, setUpdated }) {
  const [numTeams, setNumTeams] = useState(10);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const closeTimeoutRef = useRef(null);
  const pendingRefreshRef = useRef(false);

  const clampTeams = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(30, Math.round(n)));
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    setErrorMsg("");
    setLoading(false);
    setSucceeded(false);
    pendingRefreshRef.current = false;

    fetch("/api/sorted-list?rank=0", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        const checkedIn = (Array.isArray(data) ? data : []).filter(
          (ballkid) => ballkid.is_checked_in === true
        ).length;
        setNumTeams(
          clampTeams(
            Math.min(
              10,
              Math.round(checkedIn / TARGET_NUM_BALLKIDS_PER_TEAM)
            )
          )
        );
      })
      .catch(() => {});
  }, [open]);

  const handleClose = () => {
    if (succeeded || loading) return;
    setOpen(false);
    setErrorMsg("");
  };

  const handleExited = () => {
    if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      setUpdated?.(true);
    }
    setSucceeded(false);
    setErrorMsg("");
    setLoading(false);
  };

  const finishSuccess = () => {
    setLoading(false);
    setErrorMsg("");
    setSucceeded(true);
    closeTimeoutRef.current = setTimeout(() => {
      pendingRefreshRef.current = true;
      setOpen(false);
    }, 900);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionProps={{ onExited: handleExited }}
      PaperProps={{
        className: "confirm-dialog-paper create-teams-dialog-paper",
      }}
    >
      <div
        className="confirm-dialog-accent create-teams-dialog-accent"
        aria-hidden="true"
      />
      <DialogContent className="confirm-dialog-content">
        <Alerts
          successMsg=""
          errorMsg={errorMsg}
          setSuccessMsg={() => {}}
          setErrorMsg={setErrorMsg}
        />

        <Typography className="confirm-dialog-title">
          Auto-create teams
        </Typography>
        <DialogContentText className="confirm-dialog-message">
          Suggested from checked-in ballkids. Adjust the count if needed, then
          create.
        </DialogContentText>

        <div className="create-teams-dialog-stepper">
          <IconButton
            className="create-teams-dialog-stepper-btn"
            size="small"
            aria-label="Decrease teams"
            disabled={succeeded || loading || Number(numTeams) <= 1}
            onClick={() => setNumTeams((n) => clampTeams(Number(n) - 1))}
          >
            <Remove fontSize="small" />
          </IconButton>
          <TextField
            className="create-teams-dialog-input"
            value={numTeams}
            variant="outlined"
            type="number"
            inputProps={{
              min: 1,
              max: 30,
              "aria-label": "Number of teams",
            }}
            disabled={succeeded || loading}
            onChange={(e) => setNumTeams(e.target.value)}
            onBlur={() => setNumTeams((n) => clampTeams(n))}
          />
          <IconButton
            className="create-teams-dialog-stepper-btn"
            size="small"
            aria-label="Increase teams"
            disabled={succeeded || loading || Number(numTeams) >= 30}
            onClick={() => setNumTeams((n) => clampTeams(Number(n) + 1))}
          >
            <Add fontSize="small" />
          </IconButton>
        </div>
        <Typography className="create-teams-dialog-hint" component="p">
          Number of teams
        </Typography>
      </DialogContent>

      <DialogActions className="confirm-dialog-actions">
        <Button
          className="confirm-dialog-cancel"
          variant="outlined"
          onClick={handleClose}
          disabled={succeeded || loading}
        >
          Cancel
        </Button>
        <LoadingButton
          className={
            succeeded
              ? "create-teams-dialog-action-btn create-teams-dialog-action-btn--success"
              : "create-teams-dialog-action-btn"
          }
          loading={loading}
          variant="contained"
          disabled={succeeded}
          startIcon={succeeded ? <Check /> : <AutoAwesome />}
          onClick={() => {
            if (succeeded || loading) return;
            const teamsCount = clampTeams(numTeams);
            setNumTeams(teamsCount);
            setLoading(true);
            setErrorMsg("");

            fetch("/api/create-teams", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({ numTeams: teamsCount }),
            })
              .then((response) => {
                if (response.ok) {
                  finishSuccess();
                } else {
                  setErrorMsg("Error creating teams. Please try again.");
                  setLoading(false);
                }
              })
              .catch(() => {
                setErrorMsg("Error creating teams. Please try again.");
                setLoading(false);
              });
          }}
        >
          {succeeded ? "Done" : "Create"}
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