import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

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
  ballkidImageSrc,
  Icons,
} from "../Utils";
import { POSITIONS } from "../Consts";
import { rateByCurrentTeam } from "../HelpMessages";
import "./rate-by-current-team.css";

function personInitials(firstName, lastName) {
  const f = (firstName ?? "").trim()[0] ?? "";
  const l = (lastName ?? "").trim()[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function RatingActionButton({ ballkid, setUpdated }) {
  if (ballkid.id === getLocalStorage("ballkid_id")) {
    return (
      <Button
        variant="outlined"
        disableElevation
        disabled
        size="small"
        sx={{
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: "0.03em",
          borderRadius: "8px",
          px: 2.25,
          py: 0.75,
          color: "#94a3b8",
          borderColor: "#e2e8f0",
          backgroundColor: "#fff",
          "&.Mui-disabled": {
            color: "#94a3b8",
            borderColor: "#e2e8f0",
            backgroundColor: "#fff",
          },
        }}
      >
        GIVE RATING
      </Button>
    );
  }

  return ballkid.have_draft ? (
    <DraftRatingButton ballkid={ballkid} setUpdated={setUpdated} />
  ) : (
    <RatingButton ballkid={ballkid} setUpdated={setUpdated} />
  );
}

function PersonPhotoTile({ ballkid, setUpdated }) {
  const src = ballkidImageSrc(ballkid.image);
  const [failed, setFailed] = useState(false);

  return (
    <div className="rbt-photo-tile">
      <div className="rbt-photo-avatar">
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
      <span className="rbt-photo-name">
        {ballkid.first_name} {ballkid.last_name}
      </span>
      <Icons ballkid={ballkid} margin={0} />

      <div className="rbt-photo-tile-action">
        <RatingActionButton ballkid={ballkid} setUpdated={setUpdated} />
      </div>
    </div>
  );
}

function Team({ team, assigned, nextShifts, setUpdated, showPhotos }) {
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
              ) : showPhotos ? (
                <div className="rbt-photo-grid">
                  {positionAssigned.map((ballkid) => (
                    <PersonPhotoTile
                      key={ballkid.id}
                      ballkid={ballkid}
                      setUpdated={setUpdated}
                    />
                  ))}
                </div>
              ) : (
                <div className="rbt-member-list">
                  {positionAssigned.map((ballkid) => (
                    <div className="rbt-member-row" key={ballkid.id}>
                      <BallkidAndIcon ballkid={ballkid} />
                      <RatingActionButton
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

export default function RateByCurrentTeamsPage(props) {
  const [assigned, setAssigned] = useState([]);
  const [nextShifts, setNextShifts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [showTeams, setShowTeams] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);

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

        <div className="rbt-page-photo-toggle">
          <span className="rbt-page-photo-toggle-label">Show photos</span>
          <button
            type="button"
            className={`rbt-page-photo-toggle-switch${
              showPhotos ? " on" : ""
            }`}
            role="switch"
            aria-checked={showPhotos}
            onClick={() => setShowPhotos(!showPhotos)}
          />
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
              showPhotos={showPhotos}
            />
          ))}
        </div>
      )}
    </div>
  );
}