import React, { useState, useEffect, useRef, useCallback } from "react";

import {
  CourtAssignment,
  getAuthHeader,
  isCurrentHour,
  Banners,
  getLocalStorage,
  getToday,
} from "../Utils";
import { POSITIONS } from "../Consts";
import { teamsNonchairperson } from "../HelpMessages";
import {
  TeamsPhotoToggle,
  TeamsYoeToggle,
  TeamsPairingToggle,
} from "./TeamsShared";
import { TeamsPageTopBar } from "./TeamsChairpersonShared";
import {
  CourtNoteBlock,
  courtNotesToMap,
  fetchCourtNotes,
} from "./CourtNote";
import { TeamPositionPairs, fetchTeamPairs, mergePairsFromServer } from "./TeamPairs";
import { cacheGet, cacheSet } from "../apiCache";
import "./teams-page.css";

const ASSIGNED_CACHE = "teams:assigned";
const TEAMS_CACHE = "teams:nums";
const SHOW_TEAMS_CACHE = "teams:show";
const NEXT_SHIFTS_CACHE = "teams:next-shifts";
const UI_TOGGLES_CACHE = "teams:ui-toggles";

const DEFAULT_UI_TOGGLES = {
  showPhotos: false,
  showYoe: false,
  pairingEnabled: false,
};

function readUiToggles() {
  return { ...DEFAULT_UI_TOGGLES, ...(cacheGet(UI_TOGGLES_CACHE) ?? {}) };
}

function writeUiToggles(patch) {
  cacheSet(UI_TOGGLES_CACHE, { ...readUiToggles(), ...patch });
}

