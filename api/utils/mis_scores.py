"""SMT/MIS live tennis score feed helpers.

The MIS feed is intentionally kept behind a small normalization layer so the
rest of the application does not depend on SMT's large JSON payload.

Configure the upstream URL with MIS_LIVE_SCORE_URL. The parser accepts the
MIS structure used by SMT feeds, including Cs (courts), Ms (matches), Ts/Ps
(players), Ss (sets), and Gm (current game).
"""

from __future__ import annotations

from typing import Any


# MIS court status IDs seen in SMT feeds. The scoring feed can contain other
# statuses too, so these are only used as hints rather than hard validation.
MIS_STATUS_SCHEDULED = 1
MIS_STATUS_IN_PROGRESS = 5
MIS_STATUS_SUSPENDED = 6
MIS_STATUS_WINNER = 8
MIS_STATUS_LOSER = 9
MIS_STATUS_ON_COURT = 15

LIVE_STATUSES = {
    MIS_STATUS_IN_PROGRESS,
    MIS_STATUS_SUSPENDED,
    MIS_STATUS_ON_COURT,
}


def _int(value: Any, default: int | None = None) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value).strip()


def _player_name(player: dict[str, Any]) -> str:
    first = _str(player.get("FN"))
    last = _str(player.get("LN"))
    if first and last:
        return f"{first} {last}"
    return first or last


def _players_by_side(match: dict[str, Any]) -> dict[str, list[str]]:
    """Return player names grouped by MIS side (T1/T2).

    MIS normally stores match sides in Ts, with each side containing Ps.
    We also tolerate the occasional already-flattened player representation.
    """
    sides = {"T1": [], "T2": []}
    for side in match.get("Ts") or []:
        side = side or {}
        position = _str(side.get("Pos"))
        target = "T1" if position in {"1", "T1"} else "T2" if position in {"2", "T2"} else None
        if not target:
            continue
        for player in side.get("Ps") or []:
            if isinstance(player, dict):
                name = _player_name(player)
                if name:
                    sides[target].append(name)
    return sides


def _sets(match: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    for item in match.get("Ss") or []:
        if not isinstance(item, dict):
            continue
        number = _int(item.get("Num"))
        if number is None:
            continue
        result.append(
            {
                "number": number,
                "a": _int(item.get("T1S")),
                "b": _int(item.get("T2S")),
                "tb_a": _int(item.get("T1TB")),
                "tb_b": _int(item.get("T2TB")),
                "winner": _int(item.get("Win")),
            }
        )
    return sorted(result, key=lambda value: value["number"])


def _current_game(match: dict[str, Any]) -> dict[str, Any] | None:
    game = match.get("Gm")
    if isinstance(game, list):
        game = game[-1] if game else None
    if not isinstance(game, dict):
        return None
    return {
        "a": _str(game.get("T1S")),
        "b": _str(game.get("T2S")),
        "server": _str(game.get("Srv")),
    }


def _match_status(match: dict[str, Any]) -> str:
    status = _int(match.get("Sta"))
    if status in LIVE_STATUSES:
        return "live"
    if status == MIS_STATUS_WINNER or status == MIS_STATUS_LOSER:
        return "finished"
    if status == MIS_STATUS_SCHEDULED:
        return "scheduled"
    if status == MIS_STATUS_SUSPENDED:
        return "suspended"
    return "unknown"


def _match_position(matches: list[dict[str, Any]], current_index: int) -> tuple[int, int]:
    """Return (ordinal, total) using the MIS match order on a court.

    We deliberately preserve the order supplied by MIS. The ballcrew schedule
    is not involved because tournament matches can move courts after delays.
    """
    usable = [match for match in matches if isinstance(match, dict)]
    return current_index + 1, len(usable)


def normalize_mis_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Normalize a raw MIS response to the small shape the frontend needs."""
    courts = payload.get("Cs") or []
    normalized_courts: list[dict[str, Any]] = []

    for court in courts:
        if not isinstance(court, dict):
            continue
        court_id = _str(court.get("ID"))
        court_name = _str(court.get("Nm")) or court_id
        matches = [match for match in (court.get("Ms") or []) if isinstance(match, dict)]

        normalized_matches = []
        for index, match in enumerate(matches):
            status = _match_status(match)
            players = _players_by_side(match)
            sets = _sets(match)
            game = _current_game(match)
            normalized_matches.append(
                {
                    "match_id": _str(match.get("ID")),
                    "court_id": court_id,
                    "court": court_name,
                    "status": status,
                    "position": index + 1,
                    "total_matches": len(matches),
                    "event_id": _str(match.get("EID")),
                    "match_number": _int(match.get("Num")),
                    "players": {
                        "a": players["T1"],
                        "b": players["T2"],
                    },
                    "sets": sets,
                    "game": game,
                    "point": {
                        "a": _str(match.get("Gm", {}).get("T1S")) if isinstance(match.get("Gm"), dict) else "",
                        "b": _str(match.get("Gm", {}).get("T2S")) if isinstance(match.get("Gm"), dict) else "",
                    },
                    "server": _str(match.get("Gm", {}).get("Srv")) if isinstance(match.get("Gm"), dict) else "",
                    "score_type": _str(match.get("SoTy")),
                    "winner": _int(match.get("Win")),
                    "updated": _str(match.get("Ts")) or _str(payload.get("LMDt")),
                }
            )

        live = next((match for match in normalized_matches if match["status"] == "live"), None)
        normalized_courts.append(
            {
                "court_id": court_id,
                "court": court_name,
                "status": _str(court.get("Sta")),
                "matches": normalized_matches,
                "live_match": live,
            }
        )

    return {
        "updated": _str(payload.get("LMDt")) or _str(payload.get("Tdy")),
        "last_updated_time": _str(payload.get("LMTm")),
        "fed": _str(payload.get("Fed")),
        "courts": normalized_courts,
    }


def live_matches(normalized: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten the currently live/suspended matches for easy API consumption."""
    matches = []
    for court in normalized.get("courts", []):
        match = court.get("live_match")
        if match:
            matches.append(match)
    return matches
