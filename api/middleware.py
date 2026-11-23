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
        timezone.activate(default_zone)
        try:
            year = timezone.localdate().year
            tournament = Tournament.objects.filter(year=year).only("timezone").first()
            if tournament and tournament.timezone:
                try:
                    timezone.activate(ZoneInfo(tournament.timezone))
                except (ZoneInfoNotFoundError, ValueError):
                    # A bad legacy/admin value must not take down all requests.
                    timezone.activate(default_zone)
            return self.get_response(request)
        finally:
            timezone.deactivate()
