from datetime import timedelta, datetime
from django.db.models import Max
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from api.serializers import *
from api.permissions import *
from api.consts import *

import logging

logger = logging.getLogger("api.schedule")


def get_days_shifts(param):
    if param == "":
        date = datetime.now()
    else:
        date = datetime.strptime(param, SLASH_MONTH_DAY_YEAR_FORMAT_STR)
    start_hour = datetime(year=date.year, month=date.month, day=date.day, hour=8)
    end_hour = start_hour + timedelta(days=1)

    logger.info(
        f"{datetime.now()} [get_days_shifts] input {param}; start range {start_hour} and end {end_hour}"
    )

    return Schedule.objects.filter(start__gte=start_hour, start__lt=end_hour)


class GetSchedule(generics.ListAPIView):
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        param = self.request.query_params.get("date")
        return get_days_shifts(param).order_by("id")


class CreateSchedule(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        start_hour = datetime.strptime(
            f"{request.data['date']} {request.data['start_hour']}",
            f"{SLASH_MONTH_DAY_YEAR_FORMAT_STR} {HOUR_COLON_MINUTE_FORMAT_STR}",
        )
        num_teams = request.data["num_teams"]
        num_hours = request.data["num_hours"]
        num_courts = request.data["num_courts"]
        courts = NUM_COURTS_TO_COURTS[num_courts]

        logger.info(
            f"{datetime.now()} [CreateSchedule] num_teams {num_teams}, num_hours {num_hours}, num_courts {num_courts} with courts {courts}"
        )

        team_index = 0
        for hour_index in range(num_hours):
            hour = start_hour + timedelta(hours=hour_index)
            for court in courts:
                shift = Schedule(
                    start=hour,
                    team=(team_index % num_teams) + 1,
                    court=court,
                )
                logger.info(f"{datetime.now()} [CreateSchedule] creating shift {shift}")
                shift.save()

                team_index += 1
            if team_index % num_teams == 0:
                courts = courts[-1:] + courts[:-1]

        return Response(
            {"Success": f"Created schedule starting at {start_hour}"},
            status=status.HTTP_200_OK,
        )


class DeleteSchedule(APIView):
    permission_classes = [IsChairperson]

    def delete(self, request, format=None):
        param = self.request.query_params.get("date")

        shifts = get_days_shifts(param)
        logger.info(
            f"{datetime.now()} [DeleteSchedule] for param {param}, deleting {len(shifts)} shifts {shifts}"
        )
        shifts.delete()

        return Response(
            {"Success": f"Deleted schedule for {param}"},
            status=status.HTTP_200_OK,
        )


class AddHour(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        param = request.data["date"]
        shifts = get_days_shifts(param)
        courts = shifts.values_list("court", flat=True).distinct()

        max_hour = shifts.aggregate(max=Max("start"))["max"]
        next_hour = max_hour + timedelta(hours=1)

        logger.info(
            f"{datetime.now()} [AddHour] for date {param}, max_hour was {max_hour}"
        )

        for court in courts:
            shift, created = Schedule.objects.get_or_create(
                start=next_hour,
                court=court,
            )
            logger.info(f"{datetime.now()} [AddHour] Created {created} shift {shift}")

        return Response(
            {"Success": f"Added hour at {next_hour}"}, status=status.HTTP_200_OK
        )


class AddCourt(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        param = request.data["date"]
        shifts = get_days_shifts(param)
        starts = shifts.values_list("start", flat=True).distinct()

        logger.info(f"{datetime.now()} [AddCourt] for date {param} with starts {starts}")

        for start in starts:
            shift, created = Schedule.objects.get_or_create(
                start=start,
                court="",
            )
            logger.info(f"{datetime.now()} [AddCourt] Created {created} shift {shift}")

        return Response({"Success": f"Added court"}, status=status.HTTP_200_OK)


class UpdateSchedule(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        try:
            hour = request.data["hour"]
            start = datetime.strptime(f"{hour}", T_YEAR_MONTH_DAY_FORMAT_STR)

            court = request.data["court"]
            team = 0 if request.data["team"] == "" else int(request.data["team"])

            shift = Schedule.objects.get(start=start, court=court)
            shift.team = team
            shift.save()

            logger.info(
                f"{datetime.now()} [UpdateSchedule] updated shift with start {start} and court {court} to team {team}"
            )

            return Response(
                {"Success": f"Updated team to {team} at {start} on {court}"},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.warn(
                f"{datetime.now()} [UpdateSchedule] start {start}, court {court}, team {team}; error: {e} "
            )

            return Response(
                {"Invalid schedule update": f"Error: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class UpdateCourtName(APIView):
    permission_classes = [IsChairperson]

    def patch(self, request, format=None):
        old_name = request.data["oldName"]
        new_name = request.data["newName"]

        shifts = get_days_shifts(request.data["date"])
        court_shifts = shifts.filter(court=old_name)

        for shift in court_shifts:
            if new_name == "":
                logger.info(
                    f"{datetime.now()} [UpdateCourtName] deleting {shift} due to empty new name"
                )
                shift.delete()

            else:
                logger.info(
                    f"{datetime.now()} [UpdateCourtName] updating shift {shift} to new court name {new_name}"
                )

                shift.court = new_name
                shift.save()

        return Response(
            {
                "Success": f"Updated court name {old_name} to {new_name} for {len(court_shifts)} shifts"
            },
            status=status.HTTP_200_OK,
        )


class GetNextShifts(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        """
        Returns all current and future shifts for which a team is assigned.
        E.g. if it is currently 10:30am, then all shifts starting at or after
        10am are returned
        """
        # TODO: maybe change this to filter to unique teams
        threshold = datetime.now() - timedelta(hours=1)
        shifts = (
            Schedule.objects.exclude(team=0).filter(start__gt=threshold).order_by("start")
        )
        logger.info(f"{datetime.now()} [GetNextShifts] next shifts {shifts}")

        return Response(ScheduleSerializer(shifts, many=True).data)


class GetTournament(APIView):
    permission_classes = [IsChairpersonOrAuthenticatedReadOnly]

    def get(self, request, format=None):
        tournament = Tournament.objects.get(year=2023)
        logger.info(f"{datetime.now()} [GetTournament] tournament {tournament}")
        return Response(TournamentSerializer(tournament).data, status=status.HTTP_200_OK)

    def patch(self, request, format=None):
        tournament = Tournament.objects.get(year=2023)

        if "show_teams" in request.data:
            tournament.show_teams = request.data["show_teams"]
        if "show_finals_teams" in request.data:
            tournament.show_finals_teams = request.data["show_finals_teams"]
        if "banner" in request.data:
            tournament.banner = request.data["banner"]

        tournament.save()

        logger.info(
            f"{datetime.now()} [GetTournament PATCH] tournament {tournament} updated with request {request.data}"
        )

        return Response(
            {"Success": f"Updated tournament"},
            status=status.HTTP_200_OK,
        )
