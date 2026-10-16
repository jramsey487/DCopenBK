"""API endpoint for normalized SMT/MIS live tennis scores."""

import logging
import time

import requests
from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.utils.mis_scores import live_matches, normalize_mis_payload

logger = logging.getLogger("api.live_scores")

_CACHE = {"expires": 0.0, "data": None}


def fetch_mis_scores():
    """Fetch and normalize MIS, with a short process-local cache.

    A cache keeps multiple Teams page clients from independently polling the
    tournament provider. The URL is deliberately configuration-driven because
    the exact tournament MIS endpoint changes from event to event.
    """
    url = getattr(settings, "MIS_LIVE_SCORE_URL", "")
    if not url:
        return {"configured": False, "matches": [], "courts": []}

    now = time.monotonic()
    if _CACHE["data"] is not None and now < _CACHE["expires"]:
        return _CACHE["data"]

    timeout = getattr(settings, "MIS_LIVE_SCORE_TIMEOUT", 5)
    cache_seconds = getattr(settings, "MIS_LIVE_SCORE_CACHE_SECONDS", 5)

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
        # Return the last good response, if there is one, rather than taking
        # the Teams page down because the scoring provider is temporarily slow.
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
