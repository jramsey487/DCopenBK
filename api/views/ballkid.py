from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import (
    Max,
    Count,
    Sum,
    F,
    Q,
    Avg,
    OuterRef,
    StdDev,
    Exists,
    Case,
    When,
)
from django.db.models.functions import TruncDay, Coalesce, DenseRank
from django.shortcuts import get_object_or_404

from api.models.ballkid import *
from api.models.rating import *
from api.models.schedule import COURT
from api.serializers import *
from api.utils import *
from api.consts import *
from api.permissions import *
from accounts.views import UpdateCaptainStatus

from datetime import timedelta
import logging

logger = logging.getLogger("api.ballkid")


def recalc_checkin_analytics(ballkid=None, now=None):
    """
    Recalculates total checkin duration for the ballkid and saves to the
    CheckinAnalytics table

    TODO: make this more efficient by caching the result and only
    updating based on the most recent history
    """
    logger.info(f"[recalc-checkin-analytics] for ballkid {ballkid}")

    if now is None:
        now = datetime.now()

    # If not updating a specific ballkid, get all histories and create analytics for
    # all active ballkids
    if ballkid is None:
        histories = CheckinHistory.objects.filter(ballkid__is_active=True)

        # Dict mapping ballkid_id to [set of days, duration]
        analytics = {
            ballkid.id: [set(), timedelta()]
            for ballkid in Ballkid.objects.filter(is_active=True)
        }

    # If updating a specific ballkid, only get that ballkid's histories and only
    # create 1 analytic
    else:
        histories = CheckinHistory.objects.filter(ballkid_id=ballkid.id)
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
            CheckinAnalytics(ballkid_id=key, count=len(val[0]), duration=val[1])
            for key, val in analytics.items()
        ],
        update_conflicts=True,
        unique_fields=["ballkid_id"],
        update_fields=["count", "duration"],
    )
    logger.info(f"[recalc-checkin-analytics] Completed bulk create")


def recalc_court_analytics(ballkid=None, now=None):
    logger.info(f"[recalc-court-analytics] for ballkid {ballkid}")

    if now is None:
        now = datetime.now()

    # If not updating a specific ballkid, get all histories and create analytics for
    # all active ballkids
    if ballkid is None:
        histories = TeamHistory.objects.all()

        # Dict mapping ballkid_id to [count, duration]
        analytics = {
            (ballkid.id, court): [0, timedelta()]
            for ballkid in Ballkid.objects.filter(is_active=True)
            for court in NUM_COURTS_TO_COURTS[5]
        }

    # If updating a specific ballkid, only get that ballkid's histories and only
    # create 1 analytic
    else:
        histories = TeamHistory.objects.filter(ballkid_id=ballkid.id)
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
            CourtAnalytics(ballkid_id=key[0], court=key[1], count=val[0], duration=val[1])
            for key, val in analytics.items()
        ],
        update_conflicts=True,
        unique_fields=["ballkid_id", "court"],
        update_fields=["count", "duration"],
    )
    logger.info(f"[recalc-court-analytics] Completed bulk create")


def recalc_captain_analytics(ballkid, now=None):
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

    for updateAsCaptain in [True, False]:
        # If ballkid is not a captain, then don't update as captain
        if updateAsCaptain and not ballkid.is_captain:
            continue

        durations = {}
        counts = {}

        # If updating as captain, then treat self as the captain
        if updateAsCaptain:
            histories = CaptainHistory.objects.filter(captain=ballkid)
        # If not updating as captain, then treat self as the ballkid
        else:
            histories = CaptainHistory.objects.filter(ballkid=ballkid)

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
                    defaults={"duration": durations[other_id], "count": counts[other_id]},
                )
                logger.info(
                    f"[recalc-captain-analytics] For (ballkid {other_id}, captain {ballkid.id}), created {created} analytic {analytic}"
                )
            else:
                analytic, created = CaptainAnalytics.objects.update_or_create(
                    ballkid=ballkid,
                    captain_id=other_id,
                    defaults={"duration": durations[other_id], "count": counts[other_id]},
                )
                logger.info(
                    f"[recalc-captain-analytics] For (ballkid {ballkid.id}, captain {other_id}), created {created} analytic {analytic}"
                )


def annotate_ratings(ballkids, pk):
    current_year = get_current_year()

    return ballkids.annotate(
        num_ratings=Count("ratee", filter=Q(ratee__date__year=current_year)),
        have_rated=Exists(
            Rating.objects.filter(
                rater_id=pk,
                ratee_id=OuterRef("id"),
                date__year=current_year,
            )
        ),
    )


