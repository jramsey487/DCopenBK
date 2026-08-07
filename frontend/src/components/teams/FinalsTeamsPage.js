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
import { cacheGet, cacheSet } from "../apiCache";
import "./teams-page.css";

const ASSIGNED_CACHE = "finals-teams:assigned";
const SHOW_CACHE = "finals-teams:show";

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

export default function FinalsTeamsPage() {
  const hadCache = cacheGet(ASSIGNED_CACHE) != null;
  const [assigned, setAssigned] = useState(() => cacheGet(ASSIGNED_CACHE) ?? []);
  const [showFinalsTeams, setShowFinalsTeams] = useState(
    () => cacheGet(SHOW_CACHE) ?? false
  );
  const [loading, setLoading] = useState(!hadCache);
  const [showPhotos, setShowPhotos] = useState(false);

  const myBallkidId = Number(getLocalStorage("ballkid_id"));

  const teams = Object.keys(MATCH_TYPES).map((key) => MATCH_TYPES[key]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/sorted-list", { headers: getAuthHeader() }).then((response) =>
        response.json()
      ),
      fetch("/api/get-tournament", {
        method: "GET",
        headers: getAuthHeader(),
      }).then((response) => response.json()),
    ])
      .then(([listData, tournamentData]) => {
        if (cancelled) {
          return;
        }
        const nextAssigned = listData.filter((ballkid) => ballkid.finals_team);
        const nextShow = Boolean(tournamentData["show_finals_teams"]);
        cacheSet(ASSIGNED_CACHE, nextAssigned);
        cacheSet(SHOW_CACHE, nextShow);
        setAssigned(nextAssigned);
        setShowFinalsTeams(nextShow);
      })
      .catch(() => {
        if (!cancelled && !hadCache) {
          setAssigned([]);
          setShowFinalsTeams(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hadCache]);

  const myFinalsTeam = assigned.find((b) => b.id === myBallkidId)?.finals_team;

  const orderedTeams = [...teams].sort((a, b) => {
    if (a === myFinalsTeam) return -1;
    if (b === myFinalsTeam) return 1;
    return 0;
  });

  let body;
  if (loading) {
    body = <div className="teams-page-empty">Loading finals teams…</div>;
  } else if (assigned.length > 0 && showFinalsTeams) {
    body = (
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
    );
  } else {
    body = (
      <div className="teams-page-empty">
        There are currently no finals teams assigned.
      </div>
    );
  }

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

      {body}
    </div>
  );
}
