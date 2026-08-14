import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Box from "@mui/material/Box";

import {
  getAuthHeader,
  RatingButton,
  DraftRatingButton,
  getBallkidId,
  getLocalStorage,
  useIsMobile,
} from "../Utils";
import {
  ProfilePageShell,
  ProfileLoadingState,
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

export default function BallkidPageCaptain() {
  const [ballkid, setBallkid] = useState(null);
  const [updated, setUpdated] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const { backTo, backLabel } = useProfileBackLink();

  const isMobile = useIsMobile();
  const { pk } = useParams();

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(`/api/get-ballkid/${pk}/${getLocalStorage("ballkid_id")}`, {
        headers: getAuthHeader(),
      }).then((response) => response.json()),
      fetchTournament(),
    ])
      .then(([ballkidData, tournamentData]) => {
        if (cancelled) {
          return;
        }
        setBallkid(ballkidData);
        setShowTeams(Boolean(tournamentData.show_teams));
        setUpdated(false);
      })
      .catch(() => {
        if (!cancelled) {
          setBallkid(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [updated, pk]);

  if (ballkid == null) {
    return <ProfileLoadingState />;
  }

  const myId = getBallkidId();
  const isOwnProfile = myId != null && Number(ballkid.id) === myId;

  const ratingButton = (
    <div className="ballkid-profile-hero-mobile-actions">
      {ballkid.have_draft && !isOwnProfile ? (
        <DraftRatingButton ballkid={ballkid} setUpdated={setUpdated} />
      ) : (
        <RatingButton
          ballkid={ballkid}
          setUpdated={setUpdated}
          isMobile={isMobile}
        />
      )}
    </div>
  );

  return (
    <ProfilePageShell>
      <Box className="ballkid-profile-captain-hero">
        <ProfileBrandedHero
          ballkid={ballkid}
          backTo={backTo}
          backLabel={backLabel}
          actions={ratingButton}
        />
      </Box>

      <ProfileContent>
        <ProfileCard title="Personal info">
          <ProfileInfoRow label="Age" value={ballkid.age} />
          <ProfileInfoRow
            label="Experience"
            value={`${ballkid.num_years_experience} years`}
          />
          <ProfileInfoRow label="Phone" value={ballkid.phone} />
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
