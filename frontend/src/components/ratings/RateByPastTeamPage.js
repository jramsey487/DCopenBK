import React, { useState, useEffect } from "react";

import {
  LayoutButtons,
  getAuthHeader,
  getLocalStorage,
  BallkidCard,
  getDay,
} from "../Utils";
import { rateByPastTeam } from "../HelpMessages";
import {
  RatingsPageShell,
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
  const [pastTeams, setPastTeams] = useState({});
  const [updated, setUpdated] = useState(false);

  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");
  const pk = getLocalStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/list/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(data));

    fetch("/api/get-past-teams/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setPastTeams(data))
      .then(() => setUpdated(false));
  }, [pk, updated]);

  const dates = Object.keys(pastTeams);

  return (
    <RatingsPageShell
      className="rate-by-past-team-page"
      title="Rate by Past Team"
      helpPage="Rate by Past Team"
      helpMessage={rateByPastTeam}
      titleEnd={<LayoutButtons layout={layout} setLayout={setLayout} />}
    >
      {dates.length === 0 ? (
        <div className="rate-empty">There are no past teams to show.</div>
      ) : (
        dates.map((date) => {
          const members = pastTeams[date]
            .map((ballkidId) =>
              ballkids.find((ballkid) => ballkid.id === ballkidId)
            )
            .filter(Boolean);

          return (
            <section className="rate-past-section" key={date}>
              <div className="rate-past-section-head">
                <h2 className="rate-past-section-title">{date}</h2>
                <span className="ballkid-list-count">({members.length})</span>
              </div>
              {members.length === 0 ? (
                <div className="rate-empty">
                  No ballkids to show for this day.
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
