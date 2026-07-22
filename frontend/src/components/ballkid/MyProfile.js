import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import Button from "@mui/material/Button";
import Shortcut from "@mui/icons-material/Shortcut";

import { getAuthHeader, getBallkidId } from "../Utils";
import {
  renderBallkidCutHistory,
  FinalsHistoryTable,
  AggregateMetrics,
} from "./BallkidPageChairperson";
import { CheckinHistoryChart } from "./CheckinHistoryChart";
import { CaptainHistoryChart } from "./CaptainHistoryChart";
import {
  ProfilePageShell,
  ProfileLoadingState,
  ProfileErrorState,
  ProfileBrandedHero,
  ProfileTabs,
  ProfileContent,
  ProfilePanel,
  ProfileCard,
  ProfileInfoRow,
  ProfilePositionPills,
} from "./BallkidProfileLayout";

function RatingSection({ ballkid }) {
  const [params, setParams] = useState({});

  useEffect(() => {
    fetch(`/api/calibration-parameters/${ballkid.id}`, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setParams(data));
  }, [ballkid.id]);

  if (!ballkid.is_captain) {
    return null;
  }

  return (
    <ProfileCard
      title="Ratings you've given"
      action={
        <RouterLink to="/my-ratings" className="ballkid-profile-card-action">
          View all →
        </RouterLink>
      }
    >
      <div className="ballkid-profile-card-body--padded">
        <Button
          size="small"
          variant="outlined"
          component={RouterLink}
          to="/my-ratings"
          endIcon={<Shortcut />}
          sx={{ mb: 2 }}
        >
          View all {params.num_rater_ratings} ratings by me
        </Button>
        <ProfileInfoRow
          label="Your avg given"
          value={Number(params.rater_raw_avg).toFixed(3)}
        />
        <ProfileInfoRow
          label="Std deviation"
          value={Number(params.rater_raw_stdev).toFixed(3)}
        />
      </div>
    </ProfileCard>
  );
}

const TABS = [
  { id: "info", label: "Info" },
  { id: "ratings", label: "Ratings" },
  { id: "analytics", label: "Analytics" },
  { id: "history", label: "Finals history" },
  { id: "cuts", label: "Previous cuts" },
];

export default function MyProfile(props) {
  const [ballkid, setBallkid] = useState(null);
  const [showTeams, setShowTeams] = useState(false);
  const [loadState, setLoadState] = useState("loading");
  const [cuts, setCuts] = useState([]);
  const [updated, setUpdated] = useState(false);
  const [tab, setTab] = useState("info");

  const pk = getBallkidId();

  useEffect(() => {
    if (pk === null) {
      setLoadState("no_id");
      setBallkid(null);
      return;
    }

    setLoadState("loading");
    let cancelled = false;

    Promise.all([
      fetch("/api/get-ballkid/" + pk, { headers: getAuthHeader() }).then(
        (response) => (response.ok ? response.json() : Promise.reject(response))
      ),
      fetch("/api/get-cut-history/" + pk, { headers: getAuthHeader() }).then(
        (response) => (response.ok ? response.json() : [])
      ),
      fetch("/api/get-tournament", {
        method: "GET",
        headers: getAuthHeader(),
      }).then((response) =>
        response.ok ? response.json() : { show_teams: false }
      ),
    ])
      .then(([ballkidData, cutsData, tournamentData]) => {
        if (cancelled) {
          return;
        }
        setBallkid(ballkidData);
        setCuts(cutsData);
        setShowTeams(tournamentData.show_teams);
        setLoadState("ready");
        setUpdated(false);
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
  }, [updated, pk]);

  if (loadState === "no_id") {
    return (
      <ProfileErrorState>
        Your account is not linked to a ballkid record. Log out and back in
        after a chairperson links your user, or run{" "}
        <code>create_dev_user</code> for local dev.
      </ProfileErrorState>
    );
  }

  if (loadState === "loading") {
    return <ProfileLoadingState />;
  }

  if (loadState === "error" || ballkid == null) {
    return (
      <ProfileErrorState>
        Could not load your profile. Try refreshing or logging in again.
      </ProfileErrorState>
    );
  }

  const showCurrent =
    ballkid.is_cut !== "true" && ballkid.is_active && showTeams;

  const visibleTabs = ballkid.is_active
    ? TABS
    : TABS.filter((t) => t.id === "info" || t.id === "cuts");

  return (
    <ProfilePageShell>
      <ProfileBrandedHero
        ballkid={ballkid}
        backTo="/list"
        backLabel="Back to roster"
      />

      <ProfileTabs
        tabs={visibleTabs}
        active={tab}
        onChange={setTab}
      />

      <ProfileContent>
        <ProfilePanel id="info" active={tab}>
          <ProfileCard title="Personal info">
            <ProfileInfoRow label="Age" value={ballkid.age} />
            <ProfileInfoRow
              label="Experience"
              value={`${ballkid.num_years_experience} years`}
            />
            <ProfileInfoRow label="Phone" value={ballkid.phone} />
            <ProfileInfoRow
              label="Emergency contact"
              value={ballkid.emergency_name}
            />
            <ProfileInfoRow
              label="Emergency phone"
              value={ballkid.emergency_phone}
            />
            <ProfileInfoRow label="Preferred position">
              <ProfilePositionPills preferred={ballkid.preferred_position} />
            </ProfileInfoRow>
          </ProfileCard>

          {showCurrent ? (
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
          ) : null}
        </ProfilePanel>

        {ballkid.is_active ? (
          <>
            <ProfilePanel id="ratings" active={tab}>
              <RatingSection ballkid={ballkid} />
            </ProfilePanel>

            <ProfilePanel id="analytics" active={tab}>
              <ProfileCard title="Season stats">
                <div className="ballkid-profile-card-body--padded ballkid-profile-season-stats">
                  <AggregateMetrics pk={pk} />
                </div>
              </ProfileCard>
              <ProfileCard title="Check-in history">
                <div className="ballkid-profile-chart-wrap">
                  <CheckinHistoryChart pk={pk} />
                </div>
              </ProfileCard>
              <ProfileCard title="Time under each captain">
                <div className="ballkid-profile-chart-wrap">
                  <CaptainHistoryChart pk={pk} />
                </div>
              </ProfileCard>
            </ProfilePanel>

            <ProfilePanel id="history" active={tab}>
              <ProfileCard title="Finals history" padded>
                <FinalsHistoryTable pk={pk} />
              </ProfileCard>
            </ProfilePanel>
          </>
        ) : null}

        <ProfilePanel id="cuts" active={tab}>
          <ProfileCard title="Previous years' cuts">
            {cuts?.length ? (
              renderBallkidCutHistory(cuts)
            ) : (
              <div className="ballkid-profile-empty">
                No cut history to show.
              </div>
            )}
          </ProfileCard>
        </ProfilePanel>
      </ProfileContent>
    </ProfilePageShell>
  );
}
