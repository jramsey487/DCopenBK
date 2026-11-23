from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.utils import timezone

from api.models.schedule import Tournament


class TournamentTimezoneMiddleware:
    """Activate the current tournament's timezone for this request.

    Timestamps remain UTC in the database. Django's local date/time helpers
    use the tournament timezone while processing the request; browsers may
    still render returned ISO timestamps in each viewer's own device zone.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        default_zone = ZoneInfo(settings.TIME_ZONE)
        now = timezone.now()
        default_year = now.astimezone(default_zone).year
        timezone.activate(default_zone)
        try:
            candidate_years = {default_year - 1, default_year, default_year + 1}
            tournaments = Tournament.objects.filter(year__in=candidate_years).only(
                "year", "start_date", "end_date", "timezone"
            )
            selected = None
            for tournament in tournaments:
                try:
                    local_now = now.astimezone(ZoneInfo(tournament.timezone))
                except (ZoneInfoNotFoundError, ValueError):
                    continue
                if (
                    local_now.year == tournament.year
                    and tournament.start_date
                    and tournament.end_date
                    and tournament.start_date <= local_now.date() <= tournament.end_date
                ):
                    selected = tournament
                    break

            # Outside the configured tournament dates, still use the
            # current default-zone year's setting for admin/pre-season work.
            if selected is None:
                selected = tournaments.filter(year=default_year).first()

            if selected and selected.timezone:
                try:
                    timezone.activate(ZoneInfo(selected.timezone))
                except (ZoneInfoNotFoundError, ValueError):
                    timezone.activate(default_zone)
            return self.get_response(request)
        finally:
            timezone.deactivate()
