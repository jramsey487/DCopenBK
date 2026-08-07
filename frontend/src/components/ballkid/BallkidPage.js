import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getAuthHeader } from "../Utils";
import {
  ProfilePageShell,
  ProfileLoadingState,
  ProfileErrorState,
  ProfileBrandedHero,
  ProfileContent,
  ProfileCard,
  ProfileInfoRow,
  ProfilePositionPills,
} from "./BallkidProfileLayout";
import "../team-chips.css";

export default function BallkidPage(props) {
  const [ballkid, setBallkid] = useState(null);
  const [showTeams, setShowTeams] = useState(false);
  const [loadState, setLoadState] = useState("loading");

  const { pk } = useParams();

  useEffect(() => {
    setLoadState("loading");
    let cancelled = false;

    Promise.all([
      fetch("/api/get-ballkid/" + pk, { headers: getAuthHeader() }).then(
        (response) => (response.ok ? response.json() : Promise.reject(response))
      ),
      fetch("/api/get-tournament", {
        method: "GET",
        headers: getAuthHeader(),
      }).then((response) =>
        response.ok ? response.json() : { show_teams: false }
      ),
    ])
      .then(([ballkidData, tournamentData]) => {
        if (cancelled) {
          return;
        }
        setBallkid(ballkidData);
        setShowTeams(tournamentData.show_teams);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setBallkid(null);
          setLoadState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pk]);

  if (loadState === "loading") {
    return <ProfileLoadingState />;
  }

  if (loadState === "error" || ballkid == null) {
    return (
      <ProfileErrorState>
        Could not load this profile. Try refreshing or heading back to the
        roster.
      </ProfileErrorState>
    );
  }

  const showCurrent =
    ballkid.is_cut !== "true" &&
    ballkid.is_cut !== true &&
    ballkid.is_active &&
    showTeams;

  return (
    <ProfilePageShell>
      <ProfileBrandedHero
        ballkid={ballkid}
        backTo="/list"
        backLabel="Back to roster"
      />

      <ProfileContent>
        <ProfileCard title="Info">
          <ProfileInfoRow
            label="Experience"
            value={`${ballkid.num_years_experience} years`}
          />
          <ProfileInfoRow label="Preferred position">
            <ProfilePositionPills preferred={ballkid.preferred_position} />
          </ProfileInfoRow>
        </ProfileCard>

        {showCurrent ? (
          <ProfileCard title="Current tournament">
            <ProfileInfoRow label="Position">
              <ProfilePositionPills preferred={ballkid.position} />
            </ProfileInfoRow>
            <ProfileInfoRow label="Current team">
              {ballkid.current_team === 0 ? (
                "Unassigned"
              ) : (
                <span className={`chip t${ballkid.current_team}`}>
                  {ballkid.current_team}
                </span>
              )}
            </ProfileInfoRow>
          </ProfileCard>
        ) : null}
      </ProfileContent>
    </ProfilePageShell>
  );
}