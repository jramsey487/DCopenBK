import React, { useState, useEffect } from "react";

import Grid from "@mui/material/Grid";

import { Banners, getAuthHeader } from "../Utils";
import { MATCH_TYPES } from "../Consts";
import { UnassignedPanel } from "./TeamsPageChairpersonDesktop";
import { Header, renderTeams } from "./TeamsPageChairpersonUtils";

export default function FinalsTeamsPageChairpersonDesktop(props) {
  const [assigned, setAssigned] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [updated, setUpdated] = useState(false);

  const [showHovercard, setShowHovercard] = useState(false);

  const teams = Object.keys(MATCH_TYPES).map((key) => MATCH_TYPES[key]);

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setAssigned(
          data.filter(
            (ballkid) => ballkid.finals_team && !ballkid.is_chairperson
          )
        );
        setUnassigned(
          data.filter(
            (ballkid) => !ballkid.finals_team && !ballkid.is_chairperson
          )
        );
      })
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page ballkid-list-page teams-page-shell teams-chairperson-page teams-chairperson-page--finals">
      <Banners />

      <Header
        showHovercard={showHovercard}
        setShowHovercard={setShowHovercard}
        isFinalsPage={true}
      />

      <Grid container className="justify-top teams-chairperson-split" spacing={2}>
        <Grid
          item
          xs={12}
          md={7}
          lg={7}
          xl={8}
          className="teams-chairperson-main"
        >
          {renderTeams(assigned, teams, showHovercard, setUpdated)}
        </Grid>

        <Grid
          item
          xs={12}
          md={5}
          lg={5}
          xl={4}
          className="teams-chairperson-sidebar"
        >
          <UnassignedPanel
            unassigned={unassigned}
            setUpdated={setUpdated}
            showHovercard={showHovercard}
            isFinalsPage={true}
          />
        </Grid>
      </Grid>
    </div>
  );
}
