import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import {
  CourtAssignment,
  getAuthHeader,
  isCurrentHour,
  BallkidAndIcon,
  HelpIcon,
  Banners,
  ballkidImageSrc,
  Icons,
  getLocalStorage,
} from "../Utils";
import { POSITIONS } from "../Consts";
import { teamsNonchairperson } from "../HelpMessages";
import "./teams-page.css";

function personInitials(firstName, lastName) {
  const f = (firstName ?? "").trim()[0] ?? "";
  const l = (lastName ?? "").trim()[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function PersonPhotoTile({ ballkid }) {
  const src = ballkidImageSrc(ballkid.image);
  const [failed, setFailed] = useState(false);

  return (
    <div className="team-photo-tile">
      <div className="team-photo-avatar">
        {src && !failed ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          personInitials(ballkid.first_name, ballkid.last_name)
        )}
      </div>
      <span className="team-photo-name">
        {ballkid.first_name} {ballkid.last_name}
      </span>
      <Icons ballkid={ballkid} margin={0} />
    </div>
  );
}

function Team({ team, assigned, nextShifts, isMyTeam, showPhotos }) {
  const isCurrentlyOn =
    nextShifts.length > 0 && isCurrentHour(nextShifts[0]["start"]);

  return (
    <div
      className={`team-card${isMyTeam ? " is-mine" : ""}${
        isCurrentlyOn ? " is-on-court" : ""
      }`}
    >
      <div className="team-card-head">
        <div className="team-card-title-group">
          <span className="team-card-title">Team {team}</span>
          <span className="team-card-count">({assigned.length})</span>
          {isMyTeam ? (
            <span className="team-card-mine-badge">Your Team</span>
          ) : null}
          {isCurrentlyOn ? (
            <span className="team-card-oncourt-badge">On court</span>
          ) : null}
        </div>
        <span className="team-card-assignment">
          <CourtAssignment nextShifts={nextShifts} />
        </span>
      </div>

      <div className="team-card-body">
        {POSITIONS.map((position) => {
          const positionBallkids = assigned.filter(
            (ballkid) =>
              ballkid.current_team === team && ballkid.position === position
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
              ) : showPhotos ? (
                <div className="team-photo-grid">
                  {positionBallkids.map((ballkid) => (
                    <PersonPhotoTile key={ballkid.id} ballkid={ballkid} />
                  ))}
                </div>
              ) : (
                <div className="team-member-list">
                  {positionBallkids.map((ballkid) => (
                    <BallkidAndIcon key={ballkid.id} ballkid={ballkid} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TeamsPage(props) {
  const [assigned, setAssigned] = useState([]);
  const [teams, setTeams] = useState([]);
  const [nextShifts, setNextShifts] = useState([]);
  const [showTeams, setShowTeams] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);

  const myBallkidId = Number(getLocalStorage("ballkid_id"));

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) =>
        setAssigned(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === true && ballkid.current_team > 0
          )
        )
      );

    fetch("/api/calc-num-teams", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTeams(data["teams"]));

    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setShowTeams(data["show_teams"]));

    fetch("/api/get-next-shifts", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setNextShifts(data));
  }, []);

  const myTeam = assigned.find((b) => b.id === myBallkidId)?.current_team;

  const orderedTeams = [...teams].sort((a, b) => {
    if (a === myTeam) return -1;
    if (b === myTeam) return 1;
    return a - b;
  });

  return (
    <div className="page teams-page-shell">
      <Banners />

      <Box className="teams-page-header">
        <div className="teams-page-title-row">
          <Typography className="teams-page-title" variant="h4">
            Current Teams
          </Typography>
          <HelpIcon page="Teams" message={teamsNonchairperson} />
        </div>

        <div className="teams-page-photo-toggle">
          <span className="teams-page-photo-toggle-label">Show photos</span>
          <button
            type="button"
            className={`teams-page-photo-toggle-switch${
              showPhotos ? " on" : ""
            }`}
            role="switch"
            aria-checked={showPhotos}
            onClick={() => setShowPhotos(!showPhotos)}
          />
        </div>
      </Box>

      {assigned.length > 0 && showTeams ? (
        <div className="teams-page-grid">
          {orderedTeams.map((team) => (
            <Team
              key={team}
              team={team}
              assigned={assigned.filter(
                (ballkid) => ballkid.current_team === team
              )}
              nextShifts={nextShifts.filter((shift) => shift.team === team)}
              isMyTeam={team === myTeam}
              showPhotos={showPhotos}
            />
          ))}
        </div>
      ) : (
        <div className="teams-page-empty">
          There are currently no teams assigned.
        </div>
      )}
    </div>
  );
}