def annotate_durations(ballkids):
    return ballkids.annotate(
        checkin_duration=Coalesce(F("checkinanalytics__duration"), timedelta()),
        checkin_days=Coalesce(F("checkinanalytics__count"), 0),
        court_duration=Coalesce(Sum("courtanalytics__duration"), timedelta()),
        stadium_duration=Coalesce(
            Sum(
                "courtanalytics__duration",
                filter=Q(courtanalytics__court=COURT.STADIUM),
            ),
            timedelta(),
        ),
        harris_duration=Coalesce(
            Sum(
                "courtanalytics__duration",
                filter=Q(courtanalytics__court=COURT.HARRIS),
            ),
            timedelta(),
        ),
        grandstand_duration=Coalesce(
            Sum(
                "courtanalytics__duration",
                filter=Q(courtanalytics__court=COURT.GRANDSTAND),
            ),
            timedelta(),
        ),
        four_duration=Coalesce(
            Sum(
                "courtanalytics__duration",
                filter=Q(courtanalytics__court=COURT.FOUR),
            ),
            timedelta(),
        ),
        five_duration=Coalesce(
            Sum(
                "courtanalytics__duration",
                filter=Q(courtanalytics__court=COURT.FIVE),
            ),
            timedelta(),
        ),
    )


def annotate_rank(ballkids):
    return ballkids.annotate(
        num_ratings=Count("ratee", filter=Q(ratee__date__year=get_current_year())),
        calibrated_avg=Coalesce(F("calibrationparams__ratee_calibrated_avg"), 0.0),
        rank=models.Window(
            expression=DenseRank(),
            order_by=Coalesce(F("calibrationparams__ratee_calibrated_avg"), 0.0).desc(),
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
    serializer_class = BallkidSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        ballkids = Ballkid.objects.filter(is_active=True).order_by(
            "last_name", "first_name"
        )

        queryset = ballkids if not pk else annotate_ratings(ballkids, pk)
        logger.info(f"[BallkidsList] pk: {pk}; ballkids: {queryset}")
        return queryset


class EmailsList(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        emails = Ballkid.objects.filter(
            is_active=True, is_chairperson=False, is_cut=False
        ).values_list("user__email", flat=True)
        return Response({"emails": emails}, status=status.HTTP_200_OK)


class SelfCutList(generics.ListAPIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        current_day = datetime.strftime(
            (datetime.now() - timedelta(hours=MATCHES_START_HOUR)), "%A"
        )
        ballkids = Ballkid.objects.filter(
            is_active=True, is_cut=False, last_day=current_day
        ).order_by("last_name", "first_name")

        for ballkid in ballkids:
            ballkid.cut_status = "self_cut"
            ballkid.save()

        logger.info(
            f"[SelfCutList] for current_day {current_day}, self cut list is {ballkids}"
        )
        return ballkids


class BallkidsSortedList(generics.ListAPIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        group = self.request.user.groups.first().name

        ballkids = Ballkid.objects.filter(is_active=True, is_cut=False).order_by(
            "-is_chairperson",
            "-is_captain",
            "-num_years_experience",
            "last_name",
            "first_name",
        )

        if group == "captain" or group == "chairperson":
            ballkids = ballkids if not pk else annotate_ratings(ballkids, pk)

        if group == "chairperson":
            ballkids = annotate_rank(ballkids)

        logger.info(
            f"[BallkidsSortedList] group: {group} with pk: {pk}, returning ballkids: {ballkids}"
        )
        return ballkids


class BallkidsInactiveList(generics.ListAPIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        return Ballkid.objects.filter(Q(is_active=False) | Q(is_cut=True)).order_by(
            "last_name", "first_name"
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
        queryset = (
            Ballkid.objects.filter(current_team=team)
            if team_type == "current_team"
            else Ballkid.objects.filter(finals_team=team)
        )

        logger.info(f"[ClearTeam] clearing team {team} with ballkids {queryset}")

        if queryset.exists():
            for ballkid in queryset:
                ballkid.set_field(team_type, 0 if team_type == "current_team" else "")
                ballkid.validate()
                ballkid.save()

        if team_type == "current_team":
            unassign_future_shifts(team)

        return Response(f"Team {team} cleared", status=status.HTTP_200_OK)


class GetFinalsHistory(generics.ListAPIView):
    serializer_class = FinalsHistorySerializer
    permission_classes = [IsChairpersonOrSelf]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        return FinalsHistory.objects.filter(ballkid_id=pk).order_by("match_type")


class GetCutHistory(generics.ListAPIView):
    serializer_class = CutHistorySerializer
    permission_classes = [IsChairpersonOrSelf]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        return CutHistory.objects.filter(ballkid_id=pk).order_by("-year")


class GetPastTeams(APIView):
    permission_classes = [IsChairpersonOrCaptain]

    def get(self, request, pk):
        # Get all the histories where this ballkid was a captain
        thresholded = CaptainHistory.objects.filter(
            captain_id=pk, duration__gte=timedelta(minutes=MIN_CAPTAIN_DURATION)
        )
        current = CaptainHistory.objects.filter(captain_id=pk, end=None)
        try:
            show_teams = Tournament.objects.get(year=2023).show_teams
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
        histories = CheckinHistory.objects.filter(ballkid_id=pk).order_by("start")
        return Response(CheckinHistorySerializer(histories, many=True).data)


class GetCaptainAnalytics(APIView):
    permission_classes = [IsChairpersonOrSelf]

    def get(self, request, pk):
        ballkid = get_object_or_404(Ballkid, id=pk)
        recalc_captain_analytics(ballkid=ballkid)
        analytics = CaptainAnalytics.objects.filter(
            ballkid_id=pk, duration__gte=timedelta(minutes=MIN_CAPTAIN_DURATION)
        ).order_by("-duration")
        return Response(CaptainAnalyticsSerializer(analytics, many=True).data)


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
        recalc_checkin_analytics()
        recalc_court_analytics()

        ballkids = Ballkid.objects.annotate(
            avg_checkin_time=Avg(
                Case(
                    When(
                        checkinhistory__is_first_checkin=True,
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

        return (
            Ballkid.objects.filter(is_active=True)
            .annotate(
                checkin_duration=F("checkinanalytics__duration"),
                checkin_days=F("checkinanalytics__count"),
                avg_checkin_time=Avg(
                    Case(
                        When(
                            checkinhistory__is_first_checkin=True,
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
        recalc_checkin_analytics()

        averages = (
            Ballkid.objects.filter(is_active=True)
            .annotate(
                checkin_time=Avg(
                    Case(
                        When(
                            checkinhistory__is_first_checkin=True,
                            then="checkinhistory__start__time",
                        )
                    )
                ),
            )
            .aggregate(
                checkin_avg=Avg("checkinanalytics__duration"),
                days_avg=Avg("checkinanalytics__count"),
                avg_checkin_time=Avg("checkin_time"),
            )
        )

        return Response(averages, status=status.HTTP_200_OK)


class GetRatingsCaptainLeaderboard(generics.ListAPIView):
    permission_classes = [IsChairperson]
    serializer_class = BallkidSerializer

    def get_queryset(self):
        current_year = get_current_year()

        return (
            Ballkid.objects.filter(is_active=True)
            .filter(Q(is_captain=True) | Q(is_chairperson=True))
            .annotate(
                num_ratings=Count("rater", filter=Q(rater__date__year=current_year)),
                raw_avg=Coalesce(
                    Avg("rater__rating", filter=Q(rater__date__year=current_year)), 0.0
                ),
                raw_stdev=Coalesce(
                    StdDev("rater__rating", filter=Q(rater__date__year=current_year)), 0.0
                ),
                scale=F("calibrationparams__rater_scale"),
                offset=F("calibrationparams__rater_offset"),
            )
            .order_by("-num_ratings")
        )


class GetRatingsBallkidLeaderboard(generics.ListAPIView):
    permission_classes = [IsChairperson]
    serializer_class = BallkidSerializer

    def get_queryset(self):
        current_year = get_current_year()

        return (
            Ballkid.objects.filter(is_active=True)
            .annotate(
                num_ratings=Count("ratee", filter=Q(ratee__date__year=current_year)),
                raw_avg=Coalesce(
                    Avg("ratee__rating", filter=Q(ratee__date__year=current_year)), 0.0
                ),
                raw_stdev=Coalesce(
                    StdDev("ratee__rating", filter=Q(ratee__date__year=current_year)), 0.0
                ),
                calibrated_avg=Coalesce(
                    F("calibrationparams__ratee_calibrated_avg"), 0.0
                ),
                calibrated_stdev=Coalesce(
                    F("calibrationparams__ratee_calibrated_stdev"), 0.0
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
            days_avg=Avg("checkinanalytics__count"),
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
        banners = Banner.objects.order_by("timestamp")
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
            message=request.data["message"], timestamp=timestamp
        )
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
