import React, { useState, useEffect } from "react";

import { Banners, getAuthHeader } from "../Utils";
import { MATCH_TYPES } from "../Consts";
import { UnassignedMobile } from "./TeamsPageChairpersonMobile";
import { Header, renderTeams } from "./FinalsTeamsPageChairpersonUtils";

export default function FinalsTeamsPageChairpersonMobile(props) {
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
      <Banners />

      <Header />
      {renderTeams(assigned, teams, setUpdated)}

      <UnassignedMobile
        unassigned={unassigned}
        teams={teams}
        setUpdated={setUpdated}
        isFinalsPage={true}
      />
    </div>
  );
}
