"""API endpoint for normalized SMT/MIS live tennis scores."""

import logging
import os
import time

import requests
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.utils.mis_scores import live_matches, normalize_mis_payload

logger = logging.getLogger("api.live_scores")

_CACHE = {"expires": 0.0, "data": None}


def fetch_mis_scores():
    """Fetch and normalize MIS, with a short process-local cache.

    The exact tournament MIS URL is supplied as a Fly/environment variable.
    Until it is configured, this endpoint makes no outbound request.
    """
    url = os.environ.get("MIS_LIVE_SCORE_URL", "").strip()
    if not url:
        return {"configured": False, "matches": [], "courts": []}

    now = time.monotonic()
    if _CACHE["data"] is not None and now < _CACHE["expires"]:
        return _CACHE["data"]

    try:
        timeout = float(os.environ.get("MIS_LIVE_SCORE_TIMEOUT", "5"))
        cache_seconds = float(os.environ.get("MIS_LIVE_SCORE_CACHE_SECONDS", "5"))
    except ValueError:
        timeout = 5
        cache_seconds = 5

    try:
        response = requests.get(
            url,
            timeout=timeout,
            headers={"User-Agent": "DCOpenBK live scores"},
        )
        response.raise_for_status()
        normalized = normalize_mis_payload(response.json())
        data = {
            "configured": True,
            "matches": live_matches(normalized),
            "courts": normalized["courts"],
            "updated": normalized["updated"],
            "last_updated_time": normalized["last_updated_time"],
        }
        _CACHE["data"] = data
        _CACHE["expires"] = now + cache_seconds
        return data
    except (requests.RequestException, ValueError) as exc:
        logger.warning("[MIS] live score fetch failed: %s", exc)
        if _CACHE["data"] is not None:
            return _CACHE["data"]
        return {
            "configured": True,
            "matches": [],
            "courts": [],
            "error": "Live scoring is temporarily unavailable.",
        }


class LiveScores(APIView):
    """Return normalized MIS data for the Teams page."""

    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        return Response(fetch_mis_scores())
