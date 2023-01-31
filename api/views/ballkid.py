from django.shortcuts import render, get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from api.serializers import *
from api.models.ballkid import *
from django.db.models import Max, Q, Sum
from django.db.models.functions import TruncDay
from api.utils import *
from api.permissions import *


class BallkidsList(generics.ListAPIView):
    serializer_class = BallkidSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Ballkid.objects.filter(is_active=True)
            .exclude(is_cut=CUT_STATUS.T)
            .order_by("last_name", "first_name")
        )


class BallkidsCutList(generics.ListAPIView):
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
        return (
            Ballkid.objects.all()
            .filter(is_active=True)
            .exclude(is_cut=CUT_STATUS.T)
            .order_by(
                "-is_captain",
                "-num_years_experience",
            )
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


class UpdateBallkid(APIView):  # consider changing to extend UpdateAPIView
    serializer_class = BallkidSerializer
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():
            first_name = serializer.data["first_name"]
            last_name = serializer.data["last_name"]

            queryset = Ballkid.objects.filter(first_name=first_name, last_name=last_name)
            if queryset.exists():
                ballkid = queryset[0]
                for field in serializer.data:
                    if field in ["first_name", "last_name", "user"]:
                        continue

                    ballkid.set_field(field, serializer.data[field])

                ballkid.validate()
                ballkid.save()

                return Response(BallkidSerializer(ballkid).data)

            return Response(
                {
                    f"Ballkid Not Found": "Invalid ballkid first name {first_name} and last name {last_name}"
                },
                status=status.HTTP_404_NOT_FOUND,
            )
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
        queryset = Ballkid.objects.filter(is_cut=CUT_STATUS.P)
        for ballkid in queryset:
            ballkid.set_field("is_cut", CUT_STATUS.T)
            ballkid.validate()
            ballkid.save()

        return Response(
            {"Success": "All pending ballkids cut"},
            status=status.HTTP_200_OK,
        )


class CalcNumTeams(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        num_teams = 0
        ballkids = Ballkid.objects.all().filter(is_active=True, is_checked_in=True)
        if len(ballkids) > 0:
            num_teams = ballkids.aggregate(num_teams=Max("current_team"))["num_teams"]
        return Response({"num_teams": num_teams}, status=status.HTTP_200_OK)


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
    permission_classes = [IsChairperson]

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


class GetCheckinAnalytics(APIView):
    permission_classes = [IsChairperson]

    def get(self, request, pk):
        ballkid = get_object_or_404(Ballkid, id=pk)
        ballkid.recalc_checkin_analytics()
        analytic = CheckinAnalytics.objects.get(ballkid_id=pk)
        return Response(CheckinAnalyticsSerializer(analytic).data)


class GetCheckinHistory(APIView):
    permission_classes = [IsChairperson]

    def get(self, request, pk):
        histories = CheckinHistory.objects.filter(ballkid_id=pk).order_by("checkin")
        return Response(CheckinHistorySerializer(histories, many=True).data)


class GetCaptainAnalytics(APIView):
    permission_classes = [IsChairperson]

    def get(self, request, pk):
        ballkid = get_object_or_404(Ballkid, id=pk)
        ballkid.recalc_captain_analytics()
        analytics = (
            CaptainAnalytics.objects.all().filter(ballkid_id=pk).order_by("-duration")
        )
        return Response(CaptainAnalyticsSerializer(analytics, many=True).data)


class GetCourtAnalytics(APIView):
    permission_classes = [IsChairperson]

    def get(self, request, pk):
        ballkid = get_object_or_404(Ballkid, id=pk)
        ballkid.recalc_court_analytics()
        analytics = CourtAnalytics.objects.all().filter(ballkid_id=pk)
        return Response(CourtAnalyticsSerializer(analytics, many=True).data)


class CreateCheckinHistory(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        ballkid = Ballkid.objects.get(id=request.data["ballkid_id"])

        checkin = input_str_to_datetime(request.data["checkin"])
        checkout = input_str_to_datetime(request.data["checkout"])

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

        start = input_str_to_datetime(request.data["start"])
        end = input_str_to_datetime(request.data["end"])

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

        start = input_str_to_datetime(request.data["start"])
        end = input_str_to_datetime(request.data["end"])

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
