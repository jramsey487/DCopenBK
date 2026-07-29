import React, { useState, useEffect } from "react";
import "./teams-page.css";
import { useDrop } from "react-dnd";

import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";

import RemoveCircleOutline from "@mui/icons-material/RemoveCircleOutline";
import SwapVert from "@mui/icons-material/SwapVert";

import {
  getAuthHeader,
  Alerts,
  HideShowToggle,
  ConfirmDialog,
  useIsMobile,
  HovercardToggle,
} from "../Utils";
import { finalsTeams } from "../HelpMessages";
import { POSITIONS } from "../Consts";
import {
  TeamsDraggableBallkid,
  TeamsChairpersonPageHeader,
} from "./TeamsChairpersonShared";

function renderSwitchButton(ballkid, setUpdated) {
  return (
    <Tooltip title="Switch">
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
              finals_position:
                ballkid.finals_position === "Back" ? "Net" : "Back",
            }),
          })
            .then((response) => response.json())
            .then(() => setUpdated(true));
        }}
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
        onClick={() => {
          fetch("/api/update-ballkid", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              first_name: ballkid.first_name,
              last_name: ballkid.last_name,
              finals_team: "",
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

function renderBallkidsOnTeam(assigned, showHovercard, setUpdated) {
  return (
    <div className="team-member-list">
      {assigned.map((ballkid) => (
        <div
          key={`ballkid${ballkid.id}`}
          className="teams-chairperson-ballkid-row"
        >
          <div className="teams-chairperson-ballkid-chip-wrap">
            <TeamsDraggableBallkid
              ballkid={ballkid}
              commentTypes={["rank", "experience"]}
              showHovercard={showHovercard}
              hoverCommentTypes={["experience", "rank", "calibrated_avg"]}
            />
          </div>

          <div className="teams-chairperson-ballkid-actions">
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

function Team({ team, assigned, showHovercard, setUpdated }) {
  const [clearOpen, setClearOpen] = useState(false);

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          finals_team: team,
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
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={dropRef} className={cardClass}>
      <ConfirmDialog
        message={`You are about to clear Team ${team} and unassign all ${
          assigned.length
        } ballkid${assigned.length > 1 ? "s" : ""}.`}
        url={"/api/clear-team"}
        body={{
          finals_team: team,
        }}
        open={clearOpen}
        setOpen={setClearOpen}
        setUpdated={setUpdated}
      />

      <div className="team-card-head">
        <div className="team-card-title-group">
          <span className="team-card-title">{team}</span>
          <span className="team-card-count">({assigned.length})</span>
        </div>
        <div className="teams-chairperson-head-actions">
          {assigned.length === 0 ? (
            ""
          ) : (
            <Button
              size="small"
              variant="outlined"
              className="teams-chairperson-team-btn teams-chairperson-team-btn--end"
              onClick={() => setClearOpen(true)}
            >
              Clear team
            </Button>
          )}
        </div>
      </div>

      <div className="team-card-body">
        {POSITIONS.map((position) => {
          const positionAssigned = assigned.filter(
            (ballkid) => ballkid.finals_position === position
          );

          return (
            <div className="team-position-block" key={position}>
              <div className="team-position-head">
                <span className="team-position-label">{position}s</span>
                <span className="team-position-count">
                  ({positionAssigned.length})
                </span>
              </div>
              {positionAssigned.length === 0 ? (
                <div className="team-position-empty">
                  No {position.toLowerCase()}s assigned yet.
                </div>
              ) : (
                renderBallkidsOnTeam(
                  positionAssigned,
                  showHovercard,
                  setUpdated
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
        />
      ))}
    </div>
  );
}

export function Header({ showHovercard, setShowHovercard }) {
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
    <TeamsChairpersonPageHeader
      title="Finals Teams"
      helpPage="Finals Teams"
      helpMessage={finalsTeams}
      alerts={
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />
      }
      toolbar={
        <>
          <div className="teams-chairperson-pill">
            <span className="teams-chairperson-pill-label">
              Visible to ballkids
            </span>
            <HideShowToggle
              teamType="finals"
              defaultShow={tournament["show_finals_teams"]}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          </div>
          <HovercardToggle
            enabled={showHovercard}
            setEnabled={setShowHovercard}
          />
        </>
      }
    />
  );
}
