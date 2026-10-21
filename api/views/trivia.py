"""
Morning-meeting trivia for chairpersons.

Facts come from BallcrewApplication.fun_fact (this season's application,
linked to the roster via promoted_ballkid). Only active, non-cut, CHECKED-IN
ballcrew are served. Anyone whose last day is today is served first, then the
rest by interest score (best first; unreviewed facts count as middling).
Facts the LLM flagged as unsafe to announce are held back and listed
separately, and facts already marked as used this season are skipped.

    GET    /api/trivia?exclude=1,2,3&count=5   -> options, used, flagged
    POST   /api/trivia                         -> score the next batch of
                                                  unreviewed facts with Claude
    POST   /api/trivia-used  {ballkid_id}      -> mark a fact as used
    DELETE /api/trivia-used  {ballkid_id}      -> undo "used"
"""

import random
from datetime import date

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.ballkid import Ballkid
from api.models.schedule import Tournament
from api.models.trivia import TriviaUse
from api.permissions import IsChairperson
from api.utils.trivia import (
    ScoringError,
    current_score,
    latest_applications,
    score_pending,
    usable_fact,
)
from api.utils.utils import get_current_year

TRIVIA_COUNT = 5
NEUTRAL_INTEREST = 5  # sort value for facts that haven't been scored yet


def _last_day_labels(today):
    """Values of Ballkid.last_day that mean 'today is their last day'."""
    labels = {today.strftime("%A")}
    tournament = Tournament.objects.filter(year=get_current_year()).first()
    if tournament and tournament.end_date == today:
        labels.add("End")
    return labels


def _used_payload(year):
    uses = TriviaUse.objects.filter(used_on__year=year).select_related("ballkid")
    return [
        {
            "id": use.ballkid_id,
            "name": use.ballkid.get_name(),
            "fun_fact": use.fun_fact,
            "used_on": use.used_on.isoformat(),
        }
        for use in uses
    ]


class TriviaOptions(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        year = get_current_year()

        exclude = {
            int(x)
            for x in request.query_params.get("exclude", "").split(",")
            if x.strip().isdigit()
        }
        try:
            count = int(request.query_params.get("count", TRIVIA_COUNT))
        except ValueError:
            count = TRIVIA_COUNT
        count = max(0, min(count, TRIVIA_COUNT))

        labels = _last_day_labels(date.today())
        used_ids = set(
            TriviaUse.objects.filter(used_on__year=year).values_list(
                "ballkid_id", flat=True
            )
        )

        latest = latest_applications(year)
        unreviewed = sum(
            1
            for application in latest.values()
            if usable_fact(application.fun_fact)
            and current_score(application) is None
        )

        candidates, flagged = [], []
        for ballkid_id, application in latest.items():
            kid = application.promoted_ballkid
            if (
                not kid.is_checked_in
                or ballkid_id in used_ids
                or not usable_fact(application.fun_fact)
            ):
                continue

            score = current_score(application)
            fact = application.fun_fact.strip()

            if score is not None and not score.is_safe:
                flagged.append(
                    {
                        "id": ballkid_id,
                        "name": kid.get_name(),
                        "fun_fact": fact,
                        "reason": score.reason,
                    }
                )
                continue

            if ballkid_id in exclude:
                continue

            candidates.append(
                {
                    "id": ballkid_id,
                    "name": kid.get_name(),
                    "fun_fact": fact,
                    "is_last_day": kid.last_day in labels,
                    "reviewed": score is not None,
                    "interest_score": score.interest_score if score else None,
                    "reason": score.reason if score else "",
                }
            )

        # Shuffle first so ties come out in random order, then a stable sort:
        # last-day people first, then highest interest first.
        random.shuffle(candidates)
        candidates.sort(
            key=lambda c: (
                not c["is_last_day"],
                -(
                    c["interest_score"]
                    if c["interest_score"] is not None
                    else NEUTRAL_INTEREST
                ),
            )
        )
        options = candidates[:count]

        return Response(
            {
                "options": options,
                "remaining": len(candidates) - len(options),
                "used": _used_payload(year),
                "flagged": flagged,
                "unreviewed": unreviewed,
            }
        )

    def post(self, request):
        """Scores the next batch of unreviewed facts. The page calls this
        repeatedly until `pending` reaches 0 (each call is kept short to
        stay under the server's request timeout)."""
        try:
            scored, pending = score_pending(get_current_year())
        except ScoringError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        return Response({"scored": scored, "pending": pending})


class TriviaUsed(APIView):
    permission_classes = [IsChairperson]

    def post(self, request):
        year = get_current_year()
        ballkid = get_object_or_404(Ballkid, id=request.data.get("ballkid_id"))

        if TriviaUse.objects.filter(ballkid=ballkid, used_on__year=year).exists():
            return Response({"used": _used_payload(year)})

        application = latest_applications(year).get(ballkid.id)
        if application is None:
            return Response(
                {"detail": "No fun fact found for this ballkid this season."},
                status=status.HTTP_404_NOT_FOUND,
            )

        TriviaUse.objects.create(
            ballkid=ballkid,
            fun_fact=application.fun_fact.strip(),
            used_by=request.user,
        )
        return Response(
            {"used": _used_payload(year)}, status=status.HTTP_201_CREATED
        )

    def delete(self, request):
        year = get_current_year()
        TriviaUse.objects.filter(
            ballkid_id=request.data.get("ballkid_id"), used_on__year=year
        ).delete()
        return Response({"used": _used_payload(year)})
