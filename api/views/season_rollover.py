"""Read-only status for the season rollover wizard.

The upcoming tournament is selected from configured tournament dates. The
season being archived is the most recent tournament before that target, so
rollover works when the next season is configured months before January.
"""
from datetime import timedelta

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.action_log import ActionLog
from api.models.application import ApplicationSettings, BallcrewApplication
from api.models.ballkid import (
    Ballkid, CaptainAnalytics, CaptainHistory, CheckinAnalytics,
    CheckinHistory, CourtAnalytics, CutHistory, TeamHistory,
)
from api.models.rating import CalibrationParams, Rating
from api.models.schedule import Schedule, Tournament
from api.permissions import IsChairperson
from api.utils.application_email import pending_interest_entries
from api.utils.utils import get_current_year

__all__ = ["SeasonRolloverStatus"]
EXPORT_FRESH_DAYS = 7


def _reset_counts(year):
    """Counts the records ResetData deletes for the explicitly selected year."""
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


def _rollover_seasons(today=None):
    """Return (target tournament, target year, prior season year).

    Prefer the next tournament whose start date is today or later. If none is
    configured, fall back to the current-year tournament. The prior season is
    based on the nearest earlier configured tournament date, not target_year-1;
    that also supports skipped years and tournaments configured early.
    """
    today = today or timezone.localdate()
    target = (
        Tournament.objects.filter(start_date__gte=today)
        .order_by("start_date", "year")
        .first()
    )
    if target is None:
        # Off-season with no next tournament configured yet: advance from the
        # most recent actual tournament instead of treating the old calendar
        # year's tournament as the target.
        previous = (
            Tournament.objects.filter(start_date__lt=today)
            .order_by("-start_date", "-year")
            .first()
        )
        if previous and previous.start_date:
            season_year = previous.start_date.year
            return None, season_year + 1, season_year
        target_year = get_current_year()
        return None, target_year, target_year - 1

    target_year = target.start_date.year if target.start_date else target.year
    previous = None
    if target.start_date:
        previous = (
            Tournament.objects.filter(start_date__lt=target.start_date)
            .order_by("-start_date", "-year")
            .first()
        )
    season_year = (
        previous.start_date.year
        if previous and previous.start_date
        else target_year - 1
    )
    return target, target_year, season_year


class SeasonRolloverStatus(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        today = timezone.localdate()
        tournament, target_year, season_year = _rollover_seasons(today)

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
        reset = _reset_counts(season_year)
        reset_total = sum(reset.values())

        return Response({
            "year": target_year,
            "target_year": target_year,
            "season_year": season_year,
            "export": {
                "done": export_done,
                "last_at": last_export.created_at.isoformat() if last_export else None,
                "fresh_days": EXPORT_FRESH_DAYS,
            },
            "tournament": {
                "exists": tournament is not None,
                "start_date": tournament.start_date.isoformat()
                if tournament and tournament.start_date else None,
                "end_date": tournament.end_date.isoformat()
                if tournament and tournament.end_date else None,
                "has_dates": bool(
                    tournament and tournament.start_date and tournament.end_date
                ),
            },
            "archive": {"active_count": active_count, "done": active_count == 0},
            "reset": {
                "year": season_year,
                "counts": reset,
                "total": reset_total,
                "done": reset_total == 0,
            },
            "applications": {
                "is_open": ApplicationSettings.get_solo().is_open,
                "pending_review": BallcrewApplication.objects.filter(
                    status="pending", submitted_at__year=target_year
                ).count(),
                "interest_waiting": len(pending_interest_entries()),
            },
        })
