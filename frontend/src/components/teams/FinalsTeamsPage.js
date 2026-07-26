import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import { getAuthHeader, BallkidAndIcon, HelpIcon, Banners } from "../Utils";
import { MATCH_TYPES, POSITIONS } from "../Consts";
import { finalsTeamsNonchairperson } from "../HelpMessages";
import "./teams-page.css";

function Team({ team, assigned }) {
  const teamAssigned = assigned.filter(
    (ballkid) => ballkid.finals_team === team
  );

  return (
    <div className="team-card">
      <div className="team-card-head">
        <div className="team-card-title-group">
          <span className="team-card-title">{team}</span>
          <span className="team-card-count">({teamAssigned.length})</span>
        </div>
      </div>

      <div className="team-card-body">
        {POSITIONS.map((position) => {
          const positionAssigned = teamAssigned.filter(
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
                <div className="team-member-list">
                  {positionAssigned.map((ballkid) => (
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

export default function FinalsTeamsPage(props) {
  const [assigned, setAssigned] = useState([]);
  const [showFinalsTeams, setShowFinalsTeams] = useState(false);

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

  return (
    <div className="page teams-page-shell">
      <Banners />

      <Box className="teams-page-header">
        <div className="teams-page-title-row">
          <Typography className="teams-page-title" variant="h4">
            Finals Teams
          </Typography>
          <HelpIcon page="Finals Teams" message={finalsTeamsNonchairperson} />
        </div>
      </Box>

      {assigned.length > 0 && showFinalsTeams ? (
        <div className="teams-page-grid">
          {teams.map((team) => (
            <Team key={team} team={team} assigned={assigned} />
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