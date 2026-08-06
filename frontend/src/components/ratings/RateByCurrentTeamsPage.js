import React, { useState, useEffect } from "react";

import {
  getAuthHeader,
  getLocalStorage,
  isCurrentHour,
  CourtAssignment,
  BallkidAndIcon,
  ballkidImageSrc,
  Icons,
} from "../Utils";
import { POSITIONS } from "../Consts";
import { rateByCurrentTeam } from "../HelpMessages";
import { TeamsPhotoToggle, personInitials } from "../teams/TeamsShared";
import { RatingsPageShell, RateActionButton } from "./RatingsPageShared";

function RatePersonPhotoTile({ ballkid, setUpdated }) {
  const src = ballkidImageSrc(ballkid.image);
  const [failed, setFailed] = useState(false);

  return (
    <div className="team-photo-tile rate-photo-tile">
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
      <span className="team-photo-role-icons">
        <Icons ballkid={ballkid} margin={0} />
      </span>
      <div className="rate-photo-tile-action">
        <RateActionButton ballkid={ballkid} setUpdated={setUpdated} />
      </div>
    </div>
  );
}

function Team({ team, assigned, nextShifts, setUpdated, showPhotos, isMyTeam }) {
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
          const positionAssigned = assigned.filter(
            (ballkid) => ballkid.position === position
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
                    <RatePersonPhotoTile
                      key={ballkid.id}
                      ballkid={ballkid}
                      setUpdated={setUpdated}
                    />
                  ))}
                </div>
              ) : (
                <div className="team-member-list">
                  {positionAssigned.map((ballkid) => (
                    <div className="rate-team-member-row" key={ballkid.id}>
                      <BallkidAndIcon ballkid={ballkid} />
                      <RateActionButton
                        ballkid={ballkid}
                        setUpdated={setUpdated}
                      />
                    </div>
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

export default function RateByCurrentTeamsPage() {
  const [assigned, setAssigned] = useState([]);
  const [nextShifts, setNextShifts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [showTeams, setShowTeams] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);

  const pk = getLocalStorage("ballkid_id");
  const group = getLocalStorage("group");

  useEffect(() => {
    fetch("/api/sorted-list/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setAssigned(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === true && ballkid.current_team > 0
          )
        );
      });

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
      .then((data) => setNextShifts(data))
      .then(() => setUpdated(false));
  }, [pk, updated]);

  const myBallkidId = Number(pk);
  const viewerBallkid = assigned.find((b) => b.id === myBallkidId);
  const myTeam =
    viewerBallkid?.is_captain && viewerBallkid.current_team > 0
      ? viewerBallkid.current_team
      : undefined;

  const orderedTeams = [...teams].sort((a, b) => {
    if (myTeam == null) return a - b;
    if (a === myTeam) return -1;
    if (b === myTeam) return 1;
    return a - b;
  });

  return (
    <RatingsPageShell
      className="rate-by-current-team-page"
      title="Rate by Current Team"
      helpPage="Rate by Current Team"
      helpMessage={rateByCurrentTeam}
      toolbar={
        <TeamsPhotoToggle
          showPhotos={showPhotos}
          onToggle={() => setShowPhotos(!showPhotos)}
        />
      }
    >
      {assigned.length === 0 || (group !== "chairperson" && !showTeams) ? (
        <div className="rate-empty">
          There are currently no teams assigned.
        </div>
      ) : (
        <div className="teams-page-grid">
          {orderedTeams.map((team) => (
            <Team
              key={team}
              team={team}
              assigned={assigned.filter(
                (ballkid) => ballkid.current_team === team
              )}
              nextShifts={nextShifts.filter((shift) => shift.team === team)}
              setUpdated={setUpdated}
              showPhotos={showPhotos}
              isMyTeam={team === myTeam}
            />
          ))}
        </div>
      )}
    </RatingsPageShell>
  );
}
