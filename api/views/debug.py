from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User, Group
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from api.admin import *
from api.serializers import *
from api.utils.utils import *
from api.utils.consts import *
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

import logging

logger = logging.getLogger("api.utils")


class CreateCheckinHistory(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        ballkid = Ballkid.objects.get(id=request.data["ballkid_id"])

        checkin = datetime_str_to_datetime(request.data["checkin"])
        checkout = datetime_str_to_datetime(request.data["checkout"])

        if checkout:
            history = CheckinHistory.objects.create(
                ballkid=ballkid,
                start=checkin,
                end=checkout,
                duration=checkout - checkin,
            )
        else:
            history = CheckinHistory.objects.create(ballkid=ballkid, start=checkin)

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
            num_years_experience = (
                line[
                    "How many years have you been a Ballperson at the Mubadala Citi Open (not counting the upcoming year)?"
                ].strip()
                or 0
            )
            is_captain = line["Are you a captain?"].strip() == "Yes"
            is_chairperson = line["is_chairperson"].strip() == "TRUE"
            group = Group.objects.get(
                name=(
                    "chairperson"
                    if is_chairperson
                    else "captain" if is_captain else "ballkid"
                )
            )

            is_out_of_town = line["is_out_of_town"].strip() == "TRUE"
            phone = line["Phone Number (XXX-XXX-XXXX)"].strip()
            emergency_name = line["Emergency Contact Name"].strip()
            emergency_phone = line[
                "Emergency Contact Phone Number (XXX-XXX-XXXX)"
            ].strip()
            dob = datetime.strptime(
                line[
                    "Date of Birth *You Must Be 14 years Old By Tournament Start (July 27th) To Apply*"
                ].strip(),
                SLASH_MONTH_DAY_YEAR_FORMAT_STR,
            )
            first_day = datetime.strptime("07/27/2024", SLASH_MONTH_DAY_YEAR_FORMAT_STR)
            age = (first_day - dob) // timedelta(days=365.2425)
            image = f"static/img/{first_name.lower()}_{last_name.lower()}.jpg"
            image = image if os.path.isfile(image) else DEFAULT_IMAGE_FILE
            email = line["Email Address"].strip()

            # If user does not yet exist, then create one
            user_filtered = User.objects.filter(
                first_name=first_name, last_name=last_name
            )
            if len(user_filtered) == 0:
                user = User(
                    username=f"{first_name.lower()}.{last_name.lower()}",
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    password=make_password(
                        "".join(random.sample(string.ascii_lowercase, 12))
                    ),
                )
                user.save()
            else:
                user = user_filtered[0]
                user.email = email

            user.groups.set([group])
            user.save()

            # If ballkid already exist, then mark ballkid as active,
            # increment the number of years of experience, and continue
            filtered = Ballkid.objects.filter(
                first_name=first_name, last_name=last_name
            )
            if len(filtered) > 0:
                ballkid = filtered[0]
                ballkid.num_years_experience = num_years_experience
                ballkid.is_active = True
                ballkid.is_captain = is_captain
                ballkid.is_chairperson = is_chairperson
                ballkid.phone = phone
                ballkid.age = age
                ballkid.is_out_of_town = is_out_of_town
                ballkid.emergency_name = emergency_name
                ballkid.emergency_phone = emergency_phone
                ballkid.image = image
                ballkid.save()
                continue

            ballkids.append(
                Ballkid(
                    first_name=first_name,
                    last_name=last_name,
                    user=user,
                    age=age,
                    is_active=True,
                    is_captain=is_captain,
                    is_chairperson=is_chairperson,
                    is_out_of_town=is_out_of_town,
                    num_years_experience=num_years_experience,
                    preferred_position=preferred_position_map[
                        line["What position are you?"].strip() or "Back"
                    ],
                    image=image,
                    phone=phone,
                    emergency_name=emergency_name,
                    emergency_phone=emergency_phone,
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

    """Function for parsing and bulk creating 2022 reviews"""
    # def post(self, request):
    #     author_to_name = {
    #         "Emily": ("Emily", "Benton"),
    #         "MatthewK": ("Matthew", "Kolodner"),
    #         "Jeff": ("Jeff", "Zhang"),
    #         "Billy": ("Billy", "Owens"),
    #         "Jonathan": ("Jonathan", "Chen"),
    #         "Ben": ("Ben", "Parzow"),
    #         "Carolyn": ("Carolyn", "Quetsch"),
    #         "Ryan": ("Ryan", "Gates"),
    #         "Michael": ("Michael", "White"),
    #         "Joseph": ("Joseph", "Ramsey"),
    #         "Dan": ("Dan", "Yi"),
    #         "Joe": ("Joe", "Iosue"),
    #         "Sharon": ("Sharon", "Sabasteanski"),
    #         "EvanCo": ("Evan", "Costanza"),
    #         "Diana": ("Diana", "Lozanova"),
    #         "Zachary": ("Zachary", "Spahr"),
    #         "Benji": ("Benjy", "Apelbaum"),
    #         "MichaelS": ("Michael", "Shapiro"),
    #         "John": ("John", "Niswander"),
    #         "Stuart": ("Stuart", "Berlin"),
    #         "Debbie": ("Deborah", "Berlin"),
    #         "Matthew": ("Matthew", "Nicholson"),
    #     }

    #     ratings = []

    #     file = request.FILES["file"]
    #     reader = csv.DictReader(io.StringIO(file.read().decode("utf-8")))

    #     for line in reader:
    #         rater_name = (
    #             author_to_name[line["Author"]]
    #             if line["Author"] in author_to_name
    #             else ("", "")
    #         )
    #         ratee_name = line["Ballperson"]

    #         rater = Ballkid.objects.filter(
    #             first_name=rater_name[0], last_name=rater_name[1]
    #         ).first()
    #         ratee = Ballkid.objects.filter(
    #             first_name=ratee_name.split()[0], last_name=ratee_name.split()[1]
    #         ).first()

    #         if rater and ratee and line["Overall"]:
    #             date = datetime.strptime(
    #                 f'{line["Timestamp"]} 2022', "%A, %B %d, %I:%M %p %Y"
    #             )

    #             rating = Rating(
    #                 ratee=ratee,
    #                 rater=rater,
    #                 date=date,
    #                 rating=float(line["Overall"]) / 2.0,
    #                 rolling_rating=float(line["Rolling"]) / 2.0
    #                 if line["Rolling"]
    #                 else None,
    #                 athleticism_rating=float(line["Athleticism"]) / 2.0
    #                 if line["Athleticism"]
    #                 else None,
    #                 effort_rating=float(line["Effort"]) / 2.0 if line["Effort"] else None,
    #                 awareness_rating=float(line["Awareness"]) / 2.0
    #                 if line["Awareness"]
    #                 else None,
    #                 decision_rating=float(line["Decisionmaking"]) / 2.0
    #                 if line["Decisionmaking"]
    #                 else None,
    #                 comments=line["Note"],
    #             )
    #             ratings.append(rating)

    #     Rating.objects.bulk_create(ratings)

    #     return Response(
    #         {"Success": f"Bulk created {len(ratings)} ratings"},
    #         status=status.HTTP_200_OK,
    #     )

    """" Function for parsing and bulk creating 2023 reviews """

    def post(self, request):
        ratings = []

        file = request.FILES["file"]
        reader = csv.DictReader(io.StringIO(file.read().decode("utf-8")))

        for line in reader:
            rater_name = line["Rater"]
            ratee_name = line["Ballkid"]

            rater = Ballkid.objects.filter(
                first_name=rater_name.split()[0], last_name=rater_name.split()[1]
            ).first()
            ratee = Ballkid.objects.filter(
                first_name=ratee_name.split()[0], last_name=ratee_name.split()[1]
            ).first()

            if rater and ratee and line["Overall Rating"]:
                date = datetime.strptime(line["Date"], "%Y-%m-%d")

                rating = Rating(
                    ratee=ratee,
                    rater=rater,
                    date=date,
                    rating=float(line["Overall Rating"]),
                    rolling_rating=float(line["Rolling"]) if line["Rolling"] else None,
                    athleticism_rating=(
                        float(line["Athleticism"]) if line["Athleticism"] else None
                    ),
                    effort_rating=float(line["Effort"]) if line["Effort"] else None,
                    awareness_rating=(
                        float(line["Awareness"]) if line["Awareness"] else None
                    ),
                    decision_rating=(
                        float(line["Decision-making"])
                        if line["Decision-making"]
                        else None
                    ),
                    comments=line["Comments"],
                )
                ratings.append(rating)

        Rating.objects.bulk_create(ratings)

        return Response(
            {"Success": f"Bulk created {len(ratings)} ratings"},
            status=status.HTTP_200_OK,
        )


# class BulkCreateFinals(APIView):
#     permission_classes = [IsChairperson]

#     def post(self, request):
#         match_type_dict = {
#             "MS": MATCH_TYPE.MS,
#             "MD": MATCH_TYPE.MD,
#             "WS": MATCH_TYPE.WS,
#         }

#         finals = []

#         file = request.FILES["file"]
#         reader = csv.DictReader(io.StringIO(file.read().decode("utf-8")))

#         for line in reader:
#             first_name = line["First Name"].strip()
#             last_name = line["Last Name"].strip()
#             try:
#                 ballkid = Ballkid.objects.get(
#                     first_name=first_name, last_name=last_name
#                 )
#             except Exception:
#                 continue

#             for match_type in match_type_dict.keys():
#                 count = line[match_type]
#                 years = line[f"{match_type}_Years"]

#                 final = FinalsHistory(
#                     ballkid=ballkid,
#                     match_type=match_type_dict[match_type],
#                     count=count if count != "" else 0,
#                     years=(
#                         [int(year.strip()) for year in years.split(",")]
#                         if years != ""
#                         else []
#                     ),
#                 )
#                 finals.append(final)

#         FinalsHistory.objects.bulk_create(finals)

#         return Response(
#             {"Success": f"Bulk created {len(finals)} finals"},
#             status=status.HTTP_200_OK,
#         )


class BulkCreateFinals(APIView):
    permission_classes = [IsChairperson]

    def post(self, request):
        finals = []

        file = request.FILES["file"]
        reader = csv.DictReader(io.StringIO(file.read().decode("utf-8")))

        for line in reader:
            first_name = line["first_name"].strip()
            last_name = line["last_name"].strip()
            try:
                ballkid = Ballkid.objects.get(
                    first_name=first_name, last_name=last_name
                )
            except Exception:
                logger.warn(f"Exception when building finals for line {line}")
                continue

            final = FinalsHistory(
                ballkid=ballkid, year=int(line["year"]), match_type=line["match_type"]
            )
            finals.append(final)

        FinalsHistory.objects.bulk_create(finals)

        return Response(
            {"Success": f"Bulk created {len(finals)} finals"},
            status=status.HTTP_200_OK,
        )


class BulkCreateCuts(APIView):
    permission_classes = [IsChairperson]

    def post(self, request):
        day_to_date = {
            "Monday": datetime(2022, 8, 1),
            "Tuesday": datetime(2022, 8, 2),
            "Wednesday": datetime(2022, 8, 3),
            "Thursday": datetime(2022, 8, 4),
            "Friday": datetime(2022, 8, 5),
            "Saturday": datetime(2022, 8, 6),
        }

        cuts = []

        file = request.FILES["file"]
        reader = csv.DictReader(io.StringIO(file.read().decode("utf-8")))

        for line in reader:
            first_name = line["First Name"]
            last_name = line["Last Name"]
            try:
                ballkid = Ballkid.objects.get(
                    first_name=first_name, last_name=last_name
                )
            except Exception:
                continue

            day = line["Last Day"]
            if day == "":
                continue

            cut = CutHistory(
                ballkid=ballkid,
                year=2022,
                furthest_day=day,
                furthest_date=day_to_date[day],
            )
            cuts.append(cut)

        CutHistory.objects.bulk_create(cuts)

        return Response(
            {"Success": f"Bulk created {len(cuts)} cuts"},
            status=status.HTTP_200_OK,
        )


class BulkCreateCheckins(APIView):
    permission_classes = [IsChairperson]

    def post(self, request):
        file = request.FILES["file"]
        reader = csv.DictReader(io.StringIO(file.read().decode("utf-8")))

        histories = []

        for line in reader:
            first_name = line["first_name"]
            last_name = line["last_name"]
            try:
                ballkid = Ballkid.objects.get(
                    first_name=first_name, last_name=last_name
                )
            except Exception:
                continue

            start = datetime.strptime(line["start"], "%Y-%m-%d %H:%M:%S")
            end = (
                datetime.strptime(line["end"], "%Y-%m-%d %H:%M:%S")
                if line["end"] != ""
                else None
            )
            duration = end - start if end else "00:00:00"
            is_first_checkin = line["is_first_checkin"]

            history = CheckinHistory(
                ballkid=ballkid,
                start=start,
                end=end,
                duration=duration,
                is_first_checkin=is_first_checkin,
            )
            histories.append(history)

        CheckinHistory.objects.bulk_create(histories)

        return Response(
            {"Success": f"Bulk created {len(histories)} check-in histories"},
            status=status.HTTP_200_OK,
        )


class BulkCheckin(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        num = int(request.data["num"])

        ballkids = Ballkid.objects.filter(is_active=True).order_by("?")[:num]
        for ballkid in ballkids:
            ballkid.set_field("is_checked_in", True)
            ballkid.validate()
            ballkid.save()

        return Response(
            {"Success": f"Bulk checked in {len(ballkids)} ballkids"},
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

        response = HttpResponse(
            open(zip_filename, "rb"), content_type="application/zip"
        )
        response["Content-Disposition"] = "attachment; filename=name.zip"
        return response
