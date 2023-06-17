from datetime import timedelta, datetime
from django.db.models import Max
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from api.serializers import *
from rest_framework.permissions import IsAuthenticated
from api.permissions import *


class GetSchedule(generics.ListAPIView):
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        param = self.request.query_params.get("day")
        if param == "":
            day = datetime.now()
        else:
            day = datetime.strptime(param, SLASH_MONTH_DAY_YEAR_FORMAT_STR)
        start_hour = datetime(year=day.year, month=day.month, day=day.day, hour=8)
        end_hour = start_hour + timedelta(days=1)

        return Schedule.objects.filter(
            start__gte=start_hour, start__lt=end_hour
        ).order_by("id")


class CreateSchedule(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        start_hour = datetime.strptime(
            f"{request.data['day']} {request.data['start_hour']}",
            f"{SLASH_MONTH_DAY_YEAR_FORMAT_STR} {HOUR_COLON_MINUTE_FORMAT_STR}",
        )
        num_teams = request.data["num_teams"]
        num_hours = request.data["num_hours"]
        num_courts = request.data["num_courts"]
        courts = NUM_COURTS_TO_COURTS[num_courts]

        team_index = 0
        for hour_index in range(num_hours):
            hour = start_hour + timedelta(hours=hour_index)
            for court in courts:
                shift = Schedule(
                    start=hour,
                    team=(team_index % num_teams) + 1,
                    court=court,
                )
                shift.save()

                team_index += 1
            if team_index % num_teams == 0:
                courts = courts[-1:] + courts[:-1]

        return Response(
            {"Success": f"Created schedule starting at {start_hour}"},
            status=status.HTTP_200_OK,
        )


class AddHour(APIView):
    permission_classes = [IsChairperson]

    def post(self, request, format=None):
        day = datetime.strptime(request.data["day"], SLASH_MONTH_DAY_YEAR_FORMAT_STR)
        start_hour = datetime(year=day.year, month=day.month, day=day.day, hour=8)
        end_hour = start_hour + timedelta(days=1)
        shifts = Schedule.objects.filter(start__gte=start_hour, start__lt=end_hour)

        max_hour = shifts.aggregate(max=Max("start"))["max"]
        next_hour = max_hour + timedelta(hours=1)

        for court in COURT.choices:
            shift = Schedule(
                start=next_hour,
                court=court[0],
            )
            shift.save()

        return Response(
            {"Success": f"Added hour at {next_hour}"}, status=status.HTTP_200_OK
        )


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

            return Response(
                {"Success": f"Updated team to {team} at {start} on {court}"},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"Invalid schedule update": f"Error: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class GetNextShifts(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        # TODO: maybe change this to filter to unique teams
        threshold = datetime.now() - timedelta(hours=1)
        shifts = (
            Schedule.objects.exclude(team=0).filter(start__gt=threshold).order_by("start")
        )
        return Response(ScheduleSerializer(shifts, many=True).data)


class GetTournament(APIView):
    permission_classes = [IsChairpersonOrAuthenticatedReadOnly]

    def get(self, request, format=None):
        tournament = Tournament.objects.get(year=2023)
        return Response(TournamentSerializer(tournament).data, status=status.HTTP_200_OK)

    def patch(self, request, format=None):
        tournament = Tournament.objects.get(year=2023)

        if request.data["show_teams"] is not None:
            tournament.show_teams = request.data["show_teams"]
        if request.data["show_finals_teams"] is not None:
            tournament.show_finals_teams = request.data["show_finals_teams"]

        tournament.save()

        return Response(
            {"Success": f"Updated tournament"},
            status=status.HTTP_200_OK,
        )
