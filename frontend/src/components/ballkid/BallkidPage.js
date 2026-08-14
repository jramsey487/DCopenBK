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
  ProfileCurrentTournamentCard,
  fetchTournament,
  shouldShowCurrentTournament,
  useProfileBackLink,
} from "./BallkidProfileLayout";

export default function BallkidPage() {
  const [ballkid, setBallkid] = useState(null);
  const [showTeams, setShowTeams] = useState(false);
  const [loadState, setLoadState] = useState("loading");
  const { backTo, backLabel } = useProfileBackLink();

  const { pk } = useParams();

  useEffect(() => {
    setLoadState("loading");
    let cancelled = false;

    Promise.all([
      fetch("/api/get-ballkid/" + pk, { headers: getAuthHeader() }).then(
        (response) => (response.ok ? response.json() : Promise.reject(response))
      ),
      fetchTournament(),
    ])
      .then(([ballkidData, tournamentData]) => {
        if (cancelled) {
          return;
        }
        setBallkid(ballkidData);
        setShowTeams(Boolean(tournamentData.show_teams));
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

  return (
    <ProfilePageShell>
      <ProfileBrandedHero
        ballkid={ballkid}
        backTo={backTo}
        backLabel={backLabel}
      />

      <ProfileContent>
        <ProfileCard title="Info">
          <ProfileInfoRow
            label="Experience"
            value={`${ballkid.num_years_experience} years`}
          />
          <ProfileInfoRow label="Preferred position">
            <ProfilePositionPills value={ballkid.preferred_position} />
          </ProfileInfoRow>
        </ProfileCard>

        {shouldShowCurrentTournament(ballkid, showTeams) ? (
          <ProfileCurrentTournamentCard ballkid={ballkid} />
        ) : null}
      </ProfileContent>
    </ProfilePageShell>
  );
}
