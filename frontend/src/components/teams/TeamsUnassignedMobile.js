import React, { useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

import {
  SearchAndFilter,
  filterBallkids,
  ConfirmDialog,
  BallkidAndIcon,
  CommentsText,
} from "../Utils";
import {
  assignBallkidToTeam,
  renderCheckoutUnassignedButton,
} from "./TeamsPageChairpersonUtils";
import { CURRENT_TEAMS_MODE } from "./TeamsChairpersonMode";

function preferredPositionLabel(ballkid) {
  if (
    ballkid.preferred_position &&
    String(ballkid.preferred_position).includes("/")
  ) {
    return ballkid.preferred_position;
  }
  return ballkid.position || ballkid.preferred_position || "—";
}

export function UnassignedMobilePanel({
  unassigned,
  teams,
  setUpdated,
  mode = CURRENT_TEAMS_MODE,
}) {
  const [open, setOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [assigningId, setAssigningId] = useState(null);

  const filteredBallkids = filterBallkids(
    unassigned,
    searchKeyword,
    filterGroup
  ).sort((a, b) =>
    `${a.last_name} ${a.first_name}`.localeCompare(
      `${b.last_name} ${b.first_name}`
    )
  );

  const newTeamNumber =
    teams.length === 0 ? 1 : Number(teams[teams.length - 1]) + 1;

  const handleAssign = (ballkid, team) => {
    setAssigningId(ballkid.id);
    assignBallkidToTeam(ballkid, team, mode)
      .then(() => setUpdated(true))
      .finally(() => setAssigningId(null));
  };

  return (
    <Box
      component={Paper}
      elevation={0}
      className={`cut-page-active-panel teams-chairperson-unassigned-panel teams-mobile-unassigned-panel${
        mode.isFinals ? " is-finals" : ""
      }`}
    >
      <ConfirmDialog
        message={`You are about to check out all ${
          unassigned.length
        } unassigned ballkid${unassigned.length > 1 ? "s" : ""}.`}
        url={"/api/checkout-all"}
        body={{
          checkout_group: "unassigned",
        }}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
      />

      <Box className="teams-chairperson-unassigned-panel__head teams-mobile-unassigned-panel__head">
        <Box className="sxs" sx={{ alignItems: "center" }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: "1.15rem",
              color: "#1e293b",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Unassigned
          </Typography>
          <Typography
            component="span"
            variant="body1"
            sx={{
              opacity: 0.5,
              fontWeight: 600,
              fontSize: "0.95rem",
              fontFamily: "Inter, sans-serif",
              ml: 0.5,
            }}
          >
            ({filteredBallkids.length})
          </Typography>
        </Box>

        {unassigned.length === 0 || !mode.showCheckout
          ? ""
          : renderCheckoutUnassignedButton(setOpen)}
      </Box>

      <Typography
        className="teams-chairperson-drop-hint"
        variant="body2"
        sx={{ color: "#64748b", mb: 2, fontSize: "0.8rem", lineHeight: 1.45 }}
      >
        Tap a team to assign someone. Use team cards above to unassign or check
        out.
      </Typography>

      <Box className="teams-chairperson-unassigned-search" sx={{ mb: 2, width: "100%" }}>
        <SearchAndFilter
          stacked
          setSearchKeyword={setSearchKeyword}
          filterGroup={filterGroup}
          setFilterGroup={setFilterGroup}
          filters={mode.poolFilters}
        />
      </Box>

      {unassigned.length === 0 ? (
        <Typography sx={{ opacity: 0.7, fontSize: "0.9rem" }}>
          {mode.emptyUnassignedCopy}
        </Typography>
      ) : filteredBallkids.length === 0 ? (
        <Typography sx={{ opacity: 0.7, fontSize: "0.9rem" }}>
          No ballkids match your search or filters.
        </Typography>
      ) : (
        <div className="teams-mobile-unassigned-table">
          <div className="teams-mobile-unassigned-table__head">
            <span>Name</span>
            <span>Preferred Position</span>
            <span>Assign to team</span>
          </div>

          {filteredBallkids.map((ballkid) => (
            <div
              key={ballkid.id}
              className="teams-mobile-unassigned-table__row"
            >
              <div className="teams-mobile-unassigned-table__name">
                <BallkidAndIcon ballkid={ballkid} />
                {mode.isFinals ? (
                  ""
                ) : (
                  <CommentsText
                    ballkid={ballkid}
                    commentType="checkout_teams"
                  />
                )}
              </div>
              <div className="teams-mobile-unassigned-table__position">
                {preferredPositionLabel(ballkid)}
              </div>
              <div className="teams-mobile-unassigned-assign-col">
                {teams.map((team) => (
                  <Button
                    key={`${ballkid.id}-${team}`}
                    size="small"
                    variant="outlined"
                    color="primary"
                    disabled={assigningId === ballkid.id}
                    className="teams-mobile-assign-team-btn"
                    onClick={() => handleAssign(ballkid, team)}
                  >
                    {team}
                  </Button>
                ))}
                {mode.showNewTeamAssign ? (
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    disabled={assigningId === ballkid.id}
                    className="teams-mobile-assign-team-btn teams-mobile-assign-team-btn--new"
                    onClick={() => handleAssign(ballkid, newTeamNumber)}
                  >
                    New team
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </Box>
  );
}