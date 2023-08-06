import React, { useState, useEffect } from "react";

import Grid from "@mui/material/Grid";

import { TournamentBanner, getAuthHeader } from "../Utils";
import { MATCH_TYPES } from "../Consts";
import { UnassignedDesktop } from "./TeamsPageChairpersonDesktop";
import { Header, renderTeams } from "./FinalsTeamsPageChairpersonUtils";

export default function FinalsTeamsPageChairpersonDesktop(props) {
  const [assigned, setAssigned] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [updated, setUpdated] = useState(false);

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
    <div className="page">
      <TournamentBanner />

      <Grid container className="justify-top">
        <Grid
          item
          sm={6}
          md={7}
          lg={8}
          xl={9}
          style={{ maxHeight: "85vh", overflow: "auto" }}
        >
          <Header />
          {renderTeams(assigned, teams, setUpdated)}
        </Grid>

        <Grid
          item
          sm={6}
          md={5}
          lg={4}
          xl={3}
          style={{ maxHeight: "85vh", overflow: "auto" }}
        >
          <UnassignedDesktop
            unassigned={unassigned}
            setUpdated={setUpdated}
            isFinalsPage={true}
          />
        </Grid>
      </Grid>
    </div>
  );
}
