import React, { useEffect, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import LinkOffOutlined from "@mui/icons-material/LinkOffOutlined";

import { getAuthHeader, BallkidAndIcon } from "../Utils";
import { personInitials } from "./TeamsShared";
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

/** Keep pair members in roster order so create/sync never visually swaps them. */
function orderPairMembers(a, b, ballkids) {
  if (!a || !b) return [a, b];
  const indexA = ballkids.findIndex((k) => k.id === a.id);
  const indexB = ballkids.findIndex((k) => k.id === b.id);
  if (indexA === -1 || indexB === -1) {
    return a.id <= b.id ? [a, b] : [b, a];
  }
  return indexA <= indexB ? [a, b] : [b, a];
}

function orderPairIds(idA, idB, ballkids) {
  const [first, second] = orderPairMembers(
    { id: idA },
    { id: idB },
    ballkids
  );
  return [first.id, second.id];
}

/** Avatar left, name + meta right — used in photo pair cards. */
function PairMemberRow({ ballkid, showYoe, plainName = false }) {
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
        <BallkidAndIcon
          ballkid={ballkid}
          showYoe={showYoe}
          plainName={plainName}
        />
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

  useEffect(() => {
    if (!canEdit) {
      setSelectedId(null);
      setError("");
    }
  }, [canEdit]);

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

    const [ballkidA, ballkidB] = orderPairIds(
      selectedId,
      ballkid.id,
      ballkids
    );
    const tempId = `temp-${ballkidA}-${ballkidB}`;
    const optimisticPair = {
      id: tempId,
      team,
      position,
      ballkid_a: ballkidA,
      ballkid_b: ballkidB,
    };

    // Show the pair immediately; sync with the server in the background.
    setSelectedId(null);
    onPairsChange((prev) => [...prev, optimisticPair]);
    setBusy(true);
    if (typeof document !== "undefined" && document.activeElement?.blur) {
      document.activeElement.blur();
    }

    createTeamPair({
      team,
      position,
      ballkid_a: ballkidA,
      ballkid_b: ballkidB,
    })
      .then((pair) => {
        const [firstId, secondId] = orderPairIds(
          pair.ballkid_a,
          pair.ballkid_b,
          ballkids
        );
        onPairsChange((prev) =>
          prev.map((p) =>
            p.id === tempId
              ? { ...pair, ballkid_a: firstId, ballkid_b: secondId }
              : p
          )
        );
      })
      .catch((err) => {
        onPairsChange((prev) => prev.filter((p) => p.id !== tempId));
        setError(err.message || "Could not create pair");
      })
      .finally(() => setBusy(false));
  };

  const onUnpair = (pairId) => {
    if (!canEdit || busy) return;
    setError("");

    // Optimistic temp pairs were never saved — just drop them.
    if (String(pairId).startsWith("temp-")) {
      onPairsChange((prev) => prev.filter((p) => p.id !== pairId));
      return;
    }

    const removed = (pairs || []).find((p) => p.id === pairId);
    onPairsChange((prev) => prev.filter((p) => p.id !== pairId));
    setBusy(true);

    deleteTeamPair(pairId)
      .catch((err) => {
        if (removed) {
          onPairsChange((prev) => [...prev, removed]);
        }
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
        <div className="team-pairs-photo-list">
          {ballkids.map((ballkid) => (
            <PairMemberRow
              key={ballkid.id}
              ballkid={ballkid}
              showYoe={showYoe}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="team-member-list team-pairs-name-inset">
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
    <div
      className={`team-pairs${showPhotos ? " team-pairs--photos" : ""}${
        canEdit ? " team-pairs--editing" : ""
      }`}
    >
      {canEdit ? (
        <div className="team-pairs-hint">
          {refreshHint
            ? selectedId
              ? "Tap another ballkid to pair them."
              : "Tap two ballkids to pair them."
            : positionPairs.length > 0
              ? "Tap the unlink icon to remove a pair."
              : null}
        </div>
      ) : null}

      {error ? <div className="team-pairs-error">{error}</div> : null}

      {positionPairs.length > 0 ? (
        <div className="team-pairs-list">
          {positionPairs.map((pair) => {
            const rawA = ballkidById[pair.ballkid_a];
            const rawB = ballkidById[pair.ballkid_b];
            if (!rawA || !rawB) return null;
            const [a, b] = orderPairMembers(rawA, rawB, ballkids);

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
                      <PairMemberRow
                        ballkid={a}
                        showYoe={showYoe}
                        plainName={canEdit}
                      />
                      <PairMemberRow
                        ballkid={b}
                        showYoe={showYoe}
                        plainName={canEdit}
                      />
                    </>
                  ) : (
                    <>
                      <BallkidAndIcon
                        ballkid={a}
                        showYoe={showYoe}
                        plainName={canEdit}
                      />
                      <BallkidAndIcon
                        ballkid={b}
                        showYoe={showYoe}
                        plainName={canEdit}
                      />
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
                  <PairMemberRow
                    ballkid={ballkid}
                    showYoe={showYoe}
                    plainName
                  />
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
