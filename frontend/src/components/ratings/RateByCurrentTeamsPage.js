import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import {
  getAuthHeader,
  RatingButton,
  getLocalStorage,
  isCurrentHour,
  CourtAssignment,
  BallkidAndIcon,
  HelpIcon,
  Banners,
  DraftRatingButton,
} from "../Utils";
import { POSITIONS } from "../Consts";
import { rateByCurrentTeam } from "../HelpMessages";
import "./rate-by-current-team.css";

function Team({ team, assigned, nextShifts, setUpdated }) {
  const isCurrentlyOn =
    nextShifts.length > 0 && isCurrentHour(nextShifts[0]["start"]);

  return (
    <div className={`rbt-team-card${isCurrentlyOn ? " is-on-court" : ""}`}>
      <div className="rbt-team-card-head">
        <div className="rbt-team-card-title-group">
          <span className="rbt-team-card-title">Team {team}</span>
          <span className="rbt-team-card-count">({assigned.length})</span>
          {isCurrentlyOn ? (
            <span className="rbt-team-card-oncourt-badge">On court</span>
          ) : null}
        </div>
        <span className="rbt-team-card-assignment">
          <CourtAssignment nextShifts={nextShifts} />
        </span>
      </div>

      <div className="rbt-team-card-body">
        {POSITIONS.map((position) => {
          const positionAssigned = assigned.filter(
            (ballkid) => ballkid.position === position
          );

          return (
            <div className="rbt-position-block" key={position}>
              <div className="rbt-position-head">
                <span className="rbt-position-label">{position}s</span>
                <span className="rbt-position-count">
                  ({positionAssigned.length})
                </span>
              </div>

              {positionAssigned.length === 0 ? (
                <div className="rbt-position-empty">
                  No {position.toLowerCase()}s assigned yet.
                </div>
              ) : (
                <div className="rbt-member-list">
                  {positionAssigned.map((ballkid) => (
                    <div className="rbt-member-row" key={ballkid.id}>
                      <BallkidAndIcon ballkid={ballkid} />

                      {ballkid.id === getLocalStorage("ballkid_id") ? (
                        ""
                      ) : ballkid.have_draft ? (
                        <DraftRatingButton
                          ballkid={ballkid}
                          setUpdated={setUpdated}
                        />
                      ) : (
                        <RatingButton
                          ballkid={ballkid}
                          setUpdated={setUpdated}
                        />
                      )}
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

export default function RateByCurrentTeamsPage(props) {
  const [assigned, setAssigned] = useState([]);
  const [nextShifts, setNextShifts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [showTeams, setShowTeams] = useState(false);
  const [updated, setUpdated] = useState(false);

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

  return (
    <div className="page rbt-page-shell">
      <Banners />

      <Box className="rbt-page-header">
        <div className="rbt-page-title-row">
          <Typography className="rbt-page-title" variant="h4">
            Rate by Current Team
          </Typography>
          <HelpIcon page="Rate by Current Team" message={rateByCurrentTeam} />
        </div>
      </Box>

      {assigned.length === 0 || (group !== "chairperson" && !showTeams) ? (
        <div className="rbt-page-empty">
          There are currently no teams assigned.
        </div>
      ) : (
        <div className="rbt-page-grid">
          {teams.map((team) => (
            <Team
              key={team}
              team={team}
              assigned={assigned.filter(
                (ballkid) => ballkid.current_team === team
              )}
              nextShifts={nextShifts.filter((shift) => shift.team === team)}
              setUpdated={setUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}