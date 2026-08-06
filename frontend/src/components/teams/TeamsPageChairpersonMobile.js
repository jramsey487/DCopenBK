import React, { useState, useEffect } from "react";

import { getAuthHeader, Banners, getToday } from "../Utils";
import { UnassignedMobilePanel } from "./TeamsUnassignedMobile";
import {
  Teams,
  Header,
  ActionsButtons,
} from "./TeamsPageChairpersonUtils";
import { courtNotesToMap, fetchCourtNotes } from "./CourtNote";

export default function TeamsPageChairpersonMobile(props) {
  const [assigned, setAssigned] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [nextShifts, setNextShifts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [updated, setUpdated] = useState(false);
  const [courtNotes, setCourtNotes] = useState({});

  useEffect(() => {
    fetch("/api/sorted-list?rank=0", { headers: getAuthHeader() })
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

    fetchCourtNotes(getToday())
      .then((data) => setCourtNotes(courtNotesToMap(data)))
      .catch(() => setCourtNotes({}));
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
      <Teams
        assigned={assigned}
        teams={teams}
        nextShifts={nextShifts}
        setUpdated={setUpdated}
        courtNotes={courtNotes}
        setCourtNotes={setCourtNotes}
      />
      <UnassignedMobilePanel
        unassigned={unassigned}
        teams={teams}
        setUpdated={setUpdated}
      />
    </div>
  );
}
