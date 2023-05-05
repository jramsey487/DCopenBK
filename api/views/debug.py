from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User, Group
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from api.serializers import *
from api.utils import *
from api.permissions import *
from api.models.ballkid import *
from api.models.rating import *
from datetime import datetime
import csv
import io


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


class UpdateShift(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        start = datetime_str_to_datetime(request.data["start"])
        end = datetime_str_to_datetime(request.data["end"])
        court = request.data["court"]

        if end < start or end > start + timedelta(hours=1):
            return Response(
                {"Invalid shift update": f"Invalid end time"},
                status=status.HTTP_406_NOT_ACCEPTABLE,
            )

        shift = Schedule.objects.filter(start=start, court=court).first()
        if not shift:
            return Response(
                {"Invalid shift update": f"Could not find corresponding shift"},
                status=status.HTTP_404_NOT_FOUND,
            )

        shift.end = end
        shift.save()

        return Response(
            {"Success": f"Updated shift to end at {end}"},
            status=status.HTTP_200_OK,
        )


class BulkCreateUsers(APIView):
    permission_classes = [IsChairperson]

    def post(self, request):
        file = request.FILES["file"]
        reader = csv.DictReader(io.StringIO(file.read().decode("utf-8")))

        users = []
        for line in reader:
            first_name = line["first_name"]
            last_name = line["last_name"]

            user = User(
                username=f"{first_name.lower()}.{last_name.lower()}",
                first_name=first_name,
                last_name=last_name,
                email=line["email"],
                password=make_password("password"),
            )
            user.save()

            group = Group.objects.get(name=line["group"])
            user.groups.add(group)
            users.append(user)

            ballkid = Ballkid.objects.filter(
                is_active=True, first_name=first_name, last_name=last_name
            ).first()
            ballkid.user = user
            ballkid.save()

        return Response(
            {"Success": f"Bulk created users {users}"},
            status=status.HTTP_200_OK,
        )


class BulkCreateBallkids(APIView):
    permission_classes = [IsChairperson]

    def post(self, request):
        file = request.FILES["file"]
        reader = csv.DictReader(io.StringIO(file.read().decode("utf-8")))

        ballkids = [
            Ballkid(
                first_name=line["first_name"],
                last_name=line["last_name"],
                age=line["age"],
                num_years_experience=line["num_years_experience"],
                preferred_position=line["preferred_position"],
                is_captain=line["is_captain"] == "TRUE",
                is_chairperson=line["is_chairperson"] == "TRUE",
                image=line["image"] or DEFAULT_IMAGE_FILE,
            )
            for line in reader
        ]
        Ballkid.objects.bulk_create(ballkids)

        return Response(
            {"Success": f"Bulk created ballkids {ballkids}"},
            status=status.HTTP_200_OK,
        )


class BulkCreateRatings(APIView):
    permission_classes = [IsChairperson]

    def post(self, request):
        pass
