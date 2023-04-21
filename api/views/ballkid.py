from django.shortcuts import get_object_or_404
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
    Subquery,
    OuterRef,
    StdDev,
    Exists,
)
from django.db.models.functions import TruncDay, TruncDate, Coalesce
from api.serializers import *
from api.models.ballkid import *
from api.models.rating import *
from api.models.schedule import Court
from api.utils import *
from api.permissions import *
from accounts.views import UpdateCaptainStatus
from datetime import timedelta


class BallkidsList(generics.ListAPIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        ballkids = Ballkid.objects.filter(is_active=True, is_cut=False).order_by(
            "last_name", "first_name"
        )

        if not pk:
            return ballkids

        return ballkids.annotate(
            num_ratings=Count("ratee"),
            have_rated=Exists(
                Rating.objects.filter(rater_id=pk, ratee_id=OuterRef("id"))
            ),
        )


class AllBallkidsList(generics.ListAPIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        return (
            Ballkid.objects.all()
            .filter(is_active=True)
            .order_by("last_name", "first_name")
        )


class BallkidsSortedList(generics.ListAPIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        ballkids = (
            Ballkid.objects.all()
            .filter(is_active=True, is_cut=False)
            .order_by(
                "-is_captain",
                "-num_years_experience",
            )
        )

        if not pk:
            return ballkids

        return ballkids.annotate(
            num_ratings=Count("ratee"),
            have_rated=Exists(
                Rating.objects.filter(rater_id=pk, ratee_id=OuterRef("id"))
            ),
        )


class BallkidsArchivedList(generics.ListAPIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        return (
            Ballkid.objects.all()
            .filter(is_active=False)
            .order_by("last_name", "first_name")
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
                data["image"] = "api/static/img/none.jpg"

            ballkid, created = Ballkid.objects.get_or_create(
                first_name=serializer.data["first_name"],
                last_name=serializer.data["last_name"],
                defaults=data,
            )

            ballkid.validate()
            ballkid.save()

            return Response(BallkidSerializer(ballkid).data)

        return Response(
            {"Invalid serializer": f"Errors: {serializer.errors}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class GetBallkid(generics.RetrieveAPIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsAuthenticated]
    queryset = Ballkid.objects.all()


class UpdateBallkid(APIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        # I have absolutely no idea why, but the following line is necessary to
        # prevent a RawPostDataException: You cannot access body after reading
        # from request's data stream
        request.body

        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():
            # Get ballkid with the corresponding first and last names
            first_name = serializer.data["first_name"]
            last_name = serializer.data["last_name"]
            ballkid = get_object_or_404(
                Ballkid, first_name=first_name, last_name=last_name
            )

            for field in serializer.data:
                if field in ["first_name", "last_name", "user"]:
                    continue

                # Update the ballkid's field per the patch request
                ballkid.set_field(field, serializer.data[field])

                # If updating whether or not the ballkid is a captain, also update
                # account permissions for that ballkid
                if field == "is_captain":
                    view = UpdateCaptainStatus.as_view()
                    response = view(request._request)

            ballkid.validate()
            ballkid.save()

            return Response(BallkidSerializer(ballkid).data)

        return Response(
            {"Invalid serializer": "Errors: {serializer.errors}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class CheckoutAll(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        queryset = Ballkid.objects.filter(is_checked_in=True)
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

        cut_status = request.data["cut_status"]
        queryset = Ballkid.objects.filter(cut_status=cut_status)
        for ballkid in queryset:
            ballkid.set_field("is_cut", should_cut)
            ballkid.set_field("cut_status", "")
            ballkid.validate()
            ballkid.save()

        return Response(
            {
                "Success": f"All ballkids in cut status tier {cut_status} were handled for cut_all: {should_cut}"
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

        return Response(
            {"teams": [team + 1 for team in range(num_teams)]},
            status=status.HTTP_200_OK,
        )


class ClearTeam(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        if "current_team" not in request.data:
            return Response(
                {"Bad request": "Missing current_team argument"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        team = request.data["current_team"]
        queryset = Ballkid.objects.filter(current_team=team)
        if queryset.exists():
            for ballkid in queryset:
                ballkid.set_field("current_team", 0)
                ballkid.validate()
                ballkid.save()

            return Response(f"Team {team} cleared", status=status.HTTP_200_OK)

        return Response(
            f"Team {team} does not exist, already clear",
            status=status.HTTP_200_OK,
        )


class ClearFinalsTeam(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        if "finals_team" not in request.data:
            return Response(
                {"Bad request": "Missing finals_team argument"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        team = request.data["finals_team"]
        queryset = Ballkid.objects.filter(finals_team=team)
        if queryset.exists():
            for ballkid in queryset:
                ballkid.set_field("finals_team", "")
                ballkid.validate()
                ballkid.save()

            return Response(f"Team {team} cleared", status=status.HTTP_200_OK)

        return Response(
            f"Team {team} is already clear",
            status=status.HTTP_200_OK,
        )


class GetFinalsHistory(generics.ListAPIView):
    serializer_class = FinalsHistorySerializer
    permission_classes = [IsChairpersonOrSelf]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        return FinalsHistory.objects.filter(ballkid_id=pk).order_by("-year")


class GetCutHistory(APIView):
    pass


class GetPastTeams(APIView):
    permission_classes = [IsChairpersonOrCaptain]

    def get(self, request, pk):
        # Get all the histories where this ballkid was a captain
        histories = (
            CaptainHistory.objects.filter(captain_id=pk)
            .annotate(date=TruncDay("start"))
            .values("date", "ballkid_id")
            .order_by("-date", "ballkid__last_name", "ballkid__first_name")
        )

        # Map from date_str to list of ballkids that were on the captain's team
        # on that date
        date_to_ballkids = {}
        for history in histories:
            date = history["date"]
            ballkid_id = history["ballkid_id"]
            date_str = datetime.strftime(date, "%a, %b %-d")

            # If date_str is not in map yet, create an empty list of ballkids for that day
            if date_str not in date_to_ballkids:
                date_to_ballkids[date_str] = []

            # If the ballkid is not in the list of ballkids on that day yet, add them
            if ballkid_id not in date_to_ballkids[date_str]:
                date_to_ballkids[date_str].append(ballkid_id)

        return Response(date_to_ballkids, status=status.HTTP_200_OK)


class GetCheckinDuration(APIView):
    permission_classes = [IsChairpersonOrSelf]

    def get(self, request, pk):
        ballkid = (
            Ballkid.objects.filter(id=pk)
            .annotate(
                checkin_duration=Sum("checkinhistory__duration"),
                checkin_days=Count(TruncDate("checkinhistory__checkin"), distinct=True),
            )
            .first()
        )
        return Response(BallkidSerializer(ballkid).data)


class GetCheckinLeaderboard(generics.ListAPIView):
    permission_classes = [IsChairperson]
    serializer_class = BallkidSerializer

    def get_queryset(self):
        return (
            Ballkid.objects.filter(is_active=True)
            .annotate(
                checkin_duration=Sum("checkinhistory__duration"),
                checkin_days=Count(TruncDate("checkinhistory__checkin"), distinct=True),
            )
            .order_by("-checkin_duration")
        )


class GetAverageCheckinLeaderboard(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        averages = (
            Ballkid.objects.filter(is_active=True)
            .annotate(
                checkin_duration=Sum("checkinhistory__duration"),
                checkin_days=Count(TruncDate("checkinhistory__checkin"), distinct=True),
            )
            .aggregate(
                checkin_avg=Avg("checkin_duration"),
                days_avg=Avg("checkin_days"),
            )
        )

        return Response(averages, status=status.HTTP_200_OK)


class GetRatingsLeaderboard(generics.ListAPIView):
    permission_classes = [IsChairperson]
    serializer_class = BallkidSerializer

    def get_queryset(self):
        return (
            Ballkid.objects.filter(is_active=True)
            .filter(Q(is_captain=True) | Q(is_chairperson=True))
            .annotate(
                num_ratings=Count("rater"),
                avg_rating=Avg("rater__rating"),
                stdev_rating=StdDev("rater__rating"),
                scale=F("calibrationparams__rater_scale"),
                offset=F("calibrationparams__rater_offset"),
            )
            .order_by("-num_ratings")
        )


class GetCourtLeaderboard(generics.ListAPIView):
    permission_classes = [IsChairperson]
    serializer_class = BallkidSerializer

    def get_queryset(self):
        return (
            Ballkid.objects.filter(is_active=True)
            .annotate(
                checkin_duration=Subquery(
                    Ballkid.objects.filter(id=OuterRef("id"))
                    .annotate(Sum("checkinhistory__duration"))
                    .values("checkinhistory__duration__sum"),
                ),
                court_duration=Coalesce(Sum("courtanalytics__duration"), timedelta()),
                stadium_duration=Coalesce(
                    Sum(
                        "courtanalytics__duration",
                        filter=Q(courtanalytics__court=Court.STADIUM),
                    ),
                    timedelta(),
                ),
                harris_duration=Coalesce(
                    Sum(
                        "courtanalytics__duration",
                        filter=Q(courtanalytics__court=Court.HARRIS),
                    ),
                    timedelta(),
                ),
                grandstand_duration=Coalesce(
                    Sum(
                        "courtanalytics__duration",
                        filter=Q(courtanalytics__court=Court.GRANDSTAND),
                    ),
                    timedelta(),
                ),
                four_duration=Coalesce(
                    Sum(
                        "courtanalytics__duration",
                        filter=Q(courtanalytics__court=Court.FOUR),
                    ),
                    timedelta(),
                ),
                five_duration=Coalesce(
                    Sum(
                        "courtanalytics__duration",
                        filter=Q(courtanalytics__court=Court.FIVE),
                    ),
                    timedelta(),
                ),
            )
            .order_by("-court_duration")
        )


class GetAverageCourtLeaderboard(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        averages = (
            Ballkid.objects.filter(is_active=True)
            .annotate(
                checkin_duration=Subquery(
                    Ballkid.objects.filter(id=OuterRef("id"))
                    .annotate(Sum("checkinhistory__duration"))
                    .values("checkinhistory__duration__sum"),
                ),
                court_duration=Sum("courtanalytics__duration"),
                stadium_duration=Sum(
                    "courtanalytics__duration",
                    filter=Q(courtanalytics__court=Court.STADIUM),
                ),
                harris_duration=Sum(
                    "courtanalytics__duration",
                    filter=Q(courtanalytics__court=Court.HARRIS),
                ),
                grandstand_duration=Sum(
                    "courtanalytics__duration",
                    filter=Q(courtanalytics__court=Court.GRANDSTAND),
                ),
                four_duration=Sum(
                    "courtanalytics__duration",
                    filter=Q(courtanalytics__court=Court.FOUR),
                ),
                five_duration=Sum(
                    "courtanalytics__duration",
                    filter=Q(courtanalytics__court=Court.FIVE),
                ),
            )
            .aggregate(
                checkin_avg=Avg("checkin_duration"),
                court_avg=Avg("court_duration"),
                stadium_avg=Avg("stadium_duration"),
                harris_avg=Avg("harris_duration"),
                grandstand_avg=Avg("grandstand_duration"),
                four_avg=Avg("four_duration"),
                five_avg=Avg("five_duration"),
            )
        )

        return Response(averages, status=status.HTTP_200_OK)


class GetBallkidCheckinHistory(APIView):
    permission_classes = [IsChairpersonOrSelf]

    def get(self, request, pk):
        histories = CheckinHistory.objects.filter(ballkid_id=pk).order_by("checkin")
        return Response(CheckinHistorySerializer(histories, many=True).data)


class GetCaptainAnalytics(APIView):
    permission_classes = [IsChairpersonOrSelf]

    def get(self, request, pk):
        ballkid = get_object_or_404(Ballkid, id=pk)
        ballkid.recalc_captain_analytics()
        analytics = CaptainAnalytics.objects.filter(ballkid_id=pk).order_by("-duration")
        return Response(CaptainAnalyticsSerializer(analytics, many=True).data)


class GetCourtAnalytics(APIView):
    permission_classes = [IsChairpersonOrSelf]

    def get(self, request, pk):
        ballkid = get_object_or_404(Ballkid, id=pk)
        ballkid.recalc_court_analytics()
        analytics = CourtAnalytics.objects.all().filter(ballkid_id=pk)
        return Response(CourtAnalyticsSerializer(analytics, many=True).data)


class CreateCheckinHistory(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        ballkid = Ballkid.objects.get(id=request.data["ballkid_id"])

        checkin = datetime_str_to_datetime(request.data["checkin"])
        checkout = datetime_str_to_datetime(request.data["checkout"])

        if checkout:
            history = CheckinHistory.objects.create(
                ballkid=ballkid,
                checkin=checkin,
                checkout=checkout,
                duration=checkout - checkin,
            )
        else:
            history = CheckinHistory.objects.create(ballkid=ballkid, checkin=checkin)

        ballkid.recalc_checkin_analytics()

        return Response(CheckinHistorySerializer(history).data)


class CreateTeamHistory(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        ballkid = Ballkid.objects.get(id=request.data["ballkid_id"])

        start = datetime_str_to_datetime(request.data["start"])
        end = datetime_str_to_datetime(request.data["end"])

        if end:
            history = TeamHistory.objects.create(
                ballkid=ballkid,
                team=request.data["team"],
                start=start,
                end=end,
                duration=end - start,
            )
        else:
            history = TeamHistory.objects.create(
                ballkid=ballkid, start=start, team=request.data["team"]
            )

        ballkid.recalc_court_analytics()
        ballkid.recalc_captain_analytics()

        return Response(TeamHistorySerializer(history).data)


class CreateCaptainHistory(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        ballkid = Ballkid.objects.get(id=request.data["ballkid_id"])
        captain = Ballkid.objects.get(id=request.data["captain_id"])

        start = datetime_str_to_datetime(request.data["start"])
        end = datetime_str_to_datetime(request.data["end"])

        if end:
            history = CaptainHistory.objects.create(
                ballkid=ballkid,
                captain=captain,
                start=start,
                end=end,
                duration=end - start,
            )
        else:
            history = CaptainHistory.objects.create(
                ballkid=ballkid, captain=captain, start=start
            )

        ballkid.recalc_captain_analytics()
        captain.recalc_captain_analytics()

        return Response(CaptainHistorySerializer(history).data)


class CreateFinalsHistory(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        ballkid = Ballkid.objects.get(id=request.data["ballkid_id"])
        history = FinalsHistory.objects.create(
            ballkid=ballkid,
            year=request.data["year"],
            match_type=request.data["match_type"],
        )

        return Response(FinalsHistorySerializer(history).data)


class CreateCutHistory(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        ballkid = Ballkid.objects.get(id=request.data["ballkid_id"])
        furthest_day = datetime.strptime(request.data["furthest_day"], "%m/%d/%Y").date()

        history = CutHistory.objects.create(
            ballkid=ballkid,
            year=request.data["year"],
            furthest_day=furthest_day,
            self_cut=request.data["self_cut"],
        )

        return Response(CutHistorySerializer(history).data)
