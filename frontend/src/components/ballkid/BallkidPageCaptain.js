import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getAuthHeader,
  RatingButton,
  DraftRatingButton,
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
} from "./BallkidProfileLayout";

function positionPillVariant(position) {
  const key = (position ?? "").toLowerCase();
  if (key === "net") return "ballkid-profile-pill--net";
  if (key === "back") return "ballkid-profile-pill--back";
  return "ballkid-profile-pill--rookie";
}

export default function BallkidPageCaptain(props) {
  const [ballkid, setBallkid] = useState(null);
  const [updated, setUpdated] = useState(false);
  const [showTeams, setShowTeams] = useState(false);

  const isMobile = useIsMobile();
  const { pk } = useParams();

  useEffect(() => {
    fetch(`/api/get-ballkid/${pk}/${getLocalStorage("ballkid_id")}`, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setBallkid(data))
      .then(() => setUpdated(false));

    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setShowTeams(data["show_teams"]));
  }, [updated, pk]);

  if (ballkid == null) {
    return <ProfileLoadingState />;
  }

  const isOwnProfile = ballkid.id === getLocalStorage("ballkid_id");

  const ratingButton = isOwnProfile ? null : ballkid.have_draft ? (
    <DraftRatingButton ballkid={ballkid} setUpdated={setUpdated} />
  ) : (
    <RatingButton
      ballkid={ballkid}
      setUpdated={setUpdated}
      isMobile={isMobile}
    />
  );

  const showCurrentInfo = !ballkid.is_cut && ballkid.is_active && showTeams;

  return (
    <ProfilePageShell>
      <ProfileBrandedHero ballkid={ballkid} actions={ratingButton} />

      <ProfileContent>
        <ProfileCard title="Personal info">
          <ProfileInfoRow label="Age" value={ballkid.age} />
          <ProfileInfoRow
            label="Experience"
            value={`${ballkid.num_years_experience} years`}
          />
          <ProfileInfoRow label="Phone" value={ballkid.phone} />
          <ProfileInfoRow label="Preferred position">
            <span
              className={`ballkid-profile-pill ${positionPillVariant(
                ballkid.preferred_position
              )}`}
            >
              {ballkid.preferred_position}
            </span>
          </ProfileInfoRow>
        </ProfileCard>

        {!showCurrentInfo ? null : (
          <ProfileCard title="Current tournament">
            <ProfileInfoRow label="Position" value={ballkid.position} />
            <ProfileInfoRow
              label="Current team"
              value={
                ballkid.current_team === 0
                  ? "Unassigned"
                  : ballkid.current_team
              }
            />
          </ProfileCard>
        )}
      </ProfileContent>
    </ProfilePageShell>
  );
}