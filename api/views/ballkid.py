from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import (
    Max,
    Count,
    Sum,
    Q,
    F,
    Avg,
    OuterRef,
    Case,
    Value,
    When,
    Exists,
    Subquery,
    IntegerField,
    FloatField,
    Window,
)
from django.db.models.functions import TruncDay, Coalesce, DenseRank, Concat
from django.shortcuts import get_object_or_404

from api.models.ballkid import *
from api.models.rating import *
from api.models.schedule import COURT
from api.serializers import *
from api.utils.utils import *
from api.utils.consts import *
from api.permissions import *
from api.utils.teams_generator import TeamsGenerator
from api.views.rating import run_calibration_and_save_params
from accounts.views import UpdateCaptainStatus

from datetime import timedelta
import logging

logger = logging.getLogger("api.ballkid")


def _list_ballkids_queryset(queryset):
    """Defer profile-only columns that list serializers never read."""
    return queryset.defer(*BALLKID_LIST_DEFER_FIELDS)


def _rating_count_subquery(extra_filters=None):
    """Per-ballkid complete rating count for the current year (no JOIN fan-out)."""
    filters = {
        "ratee_id": OuterRef("pk"),
        "date__year": get_current_year(),
        "status": RATING_STATUS.COMPLETE,
    }
    if extra_filters:
        filters.update(extra_filters)
    return (
        Rating.objects.filter(**filters)
        .order_by()
        .values("ratee_id")
        .annotate(c=Count("id"))
        .values("c")
    )


def recalc_checkin_analytics(ballkid=None, now=None, year=None):
    """
    Recalculates total checkin duration for the ballkid and saves to the
    CheckinAnalytics table

    TODO: make this more efficient by caching the result and only
    updating based on the most recent history
    """
    logger.info(f"[recalc-checkin-analytics] for ballkid {ballkid}")

    if now is None:
        now = datetime.now()
    if year is None:
        year = get_current_year()

    # If not updating a specific ballkid, get all histories and create analytics for
    # all active ballkids
    if ballkid is None:
        histories = CheckinHistory.objects.filter(
            ballkid__is_active=True, start__year=year
        )

        # Dict mapping ballkid_id to [set of days, duration]
        analytics = {
            ballkid.id: [set(), timedelta()]
            for ballkid in Ballkid.objects.filter(is_active=True)
        }

    # If updating a specific ballkid, only get that ballkid's histories and only
    # create 1 analytic
    else:
        histories = CheckinHistory.objects.filter(
            ballkid_id=ballkid.id, start__year=year
        )
        analytics = {ballkid.id: [set(), timedelta()]}

    logger.info(
        f"[recalc-checkin-analytics] # histories: {len(histories)}, first 10: {histories[:10]}"
    )

    # Add each history's duration and count to the dict of ballkid checkin analytics
    for history in histories:
        if history.ballkid_id not in analytics:
            logger.warn(
                f"[recalc-checkin-analytics] Key {history.ballkid_id} not found in analytics dict"
            )
            continue

        day = datetime.strftime(
            history.start - timedelta(hours=CHECKIN_START_HOUR),
            HYPHEN_YEAR_MONTH_DAY_FORMAT_STR,
        )
        analytics[history.ballkid_id][0].add(day)

        end_time = history.end if history.end else now
        analytics[history.ballkid_id][1] += end_time - history.start
    logger.info(
        f"[recalc-checkin-analytics] Compiled analytics: {analytics}, starting bulk create"
    )

    CheckinAnalytics.objects.bulk_create(
        [
            CheckinAnalytics(
                ballkid_id=key, count=len(val[0]), duration=val[1], year=year
            )
            for key, val in analytics.items()
        ],
        update_conflicts=True,
        unique_fields=["ballkid_id", "year"],
        update_fields=["count", "duration"],
    )
    logger.info(f"[recalc-checkin-analytics] Completed bulk create")


def recalc_court_analytics(ballkid=None, now=None, year=None):
    logger.info(f"[recalc-court-analytics] for ballkid {ballkid}")

    if now is None:
        now = datetime.now()
    if year is None:
        year = get_current_year()

    # If not updating a specific ballkid, get all histories and create analytics for
    # all active ballkids
    if ballkid is None:
        histories = TeamHistory.objects.filter(start__year=year)

        # Dict mapping ballkid_id to [count, duration]
        analytics = {
            (ballkid.id, court): [0, timedelta()]
            for ballkid in Ballkid.objects.filter(is_active=True)
            for court in NUM_COURTS_TO_COURTS[5]
        }

    # If updating a specific ballkid, only get that ballkid's histories and only
    # create 1 analytic
    else:
        histories = TeamHistory.objects.filter(ballkid_id=ballkid.id, start__year=year)
        analytics = {
            (ballkid.id, court): [0, timedelta()] for court in NUM_COURTS_TO_COURTS[5]
        }

    logger.info(
        f"[recalc-court-analytics] # histories: {len(histories)}, first 10: {histories[:10]}"
    )

    for history in histories:
        # Find all associated shifts of the ballkid's team, filtered to only shifts which have
        # overlap with the history. Note that this should theoretically improve performance but
        # for some reason does not so extra filters are commented out.
        shifts = Schedule.objects.filter(
            team=history.team,
            start__year=year,
            # start__gte=history.start - timedelta(hours=1),
            # start__lte=history.end if history.end else now,
        )

        for shift in shifts:
            overlapping = calc_overlapping_time(
                history.start,
                history.end if history.end else now,
                shift.start,
                shift.end if shift.end else shift.start + timedelta(hours=1),
            )

            # ONLY if there is non-zero overlapping time, then log the court to the
            # ballkid's CourtAnalytics (counts and durations)
            if overlapping:
                key = (history.ballkid_id, shift.court)
                if key not in analytics:
                    logger.warn(
                        f"[recalc-court-analytics] Key {key} not found in analytics"
                    )
                    continue

                analytics[key][0] += 1
                analytics[key][1] += overlapping

    logger.info(
        f"[recalc-court-analytics] Compiled analytics: {analytics}, starting bulk create"
    )

    CourtAnalytics.objects.bulk_create(
        [
            CourtAnalytics(
                ballkid_id=key[0],
                court=key[1],
                count=val[0],
                duration=val[1],
                year=year,
            )
            for key, val in analytics.items()
        ],
        update_conflicts=True,
        unique_fields=["ballkid_id", "court", "year"],
        update_fields=["count", "duration"],
    )
    logger.info(f"[recalc-court-analytics] Completed bulk create")


