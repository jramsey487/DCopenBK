import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Box from "@mui/material/Box";

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
  ProfilePositionPills,
} from "./BallkidProfileLayout";
import "../team-chips.css";

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

  const ratingButton = isOwnProfile ? null : (
    <div className="ballkid-profile-hero-mobile-actions">
      {ballkid.have_draft ? (
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

  const showCurrentInfo = !ballkid.is_cut && ballkid.is_active && showTeams;

  return (
    <ProfilePageShell>
      <Box className="ballkid-profile-captain-hero">
        <ProfileBrandedHero ballkid={ballkid} actions={ratingButton} />
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
            <ProfilePositionPills preferred={ballkid.preferred_position} />
          </ProfileInfoRow>
        </ProfileCard>

        {!showCurrentInfo ? null : (
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
        )}
      </ProfileContent>
    </ProfilePageShell>
  );
}