import React, { useState, useEffect } from "react";

import {
  LayoutButtons,
  getAuthHeader,
  getLocalStorage,
  SearchAndFilter,
  filterBallkids,
  BallkidCard,
} from "../Utils";
import { rateByName, rateByNameNonchairperson } from "../HelpMessages";
import {
  RatingsPageShell,
  FilterTogglePill,
  RateBallkidMeta,
  RateActionButton,
} from "./RatingsPageShared";

function getBallkidsToRender(
  ballkids,
  showUnrated,
  showTeam,
  showDrafts,
  myTeam,
  tournamentShowTeams
) {
  const pk = getLocalStorage("ballkid_id");

  if (showTeam && !tournamentShowTeams) {
    return [];
  }

  if (myTeam === 0 && showTeam) {
    return [];
  }

  let ballkidsToRender = ballkids;
  ballkidsToRender = !showUnrated
    ? ballkidsToRender
    : ballkidsToRender.filter(
        (ballkid) => ballkid.num_my_ratings === 0 && ballkid.id !== pk
      );

  ballkidsToRender = !showTeam
    ? ballkidsToRender
    : ballkidsToRender.filter((ballkid) => ballkid.current_team === myTeam);

  ballkidsToRender = !showDrafts
    ? ballkidsToRender
    : ballkidsToRender.filter((ballkid) => ballkid.have_draft === true);

  return ballkidsToRender;
}

function BallkidsSection({ ballkids, layout, setUpdated }) {
  const isChairperson = getLocalStorage("group") === "chairperson";
  const myId = getLocalStorage("ballkid_id");

  if (ballkids.length === 0) {
    return <div className="rate-empty">There are no ballkids to rate.</div>;
  }

  return (
    <div
      className={
        layout === "grid" ? "ballkid-list-grid" : "ballkid-list-stack"
      }
    >
      {ballkids.map((ballkid) => (
        <div className="ballkid-list-card-wrap" key={ballkid.id}>
          <BallkidCard
            ballkid={ballkid}
            renderAdditional={
              <div className="rate-card-actions">
                <div className="rate-card-actions__btn">
                  <RateActionButton
                    ballkid={ballkid}
                    setUpdated={setUpdated}
                  />
                </div>
                <RateBallkidMeta
                  lines={[
                    isChairperson
                      ? `Total ratings: ${ballkid.num_ratings}`
                      : null,
                    `My total ratings: ${
                      ballkid.id === myId ? "—" : ballkid.num_my_ratings
                    }`,
                  ]}
                />
              </div>
            }
          />
        </div>
      ))}
    </div>
  );
}

export default function RateByNamePage() {
  const [ballkids, setBallkids] = useState([]);
  const [myTeam, setMyTeam] = useState();
  const [tournamentShowTeams, setTournamentShowTeams] = useState(false);
  const [updated, setUpdated] = useState(false);

  const isChairperson = getLocalStorage("group") === "chairperson";

  const [showUnrated, setShowUnrated] = useState(false);
  const [showTeam, setShowTeam] = useState(isChairperson ? false : true);
  const [showDrafts, setShowDrafts] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");
  const pk = getLocalStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/list/" + pk, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => {
        setBallkids(data.filter((ballkid) => ballkid.is_cut === false));
        setMyTeam(data.filter((ballkid) => ballkid.id === pk)[0]?.current_team);
      });
    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setTournamentShowTeams(data["show_teams"]))
      .then(() => setUpdated(false));
  }, [pk, updated]);

  const visibleBallkids = filterBallkids(
    getBallkidsToRender(
      ballkids,
      showUnrated,
      showTeam,
      showDrafts,
      myTeam,
      tournamentShowTeams
    ),
    searchKeyword,
    filterGroup
  );

  return (
    <RatingsPageShell
      className="rate-by-name-page"
      title="Rate by Name"
      titleExtra={
        <span className="ballkid-list-count">({visibleBallkids.length})</span>
      }
      helpPage="Rate by Name"
      helpMessage={isChairperson ? rateByName : rateByNameNonchairperson}
      titleEnd={<LayoutButtons layout={layout} setLayout={setLayout} />}
      toolbar={
        <>
          <FilterTogglePill
            checked={showUnrated}
            onChange={setShowUnrated}
            offLabel="All ballkids"
            onLabel="To rate"
          />
          <FilterTogglePill
            checked={showTeam}
            onChange={setShowTeam}
            offLabel="All teams"
            onLabel="My team"
          />
          <FilterTogglePill
            checked={showDrafts}
            onChange={setShowDrafts}
            offLabel="All"
            onLabel="Drafts only"
          />
        </>
      }
    >
      <div className="ballkid-list-toolbar rate-toolbar">
        <div className="ballkid-list-toolbar-search">
          <SearchAndFilter
            setSearchKeyword={setSearchKeyword}
            filterGroup={filterGroup}
            setFilterGroup={setFilterGroup}
          />
        </div>
      </div>

      <BallkidsSection
        ballkids={visibleBallkids}
        layout={layout}
        setUpdated={setUpdated}
      />
    </RatingsPageShell>
  );
}