def recalc_captain_analytics(ballkid, now=None, year=None):
    """
    Recalculates captain counts and durations BIDIRECTIONALLY. This means that
    - for a ballkid, CaptainAnalytics is updated to account for all captains that
    the ballkid has had
    - for a captain, CaptainAnalytics is updated to account for all ballkids (captain
    and non-captain) that have had this ballkid as captain
    )
    """
    logger.info(f"[recalc-captain-analytics] for ballkid {ballkid}")

    if now is None:
        now = datetime.now()
    if year is None:
        year = get_current_year()

    for updateAsCaptain in [True, False]:
        # If ballkid is not a captain, then don't update as captain
        if updateAsCaptain and not ballkid.is_captain:
            continue

        durations = {}
        counts = {}

        # If updating as captain, then treat self as the captain
        if updateAsCaptain:
            histories = CaptainHistory.objects.filter(captain=ballkid, start__year=year)
        # If not updating as captain, then treat self as the ballkid
        else:
            histories = CaptainHistory.objects.filter(ballkid=ballkid, start__year=year)

        logger.info(
            f"[recalc-captain-analytics] # histories: {len(histories)}, first 10: {histories[:10]}"
        )

        # For each history between ballkid and captain
        for history in histories:
            other_id = history.ballkid_id if updateAsCaptain else history.captain_id

            if other_id not in durations:
                durations[other_id] = timedelta()
            if other_id not in counts:
                counts[other_id] = 0

            # Boolean to indicate whether there was any shift that had positive
            # overlap. If so, increment the count of number of histories between
            # ballkid and captain
            overlapping = False

            shifts = Schedule.objects.filter(team=history.team)
            # For each shift, check if there is any overlapping time between the
            # start and end of the CaptainHistory and the start and end of a shift
            for shift in shifts:
                overlap = calc_overlapping_time(
                    history.start,
                    history.end if history.end else now,
                    shift.start,
                    shift.end if shift.end else shift.start + timedelta(hours=1),
                )
                durations[other_id] += overlap
                if overlap:
                    overlapping = True

            # If any overlap with a shift, increment count of number of histories
            # between ballkid and captain
            if overlapping:
                counts[other_id] += 1

        for other_id, duration in durations.items():
            # If no overlapping times between (ballkid, captain) pair,
            # then continue and do not create a CaptainAnalytics entry
            if not duration:
                continue

            logger.info(
                f"[recalc-captain-analytics] For ballkid {ballkid.id} updating as captain {updateAsCaptain} with other ballkid/captain durations of {durations}"
            )

            if updateAsCaptain:
                analytic, created = CaptainAnalytics.objects.update_or_create(
                    ballkid_id=other_id,
                    captain=ballkid,
                    year=year,
                    defaults={
                        "duration": durations[other_id],
                        "count": counts[other_id],
                    },
                )
                logger.info(
                    f"[recalc-captain-analytics] For (ballkid {other_id}, captain {ballkid.id}), created {created} analytic {analytic}"
                )
            else:
                analytic, created = CaptainAnalytics.objects.update_or_create(
                    ballkid=ballkid,
                    captain_id=other_id,
                    year=year,
                    defaults={
                        "duration": durations[other_id],
                        "count": counts[other_id],
                    },
                )
                logger.info(
                    f"[recalc-captain-analytics] For (ballkid {ballkid.id}, captain {other_id}), created {created} analytic {analytic}"
                )


def recalc_finals_analytics(ballkid):
    """Recalculate finals analytics for ballkid"""

    logger.info(f"[recalc-finals-analytics] for ballkid {ballkid}")

    # When updating a specific ballkid, only get that ballkid's histories and only
    # create 1 analytic
    histories = FinalsHistory.objects.filter(ballkid_id=ballkid.id)
    logger.info(
        f"[recalc-finals-analytics] {ballkid.get_name()} with {len(histories)} finals histories: {histories}"
    )

    for match_type_tup in MATCH_TYPE.choices:
        match_type = match_type_tup[0]
        match_type_histories = histories.filter(match_type=match_type)
        analytic, created = FinalsAnalytics.objects.update_or_create(
            ballkid=ballkid,
            match_type=match_type,
            defaults={
                "count": match_type_histories.count(),
                "last_year": match_type_histories.aggregate(Max("year"))["year__max"],
            },
        )
        logger.info(
            f"[recalc-finals-analytics] {ballkid.get_name()} and match_type {match_type} created {created} analytic: {analytic}"
        )


def annotate_ratings(ballkids, pk):
    current_year = get_current_year()

    return ballkids.annotate(
        num_ratings=Coalesce(
            Subquery(_rating_count_subquery(), output_field=IntegerField()),
            Value(0),
        ),
        num_my_ratings=Coalesce(
            Subquery(
                _rating_count_subquery({"rater_id": pk}),
                output_field=IntegerField(),
            ),
            Value(0),
        ),
        have_draft=Exists(
            Rating.objects.filter(
                rater_id=pk,
                ratee_id=OuterRef("id"),
                date__year=current_year,
                status=RATING_STATUS.DRAFT,
            )
        ),
    )


