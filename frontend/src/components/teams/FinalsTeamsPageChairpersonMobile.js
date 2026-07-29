import React, { useState, useEffect } from "react";

import { Banners, getAuthHeader } from "../Utils";
import { MATCH_TYPES } from "../Consts";
import { UnassignedMobilePanel } from "./TeamsUnassignedMobile";
import { Header, renderTeams } from "./FinalsTeamsPageChairpersonUtils";

export default function FinalsTeamsPageChairpersonMobile(props) {
  const [assigned, setAssigned] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [updated, setUpdated] = useState(false);
  const [showHovercard, setShowHovercard] = useState(true);

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
    <div className="page ballkid-list-page teams-page-shell teams-chairperson-page">
      <Banners />

      <Header
        showHovercard={showHovercard}
        setShowHovercard={setShowHovercard}
      />
      {renderTeams(assigned, teams, showHovercard, setUpdated)}

      <UnassignedMobilePanel
        unassigned={unassigned}
        teams={teams}
        setUpdated={setUpdated}
        isFinalsPage={true}
      />
    </div>
  );
}