function Team({
  team,
  assigned,
  nextShifts,
  isMyTeam,
  showPhotos,
  showYoe,
  canEditNotes,
  canEditPairs,
  showPairingToggle = false,
  pairingEnabled = false,
  onPairingToggle,
  courtNotes,
  setCourtNotes,
  pairs,
  setPairs,
}) {
  const isCurrentlyOn =
    nextShifts.length > 0 && isCurrentHour(nextShifts[0]["start"]);
  const court = nextShifts.length > 0 ? nextShifts[0].court : "";
  // Captains only — never show pairing controls for ballkids/chairpersons.
  const showCaptainPairingToggle =
    showPairingToggle && getLocalStorage("group") === "captain";

  return (
    <div
      className={`team-card${isMyTeam ? " is-mine" : ""}${
        isCurrentlyOn ? " is-on-court" : ""
      }`}
    >
      <div className="team-card-head">
        <div className="team-card-head-left">
          <div className="team-card-title-group">
            <span className="team-card-title">Team {team}</span>
            <span className="team-card-count">({assigned.length})</span>
            {isCurrentlyOn ? (
              <span className="team-card-oncourt-badge">On court</span>
            ) : null}
          </div>
          <span className="team-card-assignment">
            <CourtAssignment nextShifts={nextShifts} />
          </span>
        </div>
        {showCaptainPairingToggle ? (
          <div className="team-card-pairing-bar">
            <TeamsPairingToggle
              enabled={pairingEnabled}
              onToggle={onPairingToggle}
            />
          </div>
        ) : null}
      </div>

      {court ? (
        <CourtNoteBlock
          court={court}
          note={courtNotes[court]}
          date={getToday()}
          onNotesChange={setCourtNotes}
          readOnly={!canEditNotes}
        />
      ) : null}

      <div className="team-card-body">
        {POSITIONS.map((position) => {
          const positionBallkids = assigned.filter(
            (ballkid) =>
              ballkid.current_team === team && ballkid.position === position
          );

          return (
            <div className="team-position-block" key={position}>
              <div className="team-position-head">
                <span className="team-position-label">{position}s</span>
                <span className="team-position-count">
                  ({positionBallkids.length})
                </span>
              </div>

              <TeamPositionPairs
                team={team}
                position={position}
                ballkids={positionBallkids}
                pairs={pairs}
                onPairsChange={setPairs}
                canEdit={canEditPairs}
                showPhotos={showPhotos}
                showYoe={showYoe}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const hadCache = cacheGet(ASSIGNED_CACHE) != null;
  const [assigned, setAssigned] = useState(() => cacheGet(ASSIGNED_CACHE) ?? []);
  const [teams, setTeams] = useState(() => cacheGet(TEAMS_CACHE) ?? []);
  const [nextShifts, setNextShifts] = useState(
    () => cacheGet(NEXT_SHIFTS_CACHE) ?? []
  );
  const [showTeams, setShowTeams] = useState(
    () => cacheGet(SHOW_TEAMS_CACHE) ?? false
  );
  const [loading, setLoading] = useState(!hadCache);
  const [showPhotos, setShowPhotos] = useState(
    () => readUiToggles().showPhotos
  );
  const [showYoe, setShowYoe] = useState(() => readUiToggles().showYoe);
  const [pairingEnabled, setPairingEnabled] = useState(
    () => readUiToggles().pairingEnabled
  );
  const [courtNotes, setCourtNotes] = useState({});
  const [pairs, setPairs] = useState([]);
  const pendingDeleteIdsRef = useRef(new Set());

  const updatePairs = useCallback((updater) => {
    setPairs((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const nextIds = new Set((next || []).map((pair) => pair.id));
      (prev || []).forEach((pair) => {
        if (
          !nextIds.has(pair.id) &&
          !String(pair.id).startsWith("temp-")
        ) {
          pendingDeleteIdsRef.current.add(pair.id);
        }
      });
      return next;
    });
  }, []);

  const myBallkidId = Number(getLocalStorage("ballkid_id"));
  const group = getLocalStorage("group");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/sorted-list", { headers: getAuthHeader() }).then((response) =>
        response.json()
      ),
      fetch("/api/calc-num-teams", { headers: getAuthHeader() }).then(
        (response) => response.json()
      ),
      fetch("/api/get-tournament", {
        method: "GET",
        headers: getAuthHeader(),
      }).then((response) => response.json()),
      fetch("/api/get-next-shifts", { headers: getAuthHeader() }).then(
        (response) => response.json()
      ),
      fetchCourtNotes(getToday()).catch(() => []),
      fetchTeamPairs().catch(() => []),
    ])
      .then(
        ([
          listData,
          teamsData,
          tournamentData,
          shiftsData,
          notesData,
          pairsData,
        ]) => {
          if (cancelled) {
            return;
          }
          const nextAssigned = listData.filter(
            (ballkid) =>
              ballkid.is_checked_in === true && ballkid.current_team > 0
          );
          const nextTeams = teamsData["teams"] ?? [];
          const nextShow = Boolean(tournamentData["show_teams"]);
          const nextShiftsData = Array.isArray(shiftsData) ? shiftsData : [];

          cacheSet(ASSIGNED_CACHE, nextAssigned);
          cacheSet(TEAMS_CACHE, nextTeams);
          cacheSet(SHOW_TEAMS_CACHE, nextShow);
          cacheSet(NEXT_SHIFTS_CACHE, nextShiftsData);

          setAssigned(nextAssigned);
          setTeams(nextTeams);
          setShowTeams(nextShow);
          setNextShifts(nextShiftsData);
          setCourtNotes(courtNotesToMap(notesData));
          setPairs(Array.isArray(pairsData) ? pairsData : []);
        }
      )
      .catch(() => {
        if (!cancelled && !hadCache) {
          setAssigned([]);
          setShowTeams(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hadCache]);

  // Keep pairings in sync for everyone on the page (multi-captain / viewers).
  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const schedule = (delay = 2000) => {
      if (cancelled) {
        return;
      }
      timer = window.setTimeout(poll, delay);
    };

    const poll = () => {
      if (cancelled) {
        return;
      }
      if (typeof document !== "undefined" && document.hidden) {
        schedule();
        return;
      }
      fetchTeamPairs()
        .then((data) => {
          if (cancelled || !Array.isArray(data)) {
            return;
          }
          setPairs((prev) =>
            mergePairsFromServer(prev, data, pendingDeleteIdsRef.current)
          );
        })
        .catch(() => {})
        .finally(() => {
          schedule();
        });
    };

    schedule(1500);

    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        if (timer) {
          window.clearTimeout(timer);
        }
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const myTeam = assigned.find((b) => b.id === myBallkidId)?.current_team;
  const isCaptain = group === "captain";
  const canUsePairing = isCaptain && myTeam != null && myTeam > 0;

  const orderedTeams = [...teams].sort((a, b) => {
    if (a === myTeam) return -1;
    if (b === myTeam) return 1;
    return a - b;
  });

  let body;
  if (loading) {
    body = <div className="teams-page-empty">Loading teams…</div>;
  } else if (assigned.length > 0 && showTeams) {
    body = (
      <div className="teams-page-grid">
        {orderedTeams.map((team) => (
          <Team
            key={team}
            team={team}
            assigned={assigned.filter(
              (ballkid) => ballkid.current_team === team
            )}
            nextShifts={nextShifts.filter((shift) => shift.team === team)}
            isMyTeam={team === myTeam}
            showPhotos={showPhotos}
            showYoe={showYoe}
            canEditNotes={isCaptain && team === myTeam}
            canEditPairs={
              canUsePairing && pairingEnabled && team === myTeam
            }
            showPairingToggle={isCaptain && canUsePairing && team === myTeam}
            pairingEnabled={pairingEnabled}
            onPairingToggle={
              isCaptain
                ? () => {
                    const next = !pairingEnabled;
                    setPairingEnabled(next);
                    writeUiToggles({ pairingEnabled: next });
                  }
                : undefined
            }
            courtNotes={courtNotes}
            setCourtNotes={setCourtNotes}
            pairs={pairs}
            setPairs={updatePairs}
          />
        ))}
      </div>
    );
  } else {
    body = (
      <div className="teams-page-empty">
        There are currently no teams assigned.
      </div>
    );
  }

  return (
    <div className="page ballkid-list-page teams-page-shell">
      <Banners />

      <TeamsPageTopBar
        title="Current Teams"
        helpPage="Teams"
        helpMessage={teamsNonchairperson}
        controls={
          <>
            <TeamsPhotoToggle
              showPhotos={showPhotos}
              onToggle={() => {
                const next = !showPhotos;
                setShowPhotos(next);
                writeUiToggles({ showPhotos: next });
              }}
            />
            <TeamsYoeToggle
              showYoe={showYoe}
              onToggle={() => {
                const next = !showYoe;
                setShowYoe(next);
                writeUiToggles({ showYoe: next });
              }}
            />
          </>
        }
      />

      {body}
    </div>
  );
}