def annotate_durations(ballkids):
    year = get_current_year()
    checkin_subq = CheckinAnalytics.objects.filter(ballkid_id=OuterRef("pk"), year=year)

    return ballkids.annotate(
        checkin_duration=Subquery(checkin_subq.values("duration")),
        checkin_days=Subquery(checkin_subq.values("count")),
        court_duration=Coalesce(
            Sum(
                "courtanalytics__duration",
                filter=Q(courtanalytics__year=year),
            ),
            timedelta(),
        ),
        stadium_duration=Coalesce(
            Sum(
                "courtanalytics__duration",
                filter=Q(courtanalytics__court=COURT.STADIUM)
                & Q(courtanalytics__year=year),
            ),
            timedelta(),
        ),
        harris_duration=Coalesce(
            Sum(
                "courtanalytics__duration",
                filter=Q(courtanalytics__court=COURT.HARRIS)
                & Q(courtanalytics__year=year),
            ),
            timedelta(),
        ),
        grandstand_duration=Coalesce(
            Sum(
                "courtanalytics__duration",
                filter=Q(courtanalytics__court=COURT.GRANDSTAND)
                & Q(courtanalytics__year=year),
            ),
            timedelta(),
        ),
        four_duration=Coalesce(
            Sum(
                "courtanalytics__duration",
                filter=Q(courtanalytics__court=COURT.FOUR)
                & Q(courtanalytics__year=year),
            ),
            timedelta(),
        ),
        five_duration=Coalesce(
            Sum(
                "courtanalytics__duration",
                filter=Q(courtanalytics__court=COURT.FIVE)
                & Q(courtanalytics__year=year),
            ),
            timedelta(),
        ),
    )


def annotate_rank(ballkids, include_num_ratings=True):
    year = get_current_year()

    # Prefer Subqueries over JOINed aggregates so rating Counts do not fan out
    # against CalibrationParams (and so we can safely chain after annotate_ratings).
    # num_ratings: count of complete ratings this year (matches cut help text /
    # pink threshold). Do not use CalibrationParams.num_ratee_ratings — that can
    # lag actual ratings until recalibration runs.
    cal_avg_sq = CalibrationParams.objects.filter(
        ballkid_id=OuterRef("pk"), year=year
    ).values("ratee_calibrated_avg")[:1]

    annotations = {
        "calibrated_avg": Coalesce(
            Subquery(cal_avg_sq, output_field=FloatField()),
            Value(0.0),
        ),
    }
    if include_num_ratings:
        annotations["num_ratings"] = Coalesce(
            Subquery(_rating_count_subquery(), output_field=IntegerField()),
            Value(0),
        )

    return ballkids.annotate(**annotations).annotate(
        rank=Window(
            expression=DenseRank(),
            order_by=F("calibrated_avg").desc(),
        ),
    )


def unassign_future_shifts(team, now=None):
    if now is None:
        now = datetime.now()

    # Delete all future shifts for this team
    remaining_shifts = Schedule.objects.filter(
        start__gte=now, start__lt=now + timedelta(hours=12), team=team
    )
    for shift in remaining_shifts:
        logger.info(f"[unassign_future_shifts] Unassigning team from shift {shift}")
        shift.team = 0
        shift.save()

    # Update end of current shift
    current_shift = Schedule.objects.filter(
        start__lte=now, start__gt=now - timedelta(hours=1)
    ).first()
    if current_shift:
        current_shift.end = now
        current_shift.save()
        logger.info(
            f"[unassign_future_shifts] Current shift {current_shift} end updated to {now}"
        )


class BallkidsList(generics.ListAPIView):
    serializer_class = BallkidListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        ballkids = _list_ballkids_queryset(
            Ballkid.objects.filter(is_active=True).order_by(
                "last_name", "first_name"
            )
        )

        queryset = ballkids if not pk else annotate_ratings(ballkids, pk)
        logger.info("[BallkidsList] pk=%s", pk)
        return queryset


