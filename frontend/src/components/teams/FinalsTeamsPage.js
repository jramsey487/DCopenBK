import React, { useState, useEffect } from "react";

import {
  getAuthHeader,
  BallkidAndIcon,
  Banners,
  getLocalStorage,
} from "../Utils";
import { MATCH_TYPES, POSITIONS } from "../Consts";
import { finalsTeamsNonchairperson } from "../HelpMessages";
import { PersonPhotoTile, TeamsPhotoToggle } from "./TeamsShared";
import { TeamsPageTopBar } from "./TeamsChairpersonShared";
import "./teams-page.css";

function Team({ team, assigned, isMyTeam, showPhotos }) {
  return (
    <div className={`team-card${isMyTeam ? " is-mine" : ""}`}>
      <div className="team-card-head">
        <div className="team-card-title-group">
          <span className="team-card-title">{team}</span>
          <span className="team-card-count">({assigned.length})</span>
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
              ) : showPhotos ? (
                <div className="team-photo-grid">
                  {positionAssigned.map((ballkid) => (
                    <PersonPhotoTile key={ballkid.id} ballkid={ballkid} />
                  ))}
                </div>
              ) : (
                <div className="team-member-list">
                  {positionAssigned.map((ballkid) => (
                    <BallkidAndIcon
                      key={ballkid.id}
                      ballkid={ballkid}
                      isTeamsPage
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

export default function FinalsTeamsPage(props) {
  const [assigned, setAssigned] = useState([]);
  const [showFinalsTeams, setShowFinalsTeams] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);

  const myBallkidId = Number(getLocalStorage("ballkid_id"));

  const teams = Object.keys(MATCH_TYPES).map((key) => MATCH_TYPES[key]);

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) =>
        setAssigned(data.filter((ballkid) => ballkid.finals_team))
      );

    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setShowFinalsTeams(data["show_finals_teams"]));
  }, []);

  const myFinalsTeam = assigned.find((b) => b.id === myBallkidId)?.finals_team;

  const orderedTeams = [...teams].sort((a, b) => {
    if (a === myFinalsTeam) return -1;
    if (b === myFinalsTeam) return 1;
    return 0;
  });

  return (
    <div className="page ballkid-list-page teams-page-shell">
      <Banners />

      <TeamsPageTopBar
        title="Finals Teams"
        helpPage="Finals Teams"
        helpMessage={finalsTeamsNonchairperson}
        controls={
          <TeamsPhotoToggle
            showPhotos={showPhotos}
            onToggle={() => setShowPhotos(!showPhotos)}
          />
        }
      />

      {assigned.length > 0 && showFinalsTeams ? (
        <div className="teams-page-grid">
          {orderedTeams.map((team) => (
            <Team
              key={team}
              team={team}
              assigned={assigned.filter(
                (ballkid) => ballkid.finals_team === team
              )}
              isMyTeam={team === myFinalsTeam}
              showPhotos={showPhotos}
            />
          ))}
        </div>
      ) : (
        <div className="teams-page-empty">
          There are currently no finals teams assigned.
        </div>
      )}
    </div>
  );
}
