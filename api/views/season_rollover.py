"""
Read-only status for the year rollover wizard.

    GET /api/season-rollover

The wizard does the actual work through the existing endpoints (get-tournament,
archive-all, reset-data, application-settings, download); this view only
reports where each step stands so the checklist can show what's done.

"This year" is the calendar year, same as the rest of the app
(get_current_year()), because ResetData, the tournament lookup and the
analytics are all keyed on it.
"""

from datetime import datetime, timedelta

from django.utils import timezone

from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.action_log import ActionLog
from api.models.application import ApplicationSettings, BallcrewApplication
from api.models.ballkid import (
    Ballkid,
    CaptainAnalytics,
    CaptainHistory,
    CheckinAnalytics,
    CheckinHistory,
    CourtAnalytics,
    CutHistory,
    TeamHistory,
)
from api.models.rating import CalibrationParams, Rating
from api.models.schedule import Schedule, Tournament
from api.permissions import IsChairperson
from api.utils.application_email import pending_interest_entries
from api.utils.utils import get_current_year

__all__ = ["SeasonRolloverStatus"]

# An export counts as "recent enough to archive on top of" for this long.
EXPORT_FRESH_DAYS = 7


def _reset_counts(year):
    """What ResetData would delete for this year (mirrors that view)."""
    return {
        "ratings": Rating.objects.filter(date__year=year).count(),
        "checkin_history": CheckinHistory.objects.filter(start__year=year).count(),
        "checkin_analytics": CheckinAnalytics.objects.filter(year=year).count(),
        "team_history": TeamHistory.objects.filter(start__year=year).count(),
        "captain_history": CaptainHistory.objects.filter(start__year=year).count(),
        "captain_analytics": CaptainAnalytics.objects.filter(year=year).count(),
        "court_analytics": CourtAnalytics.objects.filter(year=year).count(),
        "schedules": Schedule.objects.filter(start__year=year).count(),
        "calibration_params": CalibrationParams.objects.filter(year=year).count(),
        "cut_history": CutHistory.objects.filter(year=year).count(),
    }


class SeasonRolloverStatus(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        year = get_current_year()

        last_export = (
            ActionLog.objects.filter(action="season.export")
            .order_by("-created_at")
            .first()
        )
        export_done = bool(
            last_export
            and timezone.now() - last_export.created_at
            < timedelta(days=EXPORT_FRESH_DAYS)
        )

        active_count = Ballkid.objects.filter(is_active=True).count()

        reset = _reset_counts(year)
        reset_total = sum(reset.values())

        tournament = Tournament.objects.filter(year=year).first()

        return Response(
            {
                "year": year,
                "export": {
                    "done": export_done,
                    "last_at": last_export.created_at.isoformat()
                    if last_export
                    else None,
                    "fresh_days": EXPORT_FRESH_DAYS,
                },
                "tournament": {
                    "exists": tournament is not None,
                    "start_date": tournament.start_date.isoformat()
                    if tournament and tournament.start_date
                    else None,
                    "end_date": tournament.end_date.isoformat()
                    if tournament and tournament.end_date
                    else None,
                    "has_dates": bool(
                        tournament and tournament.start_date and tournament.end_date
                    ),
                },
                "archive": {
                    "active_count": active_count,
                    "done": active_count == 0,
                },
                "reset": {
                    "counts": reset,
                    "total": reset_total,
                    "done": reset_total == 0,
                },
                "applications": {
                    "is_open": ApplicationSettings.get_solo().is_open,
                    "pending_review": BallcrewApplication.objects.filter(
                        status="pending", submitted_at__year=year
                    ).count(),
                    "interest_waiting": len(pending_interest_entries()),
                },
            }
        )
