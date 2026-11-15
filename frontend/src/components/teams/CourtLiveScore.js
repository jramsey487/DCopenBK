import React from "react";

import { liveMatchForCourt, useLiveScores } from "../useLiveScores";
import "./live-score.css";

function lastNames(names) {
  return (names || [])
    .map((name) => String(name).trim().split(/\s+/).slice(-1)[0])
    .filter(Boolean)
    .join(" / ");
}

function SetScore({ set, side }) {
  const mine = side === "a" ? set.a : set.b;
  const theirs = side === "a" ? set.b : set.a;
  const tiebreak = side === "a" ? set.tb_a : set.tb_b;
  if (mine === null || mine === undefined) {
    return <span className="live-score__set">–</span>;
  }
  // Show tiebreak points on the side that lost the tiebreak set.
  const showTb =
    tiebreak !== null &&
    tiebreak !== undefined &&
    theirs !== null &&
    mine < theirs;
  return (
    <span className="live-score__set">
      {mine}
      {showTb ? <sup>{tiebreak}</sup> : null}
    </span>
  );
}

/** Live score for whatever is being played on `court`, or nothing. */
export default function CourtLiveScore({ court }) {
  const scores = useLiveScores();
  const match = liveMatchForCourt(scores, court);

  if (!match) {
    return null;
  }

  return (
    <div className="live-score" aria-label={`Live score on ${match.court}`}>
      <div className="live-score__head">
        <span className="live-score__dot" aria-hidden="true" />
        Live on {match.court}
      </div>
      {["a", "b"].map((side) => (
        <div className="live-score__row" key={side}>
          <span className="live-score__name">
            {lastNames(match.players?.[side]) || "TBD"}
          </span>
          {(match.sets || []).map((set) => (
            <SetScore key={set.number} set={set} side={side} />
          ))}
          <span className="live-score__point">{match.point?.[side] || ""}</span>
        </div>
      ))}
    </div>
  );
}