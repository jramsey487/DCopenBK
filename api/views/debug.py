from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User, Group
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from api.admin import *
from api.serializers import *
from api.utils import *
from api.consts import *
from api.permissions import *
from api.models.ballkid import *
from api.models.rating import *

from datetime import datetime, timedelta
import csv
import os
import io
import zipfile
import random
import string


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
        day = datetime.strptime(
            request.data["furthest_day"], SLASH_MONTH_DAY_YEAR_FORMAT_STR
        )
        furthest_date = day.date()
        furthest_day = datetime.strftime(day, WEEKDAY_FORMAT_STR)

        history, _ = CutHistory.objects.update_or_create(
            ballkid=ballkid,
            year=request.data["year"],
            defaults={
                "furthest_date": furthest_date,
                "furthest_day": furthest_day,
                "self_cut": request.data["self_cut"],
            },
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

            ballkid = Ballkid.objects.filter(
                is_active=True, first_name=first_name, last_name=last_name
            ).first()
            if ballkid:
                ballkid.user = user
                ballkid.save()

        return Response(
            {"Success": f"Bulk created users"},
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
            {"Success": f"Bulk created {len(ballkids)} ballkids"},
            status=status.HTTP_200_OK,
        )


class BulkCreateSignups(APIView):
    permission_classes = [IsChairperson]

    def post(self, request):
        preferred_position_map = {
            "Back": "Back",
            "Net": "Net",
            "Switch (Prefer Back)": "Back/Net",
            "Switch (Prefer Net)": "Net/Back",
        }
        ballkids = []

        file = request.FILES["file"]
        reader = csv.DictReader(io.StringIO(file.read().decode("utf-8")))

        for line in reader:
            first_name = line["First Name"].strip().capitalize()
            last_name = line["Last Name"].strip().capitalize()
            is_captain = line["Are you a captain?"].strip() == "Yes"
            is_chairperson = line["is_chairperson"].strip() == "TRUE"
            is_out_of_town_rookie = line["is_out_of_town_rookie"].strip() == "TRUE"
            dob = datetime.strptime(
                line[
                    "Date of Birth *You Must Be 14 years Old By Tournament Start (July 29th) To Apply*"
                ].strip(),
                SLASH_MONTH_DAY_YEAR_FORMAT_STR,
            )
            first_day = datetime.strptime("07/29/2023", SLASH_MONTH_DAY_YEAR_FORMAT_STR)
            age = (first_day - dob) // timedelta(days=365.2425)
            image = f"static/img/{first_name.lower()}_{last_name.lower()}.jpg"

            user = User(
                username=f"{first_name.lower()}.{last_name.lower()}",
                first_name=first_name,
                last_name=last_name,
                email=line["Email Address"].strip(),
                password=make_password(
                    "".join(random.sample(string.ascii_lowercase, 12))
                ),
            )
            user.save()

            group = Group.objects.get(
                name="chairperson"
                if is_chairperson
                else "captain"
                if is_captain
                else "ballkid"
            )
            user.groups.add(group)

            ballkids.append(
                Ballkid(
                    first_name=first_name,
                    last_name=last_name,
                    user=user,
                    age=age,
                    is_active=True,
                    is_captain=is_captain,
                    is_chairperson=is_chairperson,
                    is_out_of_town=is_out_of_town_rookie,
                    num_years_experience=line[
                        "How many years have you been a Ballperson at the Citi Open (not counting the upcoming year)?"
                    ].strip()
                    or 0,
                    preferred_position=preferred_position_map[
                        line["What position are you?"].strip() or "Back"
                    ],
                    image=image if os.path.isfile(image) else DEFAULT_IMAGE_FILE,
                )
            )

        Ballkid.objects.bulk_create(ballkids)

        for ballkid in Ballkid.objects.all():
            ballkid.validate()

        return Response(
            {"Success": f"Bulk created signups"},
            status=status.HTTP_200_OK,
        )


class BulkCreateRatings(APIView):
    permission_classes = [IsChairperson]

    def post(self, request):
        author_to_name = {
            "Emily": ("Emily", "Benton"),
            "MatthewK": ("Matthew", "Kolodner"),
            "Jeff": ("Jeff", "Zhang"),
            "Billy": ("Billy", "Owens"),
            "Jonathan": ("Jonathan", "Chen"),
            "Ben": ("Ben", "Parzow"),
            "Carolyn": ("Carolyn", "Quetsch"),
            "Ryan": ("Ryan", "Gates"),
            "Michael": ("Michael", "White"),
            "Joseph": ("Joseph", "Ramsey"),
            "Dan": ("Dan", "Yi"),
            "Joe": ("Joe", "Iosue"),
            "Sharon": ("Sharon", "Sabasteanski"),
            "EvanCo": ("Evan", "Costanza"),
            "Diana": ("Diana", "Lozanova"),
            "Zachary": ("Zachary", "Spahr"),
            "Benji": ("Benjy", "Apelbaum"),
            "MichaelS": ("Michael", "Shapiro"),
            "John": ("John", "Niswander"),
            "Stuart": ("Stuart", "Berlin"),
            "Debbie": ("Deborah", "Berlin"),
            "Matthew": ("Matthew", "Nicholson"),
        }

        ratings = []

        file = request.FILES["file"]
        reader = csv.DictReader(io.StringIO(file.read().decode("utf-8")))

        for line in reader:
            rater_name = (
                author_to_name[line["Author"]]
                if line["Author"] in author_to_name
                else ("", "")
            )
            ratee_name = line["Ballperson"]

            rater = Ballkid.objects.filter(
                first_name=rater_name[0], last_name=rater_name[1]
            ).first()
            ratee = Ballkid.objects.filter(
                first_name=ratee_name.split()[0], last_name=ratee_name.split()[1]
            ).first()

            if rater and ratee and line["Overall"]:
                date = datetime.strptime(
                    f'{line["Timestamp"]} 2022', "%A, %B %d, %I:%M %p %Y"
                )

                rating = Rating(
                    ratee=ratee,
                    rater=rater,
                    date=date,
                    rating=float(line["Overall"]) / 2.0,
                    rolling_rating=float(line["Rolling"]) / 2.0
                    if line["Rolling"]
                    else None,
                    athleticism_rating=float(line["Athleticism"]) / 2.0
                    if line["Athleticism"]
                    else None,
                    effort_rating=float(line["Effort"]) / 2.0 if line["Effort"] else None,
                    awareness_rating=float(line["Awareness"]) / 2.0
                    if line["Awareness"]
                    else None,
                    decision_rating=float(line["Decisionmaking"]) / 2.0
                    if line["Decisionmaking"]
                    else None,
                    comments=line["Note"],
                )
                ratings.append(rating)

        Rating.objects.bulk_create(ratings)

        return Response(
            {"Success": f"Bulk created {len(ratings)} ratings"},
            status=status.HTTP_200_OK,
        )


class DownloadData(APIView):
    permission_classes = [IsChairperson]

    def get(self, request, format=None):
        filename_to_data = {}
        today = datetime.strftime(datetime.now(), "%Y%m%d")
        zip_filename = f"{today}_data.zip"

        resource_list = [
            BallkidResource(),
            CalibrationParamsResource(),
            CaptainAnalyticsResource(),
            CaptainHistoryResource(),
            CheckinAnalyticsResource(),
            CheckinHistoryResource(),
            CourtAnalyticsResource(),
            CutHistoryResource(),
            FinalsHistoryResource(),
            RatingResource(),
            ScheduleResource(),
            TeamHistoryResource(),
            TournamentResource(),
        ]
        for resource in resource_list:
            csv_data = resource.export().csv
            filename = resource._meta.model.__name__ + today
            filename_to_data[filename] = csv_data

            # Code to return a single CSV file
            # response = Response(csv_data, content_type="text/csv")
            # response["Content-Disposition"] = 'attachment; filename="test.csv"'
            # return response

        with zipfile.ZipFile(zip_filename, "a", zipfile.ZIP_DEFLATED) as zf:
            for filename, data in filename_to_data.items():
                zf.writestr(f"{filename}.csv", data)

        response = HttpResponse(open(zip_filename, "rb"), content_type="application/zip")
        response["Content-Disposition"] = "attachment; filename=name.zip"
        return response
