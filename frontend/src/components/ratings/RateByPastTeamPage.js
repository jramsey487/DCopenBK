import React, { useState, useEffect } from "react";

import {
  LayoutButtons,
  getAuthHeader,
  getLocalStorage,
  BallkidCard,
  setLocalStorage,
  getDay,
} from "../Utils";
import { rateByPastTeam } from "../HelpMessages";
import {
  RatingsPageShell,
  FilterTogglePill,
  RateBallkidMeta,
  RateActionButton,
} from "./RatingsPageShared";

function BallkidTile({ ballkid, setUpdated, date = null }) {
  if (!ballkid) {
    return null;
  }

  return (
    <div className="ballkid-list-card-wrap">
      <BallkidCard
        ballkid={ballkid}
        renderAdditional={
          <div className="rate-card-actions">
            <div className="rate-card-actions__btn">
              <RateActionButton
                ballkid={ballkid}
                setUpdated={setUpdated}
                date={date}
              />
            </div>
            <RateBallkidMeta
              lines={[`My total ratings: ${ballkid.num_my_ratings}`]}
            />
          </div>
        }
      />
    </div>
  );
}

export default function RateByPastTeamPage() {
  const [ballkids, setBallkids] = useState([]);
  const [unratedBallkids, setUnratedBallkids] = useState([]);
  const [pastTeams, setPastTeams] = useState({});
  const [updated, setUpdated] = useState(false);

  const [showUnrated, setShowUnrated] = useState(
    getLocalStorage("showUnrated") ?? false
  );
  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");
  const pk = getLocalStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/list/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setBallkids(data);
        setUnratedBallkids(
          data.filter(
            (ballkid) => ballkid.num_my_ratings === 0 && ballkid.id !== pk
          )
        );
      });

    fetch("/api/get-past-teams/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setPastTeams(data))
      .then(() => setUpdated(false));
  }, [pk, updated]);

  const pool = showUnrated ? unratedBallkids : ballkids;
  const dates = Object.keys(pastTeams);

  return (
    <RatingsPageShell
      className="rate-by-past-team-page"
      title="Rate by Past Team"
      helpPage="Rate by Past Team"
      helpMessage={rateByPastTeam}
      toolbar={
        <>
          <FilterTogglePill
            checked={showUnrated}
            onChange={(checked) => {
              setShowUnrated(checked);
              setLocalStorage("showUnrated", checked);
            }}
            offLabel="All ballkids"
            onLabel="To rate"
          />
          <LayoutButtons layout={layout} setLayout={setLayout} />
        </>
      }
    >
      {dates.length === 0 ? (
        <div className="rate-empty">There are no past teams to show.</div>
      ) : (
        dates.map((date) => {
          const members = pastTeams[date]
            .map((ballkidId) => pool.find((ballkid) => ballkid.id === ballkidId))
            .filter(Boolean);

          return (
            <section className="rate-past-section" key={date}>
              <div className="rate-past-section-head">
                <h2 className="rate-past-section-title">{date}</h2>
                <span className="ballkid-list-count">({members.length})</span>
              </div>
              {members.length === 0 ? (
                <div className="rate-empty">
                  No ballkids match the current filter for this day.
                </div>
              ) : (
                <div
                  className={
                    layout === "grid"
                      ? "ballkid-list-grid"
                      : "ballkid-list-stack"
                  }
                >
                  {members.map((ballkid) => (
                    <BallkidTile
                      key={`${date}-${ballkid.id}`}
                      ballkid={ballkid}
                      setUpdated={setUpdated}
                      date={getDay(date)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </RatingsPageShell>
  );
}
