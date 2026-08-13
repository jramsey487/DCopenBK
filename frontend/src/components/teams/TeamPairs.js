import React, { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined";

import { getAuthHeader, BallkidAndIcon } from "../Utils";
import { PersonPhotoTile, personInitials } from "./TeamsShared";
import { ballkidImageSrc } from "../authStorage";

export function fetchTeamPairs(team) {
  const qs =
    team != null && team !== ""
      ? `?team=${encodeURIComponent(team)}`
      : "";
  return fetch(`/api/team-pairs${qs}`, { headers: getAuthHeader() }).then(
    (response) => {
      if (!response.ok) {
        throw new Error("Failed to load team pairs");
      }
      return response.json();
    }
  );
}

function createTeamPair({ team, position, ballkid_a, ballkid_b }) {
  return fetch("/api/team-pairs", {
    method: "POST",
    headers: getAuthHeader(),
    body: JSON.stringify({ team, position, ballkid_a, ballkid_b }),
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.Error || "Failed to create pair");
    }
    return data;
  });
}

function deleteTeamPair(id) {
  return fetch("/api/team-pairs", {
    method: "DELETE",
    headers: getAuthHeader(),
    body: JSON.stringify({ id }),
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.Error || "Failed to remove pair");
    }
    return data;
  });
}

/** Avatar left, name + meta right — used in photo pair cards. */
function PairMemberRow({ ballkid, showYoe }) {
  const src = ballkidImageSrc(ballkid.image);
  const [failed, setFailed] = useState(false);

  return (
    <div className="team-pair-member">
      <div className="team-pair-member__avatar" aria-hidden="true">
        {src && !failed ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          personInitials(ballkid.first_name, ballkid.last_name)
        )}
      </div>
      <div className="team-pair-member__meta">
        <BallkidAndIcon ballkid={ballkid} showYoe={showYoe} />
      </div>
    </div>
  );
}

/**
 * Optional same-position pairs for a Net or Back section.
 * Captains can tap two unpaired kids to pair; anyone can see existing pairs.
 */
export function TeamPositionPairs({
  team,
  position,
  ballkids,
  pairs,
  onPairsChange,
  canEdit,
  showPhotos,
  showYoe,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const positionPairs = (pairs || []).filter(
    (pair) => pair.team === team && pair.position === position
  );
  const pairedIds = new Set();
  positionPairs.forEach((pair) => {
    pairedIds.add(pair.ballkid_a);
    pairedIds.add(pair.ballkid_b);
  });
  const unpaired = ballkids.filter((b) => !pairedIds.has(b.id));

  const ballkidById = {};
  ballkids.forEach((b) => {
    ballkidById[b.id] = b;
  });

  const refreshHint = canEdit && unpaired.length >= 2;

  const onSelectUnpaired = (ballkid) => {
    if (!canEdit || busy) return;
    setError("");

    if (selectedId == null) {
      setSelectedId(ballkid.id);
      return;
    }

    if (selectedId === ballkid.id) {
      setSelectedId(null);
      return;
    }

    setBusy(true);
    createTeamPair({
      team,
      position,
      ballkid_a: selectedId,
      ballkid_b: ballkid.id,
    })
      .then((pair) => {
        setSelectedId(null);
        onPairsChange((prev) => [...prev, pair]);
      })
      .catch((err) => {
        setError(err.message || "Could not create pair");
        setSelectedId(null);
      })
      .finally(() => setBusy(false));
  };

  const onUnpair = (pairId) => {
    if (!canEdit || busy) return;
    setBusy(true);
    setError("");
    deleteTeamPair(pairId)
      .then(() => {
        onPairsChange((prev) => prev.filter((p) => p.id !== pairId));
      })
      .catch((err) => {
        setError(err.message || "Could not remove pair");
      })
      .finally(() => setBusy(false));
  };

  if (ballkids.length === 0) {
    return (
      <div className="team-position-empty">
        No {position.toLowerCase()}s assigned yet.
      </div>
    );
  }

  if (positionPairs.length === 0 && !canEdit) {
    if (showPhotos) {
      return (
        <div className="team-photo-grid">
          {ballkids.map((ballkid) => (
            <PersonPhotoTile
              key={ballkid.id}
              ballkid={ballkid}
              showYoe={showYoe}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="team-member-list">
        {ballkids.map((ballkid) => (
          <BallkidAndIcon
            key={ballkid.id}
            ballkid={ballkid}
            showYoe={showYoe}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`team-pairs${showPhotos ? " team-pairs--photos" : ""}`}>
      {canEdit ? (
        <div className="team-pairs-hint">
          {refreshHint
            ? selectedId
              ? "Tap another ballkid to pair them."
              : "Optional: tap two ballkids to pair them."
            : positionPairs.length > 0
              ? "Tap the unlink icon to remove a pair."
              : null}
        </div>
      ) : null}

      {error ? <div className="team-pairs-error">{error}</div> : null}

      {positionPairs.length > 0 ? (
        <div className="team-pairs-list">
          {positionPairs.map((pair) => {
            const a = ballkidById[pair.ballkid_a];
            const b = ballkidById[pair.ballkid_b];
            if (!a || !b) return null;

            return (
              <div className="team-pair-card" key={pair.id}>
                <div
                  className={`team-pair-card__members${
                    showPhotos
                      ? " team-pair-card__members--linked"
                      : " team-pair-card__members--stack"
                  }`}
                >
                  {showPhotos ? (
                    <>
                      <PairMemberRow ballkid={a} showYoe={showYoe} />
                      <PairMemberRow ballkid={b} showYoe={showYoe} />
                    </>
                  ) : (
                    <>
                      <BallkidAndIcon ballkid={a} showYoe={showYoe} />
                      <BallkidAndIcon ballkid={b} showYoe={showYoe} />
                    </>
                  )}
                </div>
                {canEdit ? (
                  <Tooltip title="Unpair">
                    <span>
                      <IconButton
                        size="small"
                        className="team-pair-card__unpair"
                        disabled={busy}
                        onClick={() => onUnpair(pair.id)}
                        aria-label="Unpair"
                      >
                        <LinkOffOutlined fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {unpaired.length > 0 ? (
        <div
          className={
            showPhotos
              ? "team-pairs-unpaired team-pairs-unpaired--rows"
              : "team-member-list team-pairs-unpaired"
          }
        >
          {unpaired.map((ballkid) => {
            const selected = selectedId === ballkid.id;
            if (!canEdit) {
              if (showPhotos) {
                return (
                  <PairMemberRow
                    key={ballkid.id}
                    ballkid={ballkid}
                    showYoe={showYoe}
                  />
                );
              }
              return (
                <BallkidAndIcon
                  key={ballkid.id}
                  ballkid={ballkid}
                  showYoe={showYoe}
                />
              );
            }

            return (
              <div
                key={ballkid.id}
                role="button"
                tabIndex={0}
                className={`team-pairs-select team-pairs-select--row is-editable${
                  selected ? " is-selected" : ""
                }`}
                onClick={() => onSelectUnpaired(ballkid)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectUnpaired(ballkid);
                  }
                }}
              >
                {showPhotos ? (
                  <PairMemberRow ballkid={ballkid} showYoe={showYoe} />
                ) : (
                  <BallkidAndIcon
                    ballkid={ballkid}
                    showYoe={showYoe}
                    plainName
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
