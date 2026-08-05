import React, { useState, useEffect } from "react";
import { useDrop } from "react-dnd";

import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

import {
  getAuthHeader,
  SearchAndFilter,
  filterBallkids,
  ConfirmDialog,
  Banners,
} from "../Utils";
import { POSITIONS } from "../Consts";
import {
  Teams,
  Header,
  renderCheckoutUnassignedButton,
  ActionsButtons,
} from "./TeamsPageChairpersonUtils";
import { DraggableBallkidRow } from "../BallkidChip";

export function UnassignedPanel({
  unassigned,
  setUpdated,
  showHovercard = false,
  isFinalsPage = false,
}) {
  const [open, setOpen] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();

  const filteredCount = filterBallkids(
    unassigned,
    searchKeyword,
    filterGroup
  ).length;

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) => {
      const teamAssignDict = isFinalsPage
        ? { finals_team: "" }
        : { current_team: 0 };

      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          ...teamAssignDict,
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true));
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Box
      component={Paper}
      ref={dropRef}
      elevation={0}
      className="cut-page-active-panel teams-chairperson-unassigned-panel"
      sx={{
        borderRadius: "16px",
        border: isOver ? "2px solid #2563eb" : "1px solid",
        borderColor: isOver ? "primary.main" : "divider",
        backgroundColor: "background.paper",
        boxShadow: isOver
          ? "0 10px 25px -5px rgba(13, 27, 62, 0.08)"
          : "0 1px 3px 0 rgba(13, 27, 62, 0.04)",
      }}
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

      <Box
        className="teams-chairperson-unassigned-panel__head"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 1.5,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
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
            ({filteredCount})
          </Typography>
        </Box>

        {unassigned.length === 0 || isFinalsPage
          ? ""
          : renderCheckoutUnassignedButton(setOpen)}
      </Box>

      <Typography
        className="teams-chairperson-drop-hint"
        variant="body2"
        sx={{ color: "#64748b", mb: 2, fontSize: "0.8rem", lineHeight: 1.45 }}
      >
        Drag ballkids onto a team card to assign them, or drop here to unassign.
      </Typography>

      <Box className="teams-chairperson-unassigned-search" sx={{ mb: 2.5, width: "100%", minWidth: 0 }}>
        <SearchAndFilter
          stacked
          setSearchKeyword={setSearchKeyword}
          filterGroup={filterGroup}
          setFilterGroup={setFilterGroup}
          filters={
            isFinalsPage
              ? ["rookie", "supervet", "captain", "back", "net"]
              : ["rookie", "supervet", "captain", "chairperson", "back", "net"]
          }
        />
      </Box>

      {unassigned.length === 0 ? (
        <Typography sx={{ opacity: 0.7, fontSize: "0.9rem", fontFamily: "Inter, sans-serif" }}>
          There are currently no {isFinalsPage ? "" : "checked in "}
          ballkids who are unassigned.
        </Typography>
      ) : (
        POSITIONS.map((position) => {
          const ballkids = filterBallkids(
            unassigned,
            searchKeyword,
            filterGroup
          ).filter((ballkid) => ballkid.position === position);

          return (
            <div className="teams-chairperson-position-block" key={position}>
              <div className="cut-page-section-label">
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.08em",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {position}s
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    opacity: 0.55,
                    fontWeight: 600,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  ({ballkids.length})
                </Typography>
              </div>

              {ballkids.length === 0 ? (
                <div className="team-position-empty">
                  No {position.toLowerCase()}s in this pool.
                </div>
              ) : (
                <div className="teams-chairperson-unassigned-grid teams-chairperson-unassigned-grid--in-panel">
                  {ballkids.map((ballkid) => (
                    <DraggableBallkidRow
                      key={ballkid.id}
                      ballkid={ballkid}
                      commentTypes={
                        isFinalsPage ? ["rank", "experience"] : ["checkout_teams"]
                      }
                      showHovercard={showHovercard}
                      hoverCommentTypes={
                        isFinalsPage
                          ? ["experience", "rank", "calibrated_avg"]
                          : []
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </Box>
  );
}

/** @deprecated use UnassignedPanel */
export const UnassignedDesktop = UnassignedPanel;

export default function TeamsPageChairpersonDesktop(props) {
  const [assigned, setAssigned] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [nextShifts, setNextShifts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setAssigned(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === true && ballkid.current_team > 0
          )
        );
        setUnassigned(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === true && ballkid.current_team === 0
          )
        );
      });

    fetch("/api/calc-num-teams", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTeams(data["teams"]));

    fetch("/api/get-next-shifts", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setNextShifts(data))
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page ballkid-list-page teams-page-shell teams-chairperson-page">
      <Banners />

      <Header
        topBarActions={
          <ActionsButtons
            numAssigned={assigned.length}
            setUpdated={setUpdated}
          />
        }
      />

      <Grid container className="justify-top teams-chairperson-split" spacing={2}>
        <Grid
          item
          xs={12}
          md={7}
          lg={8}
          xl={9}
          className="teams-chairperson-main"
        >
          <Teams
            assigned={assigned}
            teams={teams}
            nextShifts={nextShifts}
            setUpdated={setUpdated}
          />
        </Grid>

        <Grid
          item
          xs={12}
          md={5}
          lg={4}
          xl={3}
          className="teams-chairperson-sidebar"
        >
          <UnassignedPanel unassigned={unassigned} setUpdated={setUpdated} />
        </Grid>
      </Grid>
    </div>
  );
}
