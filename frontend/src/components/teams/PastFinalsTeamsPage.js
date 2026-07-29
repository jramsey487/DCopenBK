import React, { useState, useEffect } from "react";

import {
  BallkidLink,
  Banners,
  getAuthHeader,
  getCurrentYear,
} from "../Utils";
import { MATCH_TYPES, POSITIONS } from "../Consts";
import { pastFinalsTeams } from "../HelpMessages";
import { TeamsPageTopBar } from "./TeamsChairpersonShared";
import "./teams-page.css";

function Team({ team, ballkids }) {
  const teamBallkids = ballkids.filter((ballkid) => ballkid.match_type === team);

  return (
    <div className="team-card">
      <div className="team-card-head">
        <div className="team-card-title-group">
          <span className="team-card-title">{team}</span>
          <span className="team-card-count">({teamBallkids.length})</span>
        </div>
      </div>

      <div className="team-card-body">
        {POSITIONS.map((position) => {
          const positionBallkids = teamBallkids.filter(
            (ballkid) => ballkid.position === position
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
                  No {position.toLowerCase()}s on this team.
                </div>
              ) : (
                <div className="team-member-list">
                  {positionBallkids.map((ballkid) => (
                    <BallkidLink
                      key={`${team}_${ballkid.ballkid}`}
                      id={ballkid.ballkid}
                      name={`${ballkid.first_name} ${ballkid.last_name}`}
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

export default function PastFinalsTeamsPage() {
  const defaultYear = getCurrentYear() - 1;
  const [year, setYear] = useState(defaultYear);
  const [ballkids, setBallkids] = useState([]);
  const [loading, setLoading] = useState(true);

  const teams = Object.keys(MATCH_TYPES).map((key) => MATCH_TYPES[key]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/get-past-finals/${year}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(Array.isArray(data) ? data : []))
      .catch(() => setBallkids([]))
      .finally(() => setLoading(false));
  }, [year]);

  const handleYearChange = (e) => {
    const next = parseInt(e.target.value, 10);
    if (!Number.isNaN(next)) {
      setYear(next);
    }
  };

  return (
    <div className="page ballkid-list-page teams-page-shell">
      <Banners />

      <TeamsPageTopBar
        title="Past Finals Teams"
        helpPage="Past Finals Teams"
        helpMessage={pastFinalsTeams}
        controls={
          <div className="past-finals-year-control">
            <label className="past-finals-year-label" htmlFor="past-finals-year">
              Year
            </label>
            <input
              id="past-finals-year"
              className="past-finals-year-input"
              type="number"
              min={2000}
              max={getCurrentYear()}
              value={year}
              onChange={handleYearChange}
              aria-label="Finals year"
            />
          </div>
        }
      />

      {loading ? (
        <div className="teams-page-empty">Loading past finals teams…</div>
      ) : ballkids.length > 0 ? (
        <div className="teams-page-grid">
          {teams.map((team) => (
            <Team key={team} team={team} ballkids={ballkids} />
          ))}
        </div>
      ) : (
        <div className="teams-page-empty">
          No past finals team data for {year}.
        </div>
      )}
    </div>
  );
}
