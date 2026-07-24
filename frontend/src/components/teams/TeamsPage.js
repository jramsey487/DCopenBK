import React, { useState, useEffect } from "react";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
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
import { ON_COURT_GREEN, POSITIONS } from "../Consts";
import { teamsNonchairperson } from "../HelpMessages";

const NAVY = "#0d1b3e";
const TEXT2 = "#64748b";
const BORDER = "#e2e8f0";
const BG0 = "#f8fafc";

function personInitials(firstName, lastName) {
  const f = (firstName ?? "").trim()[0] ?? "";
  const l = (lastName ?? "").trim()[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function PersonPhotoTile({ ballkid }) {
  const src = ballkidImageSrc(ballkid.image);
  const [failed, setFailed] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 84,
        textAlign: "center",
        gap: 0.5,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          overflow: "hidden",
          border: `1px solid ${BORDER}`,
          backgroundColor: BG0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          color: NAVY,
          fontSize: 18,
        }}
      >
        {src && !failed ? (
          <img
            src={src}
            alt=""
            onError={() => setFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          personInitials(ballkid.first_name, ballkid.last_name)
        )}
      </Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: NAVY, lineHeight: 1.25 }}>
        {ballkid.first_name} {ballkid.last_name}
      </Typography>
      <Icons ballkid={ballkid} margin={0} />
    </Box>
  );
}

function Team({ team, assigned, nextShifts, isMyTeam, showPhotos }) {
  const isCurrentlyOn =
    nextShifts.length > 0 && isCurrentHour(nextShifts[0]["start"]);

  return (
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
      <Card
        sx={{
          mb: 2,
          backgroundColor: isCurrentlyOn ? ON_COURT_GREEN : "#fff",
          border: isMyTeam ? `2px solid ${NAVY}` : `1px solid ${BORDER}`,
          borderRadius: "12px",
          boxShadow: isMyTeam
            ? "0 4px 14px rgba(13, 27, 62, 0.12)"
            : "0 1px 4px rgba(13, 27, 62, 0.04)",
        }}
      >
        <CardContent>
          <div className="justify">
            <div className="sxs">
              <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY }}>
                Team {team}
              </Typography>
              <Typography variant="subtitle1" sx={{ ml: 1, color: TEXT2 }}>
                ({assigned.length})
              </Typography>
              {isMyTeam ? (
                <Chip
                  label="Your team"
                  size="small"
                  sx={{
                    ml: 1,
                    backgroundColor: "#eef1f6",
                    color: NAVY,
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                />
              ) : null}
            </div>
            <CourtAssignment nextShifts={nextShifts} />
          </div>

          {POSITIONS.map((position) => {
            const positionBallkids = assigned.filter(
              (ballkid) =>
                ballkid.current_team === team && ballkid.position === position
            );

            return (
              <div key={position}>
                <Divider sx={{ mt: 1.5, mb: 1.5 }} />
                <div className="sxs" style={{ marginBottom: 8 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: NAVY }}>
                    {position}s
                  </Typography>
                  <Typography variant="subtitle2" sx={{ ml: 1, color: TEXT2 }}>
                    ({positionBallkids.length})
                  </Typography>
                </div>

                {showPhotos ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                    {positionBallkids.map((ballkid) => (
                      <PersonPhotoTile key={ballkid.id} ballkid={ballkid} />
                    ))}
                  </Box>
                ) : (
                  positionBallkids.map((ballkid) => (
                    <BallkidAndIcon key={ballkid.id} ballkid={ballkid} />
                  ))
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </Grid>
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
    <div className="page">
      <Banners />

      <Box className="justify" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box className="sxs">
          <Typography variant="h4" sx={{ fontWeight: 700, color: NAVY }}>
            Current Teams
          </Typography>
          &thinsp;
          <HelpIcon page="Teams" message={teamsNonchairperson} />
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={showPhotos}
              onChange={(e) => setShowPhotos(e.target.checked)}
            />
          }
          label="Show photos"
        />
      </Box>

      {assigned.length > 0 && showTeams ? (
        <Grid container spacing={2}>
          {orderedTeams.map((team) => (
            <Team
              key={team}
              team={team}
              assigned={assigned.filter((ballkid) => ballkid.current_team === team)}
              nextShifts={nextShifts.filter((shift) => shift.team === team)}
              isMyTeam={team === myTeam}
              showPhotos={showPhotos}
            />
          ))}
        </Grid>
      ) : (
        <Typography variant="body1">
          There are currently no teams assigned.
        </Typography>
      )}
    </div>
  );
}