class EmailsList(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        emails = (
            Ballkid.objects.filter(
                is_active=True, is_chairperson=False, is_cut=False, user__isnull=False
            )
            .exclude(user__email="")
            .values_list("user__email", flat=True)
        )
        return Response({"emails": list(emails)}, status=status.HTTP_200_OK)


class SelfCutList(generics.ListAPIView):
    serializer_class = BallkidListSerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        # Update all ballkids who are self-cutting today to have
        # a cut status of self-cut
        current_day = datetime.strftime(
            (datetime.now() - timedelta(hours=MATCHES_START_HOUR)), "%A"
        )
        updated = Ballkid.objects.filter(
            is_active=True, is_cut=False, last_day=current_day
        ).update(cut_status=CUT_STATUS.SELF_CUT)
        if updated:
            logger.info(
                "[SelfCutList] marked %s ballkid(s) Self-Cut for %s",
                updated,
                current_day,
            )

        # Return all self-cuts including automatically categorized
        # and manually indicated
        self_cuts = _list_ballkids_queryset(
            Ballkid.objects.filter(
                is_active=True, is_cut=False, cut_status=CUT_STATUS.SELF_CUT
            ).order_by(
                "-is_captain",
                "last_name",
                "first_name",
            )
        )

        logger.info(
            "[SelfCutList] current_day=%s marked_today=%s",
            current_day,
            updated,
        )
        return self_cuts


class BallkidsSortedList(generics.ListAPIView):
    serializer_class = BallkidListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        group_obj = self.request.user.groups.first()
        group = group_obj.name if group_obj else ""

        # Rank annotations are expensive; skip when the client does not need them
        # (regular teams / schedule). Cut and finals pass rank=1.
        rank_param = self.request.query_params.get("rank", "1")
        include_rank = group == "chairperson" and rank_param not in (
            "0",
            "false",
            "False",
        )

        ballkids = _list_ballkids_queryset(
            Ballkid.objects.filter(is_active=True, is_cut=False).order_by(
                "board_order",
                "-is_chairperson",
                "-is_captain",
                "-num_years_experience",
                "last_name",
                "first_name",
            )
        )

        # If pk is provided, then annotate ballkids with num ratings and whether or not
        # pk user has given a rating
        rated = False
        if (group == "captain" or group == "chairperson") and pk:
            ballkids = annotate_ratings(ballkids, pk)
            rated = True

        if include_rank:
            ballkids = annotate_rank(ballkids, include_num_ratings=not rated)

        logger.info(
            "[BallkidsSortedList] group=%s pk=%s include_rank=%s",
            group,
            pk,
            include_rank,
        )
        return ballkids


class BallkidsInactiveList(generics.ListAPIView):
    serializer_class = BallkidListSerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        return _list_ballkids_queryset(
            Ballkid.objects.filter(Q(is_active=False) | Q(is_cut=True)).order_by(
                "last_name", "first_name"
            )
        )


class CreateBallkid(APIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():
            data = {
                key: value
                for key, value in serializer.data.items()
                if key != "first_name" and key != "last_name"
            }
            if "image" in data.keys() and data["image"] == "":
                data["image"] = DEFAULT_IMAGE_FILE
            logger.info(f"[CreateBallkid] input data: {data}")

            ballkid, created = Ballkid.objects.get_or_create(
                first_name=serializer.data["first_name"].strip(),
                last_name=serializer.data["last_name"].strip(),
                defaults=data,
            )
            logger.info(f"[CreateBallkid] ballkid: {ballkid}; created: {created}")

            ballkid.validate()
            ballkid.save()

            return Response(BallkidSerializer(ballkid).data)

        logger.warning(f"[CreateBallkid] serializer errors: {serializer.errors}")
        return Response(
            {"Invalid serializer": f"Errors: {serializer.errors}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class GetBallkid(generics.RetrieveAPIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        me = self.kwargs.get("me")
        ballkids = Ballkid.objects.all()

        queryset = ballkids if not me else annotate_ratings(ballkids, me)
        return queryset


class UpdateBallkid(APIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        # I have absolutely no idea why, but the following line is necessary to
        # prevent a RawPostDataException: You cannot access body after reading
        # from request's data stream
        request.body

        serializer = self.serializer_class(data=request.data, partial=True)

        if serializer.is_valid():
            validated_data = serializer.validated_data
            logger.info(f"[UpdateBallkid] serializer data: {serializer.data}")

            # Get ballkid with the corresponding first and last names
            first_name = serializer.data["first_name"]
            last_name = serializer.data["last_name"]
            ballkid = get_object_or_404(
                Ballkid, first_name=first_name, last_name=last_name
            )

            for field in serializer.data:
                if field in ["first_name", "last_name", "user", "self_cut"]:
                    continue

                # Update the ballkid's field per the patch request
                if serializer.data[field] is not None:
                    self_cut = (
                        serializer.data["self_cut"]
                        if "self_cut" in serializer.data
                        else False
                    )
                    ballkid.set_field(field, serializer.data[field], self_cut=self_cut)

                # If updating whether or not the ballkid is a captain, also update
                # account permissions for that ballkid
                if field == "is_captain":
                    view = UpdateCaptainStatus.as_view()
                    response = view(request._request)

            ballkid.validate()
            ballkid.save()

            return Response(BallkidSerializer(ballkid).data)

        logger.warning(f"[UpdateBallkid] serializer errors: {serializer.errors}")
        return Response(
            {"Invalid serializer": "Errors: {serializer.errors}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


ASSIGN_FIELDS = (
    "current_team",
    "finals_team",
    "cut_status",
    "position",
    "finals_position",
)


class ReorderBallkids(APIView):
    """
    Insert a ballkid before another (or at end) within a board list.

    Body:
      ballkid_id (int, required)
      before_id (int|null, optional) — insert before this id; omit/null = append
      current_team / finals_team / cut_status / position / finals_position
        — optional assignment fields applied before reordering
      group_by (list[str], optional) — fields that define the list group
        (defaults from which assign fields are present)
    """

    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        ballkid_id = request.data.get("ballkid_id")
        if ballkid_id is None:
            return Response(
                {"error": "ballkid_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ballkid = get_object_or_404(Ballkid, id=ballkid_id)
        before_id = request.data.get("before_id", None)

        for field in ASSIGN_FIELDS:
            if field in request.data and request.data[field] is not None:
                ballkid.set_field(field, request.data[field])

        group_by = request.data.get("group_by")
        if not group_by:
            group_by = [
                field
                for field in (
                    "current_team",
                    "finals_team",
                    "cut_status",
                    "position",
                    "finals_position",
                )
                if field in request.data
            ]
        if not group_by:
            group_by = ["current_team"]

        filters = {field: getattr(ballkid, field) for field in group_by}
        siblings = list(
            Ballkid.objects.filter(**filters)
            .exclude(id=ballkid.id)
            .order_by("board_order", "last_name", "first_name", "id")
        )

        ordered = []
        inserted = False
        if before_id is None:
            ordered = siblings + [ballkid]
            inserted = True
        else:
            for sibling in siblings:
                if sibling.id == before_id:
                    ordered.append(ballkid)
                    inserted = True
                ordered.append(sibling)
            if not inserted:
                ordered.append(ballkid)

        for index, member in enumerate(ordered):
            if member.board_order != index:
                member.board_order = index
                member.save(update_fields=["board_order"])

        logger.info(
            "[ReorderBallkids] ballkid=%s before_id=%s group=%s order=%s",
            ballkid_id,
            before_id,
            filters,
            [m.id for m in ordered],
        )
        return Response(
            {"Success": "Reordered", "ordered_ids": [m.id for m in ordered]},
            status=status.HTTP_200_OK,
        )


class CheckoutAll(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        group = request.data["checkout_group"]

        if group == "all":
            queryset = Ballkid.objects.filter(is_checked_in=True)
            logger.info(f"[CheckoutAll] checking out all ballkids: {queryset}")

        elif group == "unassigned":
            queryset = Ballkid.objects.filter(is_checked_in=True, current_team=0)
            logger.info(f"[CheckoutAll] checking out unassigned ballkids: {queryset}")

        elif group == "assigned":
            queryset = Ballkid.objects.filter(is_checked_in=True).exclude(
                current_team=0
            )
            logger.info(f"[CheckoutAll] checking out assigned ballkids: {queryset}")

        else:
            try:
                team = int(group)
                queryset = Ballkid.objects.filter(current_team=team)
                logger.info(
                    f"[CheckoutAll] checking out team {group} ballkids: {queryset}"
                )
                unassign_future_shifts(team)

            except Exception:
                logger.warn(f"[CheckoutAll] Unrecognized checkout group {group}")

        for ballkid in queryset:
            ballkid.set_field("is_checked_in", False)
            ballkid.validate()
            ballkid.save()

        return Response(
            {"Success": "All ballkids checked out"},
            status=status.HTTP_200_OK,
        )


class CutAll(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        should_cut = request.data["should_cut"]
        self_cut = request.data["self_cut"] if "self_cut" in request.data else False

        if self_cut:
            current_day = datetime.strftime(
                (datetime.now() - timedelta(hours=MATCHES_START_HOUR)), "%A"
            )
            queryset = Ballkid.objects.filter(
                is_active=True, is_cut=False, last_day=current_day
            ).order_by("last_name", "first_name")

        else:
            cut_status = request.data["cut_status"]
            queryset = Ballkid.objects.filter(cut_status=cut_status)

        logger.info(
            f"[CutAll] setting all ballkids {queryset} to cut status {should_cut} with self_cut {self_cut}"
        )

        for ballkid in queryset:
            ballkid.set_field("is_cut", should_cut, self_cut=self_cut)
            ballkid.set_field("cut_status", "")
            ballkid.validate()
            ballkid.save()

        return Response(
            {
                "Success": f"All ballkids {queryset} were handled for cut_all: {should_cut}"
            },
            status=status.HTTP_200_OK,
        )


class ArchiveAll(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        queryset = Ballkid.objects.filter(is_active=True)
        logger.info(f"[ArchiveAll] archiving all active ballkids: {queryset}")

        for ballkid in queryset:
            ballkid.set_field("is_active", False)
            ballkid.set_field("num_tickets", 0)
            ballkid.set_field("last_day", None)
            ballkid.set_field("comments", "")
            ballkid.validate()
            ballkid.save()

        return Response(
            {"Success": "All ballkids archived"},
            status=status.HTTP_200_OK,
        )


class ResetData(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        year = get_current_year()

        # Check out and archive all ballkids
        for ballkid in Ballkid.objects.filter(is_active=True):
            ballkid.set_field("is_checked_in", False)
            ballkid.set_field("is_active", False)
            ballkid.set_field("num_tickets", 0)
            ballkid.set_field("last_day", None)
            ballkid.set_field("comments", "")
            ballkid.validate()
            ballkid.save()

        # Delete ratings from this year
        ratings = Rating.objects.filter(date__year=year)
        logger.info(f"[ResetData] Deleting {len(ratings)} ratings: {ratings}")
        ratings.delete()

        # Delete checkin histories from this year
        histories = CheckinHistory.objects.filter(start__year=year)
        logger.info(
            f"[ResetData] Deleting {len(histories)} checkin histories: {histories}"
        )
        histories.delete()

        # Delete checkin analytics from this year
        analytics = CheckinAnalytics.objects.filter(year=year)
        logger.info(
            f"[ResetData] Deleting {len(analytics)} checkin analytics: {analytics}"
        )
        analytics.delete()

        # Delete team histories from this year
        histories = TeamHistory.objects.filter(start__year=year)
        logger.info(
            f"[ResetData] Deleting {len(histories)} team histories: {histories}"
        )
        histories.delete()

        # Delete captain histories from this year
        histories = CaptainHistory.objects.filter(start__year=year)
        logger.info(
            f"[ResetData] Deleting {len(histories)} captain histories: {histories}"
        )
        histories.delete()

        # Delete captain analytics from this year
        analytics = CaptainAnalytics.objects.filter(year=year)
        logger.info(
            f"[ResetData] Deleting {len(analytics)} captain analytics: {analytics}"
        )
        analytics.delete()

        # Delete court analytics from this year
        analytics = CourtAnalytics.objects.filter(year=year)
        logger.info(
            f"[ResetData] Deleting {len(analytics)} court analytics: {analytics}"
        )
        analytics.delete()

        # Delete schedules from this year
        schedules = Schedule.objects.filter(start__year=year)
        logger.info(f"[ResetData] Deleting {len(schedules)} schedules: {schedules}")
        schedules.delete()

        # Delete calibrationparams from this year
        cps = CalibrationParams.objects.filter(year=year)
        logger.info(f"[ResetData] Deleting {len(cps)} calibration params: {cps}")
        cps.delete()

        # Delete cut histories from this year
        histories = CutHistory.objects.filter(year=year)
        logger.info(f"[ResetData] Deleting {len(histories)} cut histories: {histories}")
        histories.delete()

        # # Delete finals histories from this year
        # histories = FinalsHistory.objects.filter(year=year)
        # logger.info(
        #     f"[ResetData] Deleting {len(histories)} finals histories: {histories}"
        # )
        # # histories.delete()

        return Response(
            {"Success": f"Data for {year} successfully reset"},
            status=status.HTTP_200_OK,
        )


class CalcNumTeams(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        num_teams = (
            Ballkid.objects.filter(is_active=True, is_checked_in=True).aggregate(
                num_teams=Max("current_team")
            )["num_teams"]
            or 0
        )
        logger.info(f"[CalcNumTeams] # teams: {num_teams}")

        return Response(
            {"teams": [team + 1 for team in range(num_teams)]},
            status=status.HTTP_200_OK,
        )


class ClearTeam(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        if "current_team" in request.data:
            team_type = "current_team"
        elif "finals_team" in request.data:
            team_type = "finals_team"
        else:
            return Response(
                {"Bad request": "Missing current_team or finals_team argument"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        team = request.data[team_type]
        if team_type == "current_team" and team == 0:
            queryset = Ballkid.objects.exclude(current_team=0)
        elif team_type == "current_team" and team != 0:
            queryset = Ballkid.objects.filter(current_team=team)
        else:
            queryset = Ballkid.objects.filter(finals_team=team)

        logger.info(f"[ClearTeam] clearing team {team} with ballkids {queryset}")

        if queryset.exists():
            for ballkid in queryset:
                ballkid.set_field(team_type, 0 if team_type == "current_team" else "")
                ballkid.validate()
                ballkid.save()

        if team_type == "current_team":
            clear_team_pairs_for_team(team)
            unassign_future_shifts(team)

        return Response(f"Team {team} cleared", status=status.HTTP_200_OK)


class CreateTeams(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        num_teams = int(request.data["numTeams"])

        generator = TeamsGenerator(num_teams)
        teams = generator.create_teams()

        for team in teams:
            for ballkid in team.get_ballkids():
                ballkid.set_field("current_team", team.get_number())
                ballkid.validate()
                ballkid.save()

        return Response(
            {"Success": "Teams auto-created"},
            status=status.HTTP_200_OK,
        )


class TeamPairs(APIView):
    """Optional same-position pairs on current teams (Net+Net / Back+Back)."""

    PAIRABLE_POSITIONS = {POSITION.B, POSITION.N}

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsChairpersonOrCaptain()]

    def _can_edit_team(self, request, team):
        if request.user.groups.filter(name="chairperson").exists():
            return True
        return Ballkid.objects.filter(
            user=request.user,
            is_captain=True,
            is_active=True,
            current_team=team,
        ).exists()

    def get(self, request, format=None):
        team_param = request.query_params.get("team")
        qs = TeamPair.objects.select_related("ballkid_a", "ballkid_b")
        if team_param not in (None, ""):
            try:
                qs = qs.filter(team=int(team_param))
            except (TypeError, ValueError):
                return Response(
                    {"Error": "team must be an integer"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(TeamPairSerializer(qs, many=True).data)

    def post(self, request, format=None):
        try:
            team = int(request.data.get("team"))
            ballkid_a_id = int(request.data.get("ballkid_a"))
            ballkid_b_id = int(request.data.get("ballkid_b"))
        except (TypeError, ValueError):
            return Response(
                {"Error": "team, ballkid_a, and ballkid_b are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        position = (request.data.get("position") or "").strip()
        if position not in self.PAIRABLE_POSITIONS:
            return Response(
                {"Error": "position must be Net or Back"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ballkid_a_id == ballkid_b_id:
            return Response(
                {"Error": "Pick two different ballkids"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not self._can_edit_team(request, team):
            return Response(
                {"Error": "You can only edit pairs on your own team"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if ballkid_a_id > ballkid_b_id:
            ballkid_a_id, ballkid_b_id = ballkid_b_id, ballkid_a_id

        try:
            a = Ballkid.objects.get(id=ballkid_a_id)
            b = Ballkid.objects.get(id=ballkid_b_id)
        except Ballkid.DoesNotExist:
            return Response(
                {"Error": "Ballkid not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        for kid in (a, b):
            if kid.current_team != team:
                return Response(
                    {"Error": f"{kid.get_name()} is not on team {team}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if kid.position != position:
                return Response(
                    {
                        "Error": (
                            f"{kid.get_name()} is {kid.position}, not {position}"
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        already = TeamPair.objects.filter(
            Q(ballkid_a_id__in=[a.id, b.id]) | Q(ballkid_b_id__in=[a.id, b.id])
        )
        if already.exists():
            return Response(
                {"Error": "One of these ballkids is already paired"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pair = TeamPair.objects.create(
            team=team,
            position=position,
            ballkid_a=a,
            ballkid_b=b,
        )
        logger.info(
            "[TeamPairs] created team=%s position=%s a=%s b=%s",
            team,
            position,
            a.id,
            b.id,
        )
        return Response(
            TeamPairSerializer(pair).data, status=status.HTTP_201_CREATED
        )

    def delete(self, request, format=None):
        try:
            pair_id = int(request.data.get("id"))
        except (TypeError, ValueError):
            return Response(
                {"Error": "id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pair = get_object_or_404(TeamPair, id=pair_id)
        if not self._can_edit_team(request, pair.team):
            return Response(
                {"Error": "You can only edit pairs on your own team"},
                status=status.HTTP_403_FORBIDDEN,
            )

        team = pair.team
        pair.delete()
        logger.info("[TeamPairs] deleted id=%s team=%s", pair_id, team)
        return Response({"Success": "Pair removed"}, status=status.HTTP_200_OK)


class GetFinalsHistory(generics.ListAPIView):
    serializer_class = FinalsHistorySerializer
    permission_classes = [IsChairpersonOrSelf]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        return FinalsHistory.objects.filter(ballkid_id=pk).order_by("-year")


class GetPastFinals(generics.ListAPIView):
    serializer_class = FinalsHistorySerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        year = self.kwargs.get("year")
        return (
            FinalsHistory.objects.filter(year=year)
            .annotate(
                first_name=F("ballkid__first_name"), last_name=F("ballkid__last_name")
            )
            .order_by("match_type", "position", "last_name", "first_name")
        )


class GetCutHistory(generics.ListAPIView):
    serializer_class = CutHistorySerializer
    permission_classes = [IsChairpersonOrSelf]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        return CutHistory.objects.filter(ballkid_id=pk).order_by("-year")


class GetPastTeams(APIView):
    permission_classes = [IsChairpersonOrCaptain]

    def get(self, request, pk):
        year = get_current_year()
        # Get all the histories where this ballkid was a captain
        thresholded = CaptainHistory.objects.filter(
            captain_id=pk,
            start__year=year,
            duration__gte=timedelta(minutes=MIN_CAPTAIN_DURATION),
        )
        current = CaptainHistory.objects.filter(
            captain_id=pk, start__year=year, end=None
        )
        try:
            show_teams = Tournament.objects.get(year=get_current_year()).show_teams
        except Exception:
            show_teams = True

        union = (thresholded | current) if show_teams else thresholded

        histories = (
            union.annotate(date=TruncDay("start"))
            .values("date", "ballkid_id")
            .order_by("-date", "ballkid__last_name", "ballkid__first_name")
        )

        logger.info(f"[GetPastTeams] pk: {pk}; histories {histories}")

        # Map from date_str to list of ballkids that were on the captain's team
        # on that date
        date_to_ballkids = {}
        for history in histories:
            date = history["date"]
            ballkid_id = history["ballkid_id"]
            date_str = datetime.strftime(date, WEEKDAY_MONTH_DAY_FORMAT_STR)

            # If date_str is not in map yet, create an empty list of ballkids for that day
            if date_str not in date_to_ballkids:
                date_to_ballkids[date_str] = []

            # If the ballkid is not in the list of ballkids on that day yet, add them
            if ballkid_id not in date_to_ballkids[date_str]:
                date_to_ballkids[date_str].append(ballkid_id)

        return Response(date_to_ballkids, status=status.HTTP_200_OK)


class GetCheckinHistory(APIView):
    permission_classes = [IsChairpersonOrSelf]

    def get(self, request, pk):
        histories = CheckinHistory.objects.filter(
            ballkid_id=pk, start__year=get_current_year()
        ).order_by("start")
        return Response(CheckinHistorySerializer(histories, many=True).data)


class GetCaptainAnalytics(APIView):
    permission_classes = [IsChairpersonOrSelf]

    def get(self, request, pk):
        ballkid = get_object_or_404(Ballkid, id=pk)
        recalc_captain_analytics(ballkid=ballkid)
        analytics = CaptainAnalytics.objects.filter(
            ballkid_id=pk,
            duration__gte=timedelta(minutes=MIN_CAPTAIN_DURATION),
            year=get_current_year(),
        ).order_by("-duration")
        return Response(CaptainAnalyticsSerializer(analytics, many=True).data)


class GetFinalsAnalytics(APIView):
    permission_classes = [IsChairpersonOrSelf]

    def get(self, request, pk):
        ballkid = get_object_or_404(Ballkid, id=pk)
        recalc_finals_analytics(ballkid)
        analytics = FinalsAnalytics.objects.filter(
            ballkid_id=pk,
        ).order_by(
            Case(
                When(match_type=MATCH_TYPE.MS, then=Value(0)),
                When(match_type=MATCH_TYPE.WS, then=Value(1)),
                When(match_type=MATCH_TYPE.MD, then=Value(2)),
                default=Value(3),
            )
        )
        return Response(FinalsAnalyticsSerializer(analytics, many=True).data)


class GetCheckinCourtAnalytics(APIView):
    permission_classes = [IsChairpersonOrSelf]

    def get(self, request, pk):
        ballkid = get_object_or_404(Ballkid, id=pk)
        recalc_court_analytics(ballkid=ballkid)
        recalc_checkin_analytics(ballkid=ballkid)

        ballkids = annotate_durations(Ballkid.objects.filter(id=pk))
        return Response(BallkidSerializer(ballkids[0]).data)


class GetAverageCheckinTime(APIView):
    permission_classes = [IsChairpersonOrSelf]

    def get(self, request, pk):
        # Annotate from CheckinHistory directly — no full-table analytics recalc.
        ballkids = Ballkid.objects.annotate(
            avg_checkin_time=Avg(
                Case(
                    When(
                        Q(checkinhistory__is_first_checkin=True)
                        & Q(checkinhistory__start__year=get_current_year()),
                        then="checkinhistory__start__time",
                    )
                )
            ),
        )
        average = ballkids.aggregate(checkin_time_avg=Avg("avg_checkin_time"))

        return Response(
            {
                "ballkid": ballkids.get(id=pk).avg_checkin_time,
                "average": average["checkin_time_avg"],
            },
            status=status.HTTP_200_OK,
        )


class GetCheckinLeaderboard(generics.ListAPIView):
    permission_classes = [IsChairperson]
    serializer_class = BallkidSerializer

    def get_queryset(self):
        recalc_checkin_analytics()
        year = get_current_year()

        return (
            Ballkid.objects.filter(is_active=True)
            .annotate(
                checkin_duration=Avg(
                    "checkinanalytics__duration",
                    filter=Q(checkinanalytics__year=year),
                ),
                checkin_days=Avg(
                    "checkinanalytics__count",
                    filter=Q(checkinanalytics__year=year),
                    output_field=IntegerField(),
                ),
                avg_checkin_time=Avg(
                    Case(
                        When(
                            Q(checkinhistory__is_first_checkin=True)
                            & Q(checkinhistory__start__year=year),
                            then="checkinhistory__start__time",
                        )
                    )
                ),
            )
            .order_by("-checkin_duration")
        )


class GetAverageCheckinLeaderboard(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        year = get_current_year()
        recalc_checkin_analytics()

        averages = (
            Ballkid.objects.filter(is_active=True)
            .annotate(
                checkin_time=Avg(
                    Case(
                        When(
                            Q(checkinhistory__is_first_checkin=True)
                            & Q(checkinhistory__start__year=year),
                            then="checkinhistory__start__time",
                        )
                    )
                ),
            )
            .aggregate(
                checkin_avg=Avg(
                    "checkinanalytics__duration",
                    filter=Q(checkinanalytics__year=year),
                ),
                days_avg=Avg(
                    "checkinanalytics__count",
                    filter=Q(checkinanalytics__year=year),
                ),
                avg_checkin_time=Avg("checkin_time"),
            )
        )

        return Response(averages, status=status.HTTP_200_OK)


class GetRatingsCaptainLeaderboard(generics.ListAPIView):
    permission_classes = [IsChairperson]
    serializer_class = BallkidSerializer

    def get_queryset(self):
        year = get_current_year()
        run_calibration_and_save_params(year)

        return (
            Ballkid.objects.filter(is_active=True)
            .filter(Q(is_captain=True) | Q(is_chairperson=True))
            .annotate(
                num_ratings=Coalesce(
                    Avg(
                        "calibrationparams__num_rater_ratings",
                        filter=Q(calibrationparams__year=year),
                        output_field=IntegerField(),
                    ),
                    0,
                ),
                raw_avg=Coalesce(
                    Avg(
                        "calibrationparams__rater_raw_avg",
                        filter=Q(calibrationparams__year=year),
                    ),
                    0.0,
                ),
                raw_stdev=Coalesce(
                    Avg(
                        "calibrationparams__rater_raw_stdev",
                        filter=Q(calibrationparams__year=year),
                    ),
                    0.0,
                ),
                scale=Coalesce(
                    Avg(
                        "calibrationparams__rater_scale",
                        filter=Q(calibrationparams__year=year),
                    ),
                    0.0,
                ),
                offset=Coalesce(
                    Avg(
                        "calibrationparams__rater_offset",
                        filter=Q(calibrationparams__year=year),
                    ),
                    0.0,
                ),
                distance_to_ideal=Coalesce(
                    Avg(
                        "calibrationparams__rater_distance_to_ideal",
                        filter=Q(calibrationparams__year=year),
                    ),
                    0.0,
                ),
            )
            .order_by("-num_ratings")
        )


class GetRatingsBallkidLeaderboard(generics.ListAPIView):
    permission_classes = [IsChairperson]
    serializer_class = BallkidSerializer

    def get_queryset(self):
        year = get_current_year()
        run_calibration_and_save_params(year)

        return (
            Ballkid.objects.filter(is_active=True)
            .annotate(
                num_ratings=Coalesce(
                    Avg(
                        "calibrationparams__num_ratee_ratings",
                        filter=Q(calibrationparams__year=year),
                        output_field=IntegerField(),
                    ),
                    0,
                ),
                raw_avg=Coalesce(
                    Avg(
                        "calibrationparams__ratee_raw_avg",
                        filter=Q(calibrationparams__year=year),
                    ),
                    0.0,
                ),
                raw_stdev=Coalesce(
                    Avg(
                        "calibrationparams__ratee_raw_stdev",
                        filter=Q(calibrationparams__year=year),
                    ),
                    0.0,
                ),
                calibrated_avg=Coalesce(
                    Avg(
                        "calibrationparams__ratee_calibrated_avg",
                        filter=Q(calibrationparams__year=year),
                    ),
                    0.0,
                ),
                calibrated_stdev=Coalesce(
                    Avg(
                        "calibrationparams__ratee_calibrated_stdev",
                        filter=Q(calibrationparams__year=year),
                    ),
                    0.0,
                ),
            )
            .order_by("-calibrated_avg", "-raw_avg")
        )


class GetCourtLeaderboard(generics.ListAPIView):
    permission_classes = [IsChairperson]
    serializer_class = BallkidSerializer

    def get_queryset(self):
        recalc_court_analytics()
        recalc_checkin_analytics()

        return annotate_durations(Ballkid.objects.filter(is_active=True)).order_by(
            "-court_duration"
        )


class GetAverageCourtLeaderboard(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        recalc_court_analytics()
        recalc_checkin_analytics()

        averages = annotate_durations(Ballkid.objects.filter(is_active=True)).aggregate(
            checkin_avg=Coalesce(Avg("checkin_duration"), timedelta()),
            days_avg=Coalesce(Avg("checkin_days"), 0.0),
            court_avg=Coalesce(Avg("court_duration"), timedelta()),
            stadium_avg=Coalesce(Avg("stadium_duration"), timedelta()),
            harris_avg=Coalesce(Avg("harris_duration"), timedelta()),
            grandstand_avg=Coalesce(Avg("grandstand_duration"), timedelta()),
            four_avg=Coalesce(Avg("four_duration"), timedelta()),
            five_avg=Coalesce(Avg("five_duration"), timedelta()),
        )

        return Response(averages, status=status.HTTP_200_OK)


class BannerList(generics.ListAPIView):
    serializer_class = BannerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        banners = Banner.objects.annotate(
            ballkid_name=Concat(
                "ballkid__first_name", Value(" "), "ballkid__last_name"
            ),
        ).order_by("timestamp")
        return banners


class UpdateBanner(APIView):
    serializer_class = BannerSerializer
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        timestamp = datetime.strptime(
            request.data["time"],
            f"{SLASH_MONTH_DAY_YEAR_FORMAT_STR}, {HOUR_MINUTE_SECOND_FORMAT_STR}",
        )

        banner = Banner.objects.create(
            message=request.data["message"],
            timestamp=timestamp,
            audience=request.data["audience"],
        )
        if "ballkidId" in request.data:
            ballkid = Ballkid.objects.get(id=request.data["ballkidId"])
            banner.ballkid = ballkid
            banner.save()

        logger.info(
            f"[UpdateBanner] Created banner {banner} given request {request.data}"
        )
        return Response({"Success": f"Created banner"}, status=status.HTTP_200_OK)

    def patch(self, request, format=None):
        timestamp = datetime.strptime(
            request.data["time"],
            f"{SLASH_MONTH_DAY_YEAR_FORMAT_STR}, {HOUR_MINUTE_SECOND_FORMAT_STR}",
        )

        banner = Banner.objects.get(id=request.data["id"])
        banner.message = request.data["message"]
        banner.timestamp = timestamp

        if "ballkidId" in request.data and request.data["ballkidId"]:
            ballkid = Ballkid.objects.get(id=request.data["ballkidId"])
            banner.ballkid = ballkid

        banner.save()

        logger.info(
            f"[UpdateBanner] Banner updated {banner} given request {request.data}"
        )
        return Response({"Success": f"Updated banner"}, status=status.HTTP_200_OK)

    def delete(self, request, format=None):
        banner = Banner.objects.get(id=request.data["id"])
        logger.info(f"[UpdateBanner] Deleting banner {banner}")
        banner.delete()
        return Response({"Success": f"Deleted banner"}, status=status.HTTP_200_OK)


