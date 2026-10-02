"""
Chairperson-only report: how many of each t-shirt/shorts/shoe size this
season's selected ballcrew need, for sending to the tournament before it
starts.

Sourced from BallcrewApplication (every applicant states their sizes there,
required for both veterans and first-timers) rather than Ballkid, since
Ballkid was never given its own size fields -- the application's most
recent submission for the season is the source of truth.

Scoped to the current season and de-duplicated by ballkid: a veteran who's
applied in prior years still has those old, promoted applications sitting
in the database (the purge feature deliberately never deletes a promoted
application), so a naive "every promoted application ever" query would
double-count anyone who's applied more than once.
"""

from collections import Counter

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.application import BallcrewApplication
from api.models.schedule import Tournament
from api.permissions import IsChairperson

SIZE_ORDER = ["XS", "S", "M", "L", "XL"]


def _shoe_sort_key(size):
    try:
        return float(size)
    except (TypeError, ValueError):
        return 0


def _ordered_counts(counter, order=None):
    if order:
        keys = [k for k in order if k in counter] + sorted(
            [k for k in counter if k not in order]
        )
    else:
        keys = sorted(counter.keys(), key=_shoe_sort_key)
    return [{"size": k, "count": counter[k]} for k in keys]


class SizingReportView(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        tournament = Tournament.objects.order_by("-year").first()
        year = tournament.year if tournament else timezone.now().year

        applications = (
            BallcrewApplication.objects.filter(
                promoted_ballkid__isnull=False,
                submitted_at__year=year,
            )
            .order_by("promoted_ballkid_id", "-submitted_at")
        )

        # De-dupe by ballkid in Python (portable across sqlite/Postgres --
        # DISTINCT ON is Postgres-only) -- roster size is small (~120), so
        # this is cheap.
        seen = set()
        current_season = []
        for app in applications:
            if app.promoted_ballkid_id in seen:
                continue
            seen.add(app.promoted_ballkid_id)
            current_season.append(app)

        tshirt_counts = Counter(a.tshirt_size for a in current_season)
        shorts_counts = Counter(a.shorts_size for a in current_season)
        shoe_counts = Counter(a.shoe_size for a in current_season)

        return Response(
            {
                "year": year,
                "total": len(current_season),
                "tshirt": _ordered_counts(tshirt_counts, order=SIZE_ORDER),
                "shorts": _ordered_counts(shorts_counts, order=SIZE_ORDER),
                "shoe": _ordered_counts(shoe_counts),
            }
        )
