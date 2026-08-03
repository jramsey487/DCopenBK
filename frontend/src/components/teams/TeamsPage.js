import React, { useState, useEffect } from "react";

import {
  CourtAssignment,
  getAuthHeader,
  isCurrentHour,
  BallkidAndIcon,
  Banners,
  getLocalStorage,
} from "../Utils";
import { POSITIONS } from "../Consts";
import { teamsNonchairperson } from "../HelpMessages";
import { PersonPhotoTile, TeamsPhotoToggle, TeamsYoeToggle } from "./TeamsShared";
import { TeamsPageTopBar } from "./TeamsChairpersonShared";
import "./teams-page.css";

function Team({ team, assigned, nextShifts, isMyTeam, showPhotos, showYoe }) {
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
                    <PersonPhotoTile
                      key={ballkid.id}
                      ballkid={ballkid}
                      showYoe={showYoe}
                    />
                  ))}
                </div>
              ) : (
                <div className="team-member-list">
                  {positionBallkids.map((ballkid) => (
                    <BallkidAndIcon
                      key={ballkid.id}
                      ballkid={ballkid}
                      isTeamsPage
                      showYoe={showYoe}
                    />
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
  const [showPhotos, setShowPhotos] = useState(false);
  const [showYoe, setShowYoe] = useState(false);

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
    <div className="page ballkid-list-page teams-page-shell">
      <Banners />

      <TeamsPageTopBar
        title="Current Teams"
        helpPage="Teams"
        helpMessage={teamsNonchairperson}
        controls={
          <>
            <TeamsPhotoToggle
              showPhotos={showPhotos}
              onToggle={() => setShowPhotos(!showPhotos)}
            />
            <TeamsYoeToggle
              showYoe={showYoe}
              onToggle={() => setShowYoe(!showYoe)}
            />
          </>
        }
      />

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
              showYoe={showYoe}
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