from rest_framework import serializers
from api.models.ballkid import *
from api.models.schedule import *
from api.models.rating import *


class BallkidSerializer(serializers.ModelSerializer):
    # Checkin leaderboard fields
    checkin_duration = serializers.DurationField(required=False)
    checkin_days = serializers.IntegerField(required=False)
    avg_checkin_time = serializers.CharField(required=False)
    # Rating leaderboard fields
    num_ratings = serializers.IntegerField(required=False)
    raw_avg = serializers.FloatField(required=False)
    raw_stdev = serializers.FloatField(required=False)
    calibrated_avg = serializers.FloatField(required=False)
    calibrated_stdev = serializers.FloatField(required=False)
    scale = serializers.FloatField(required=False)
    offset = serializers.FloatField(required=False)
    # Court leaderboard fields
    court_duration = serializers.DurationField(required=False)
    stadium_duration = serializers.DurationField(required=False)
    harris_duration = serializers.DurationField(required=False)
    grandstand_duration = serializers.DurationField(required=False)
    four_duration = serializers.DurationField(required=False)
    five_duration = serializers.DurationField(required=False)
    # Other fields
    num_my_ratings = serializers.IntegerField(required=False)
    self_cut = serializers.BooleanField(required=False)
    rank = serializers.IntegerField(required=False)

    class Meta:
        model = Ballkid
        fields = "__all__"


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = "__all__"


class TournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = "__all__"


class CheckinAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckinAnalytics
        fields = "__all__"


class CourtAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourtAnalytics
        fields = "__all__"


class CaptainAnalyticsSerializer(serializers.ModelSerializer):
    captain = BallkidSerializer()

    class Meta:
        model = CaptainAnalytics
        fields = ("captain", "count", "duration")


class CheckinHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckinHistory
        fields = "__all__"


class TeamHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamHistory
        fields = "__all__"


class CaptainHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CaptainHistory
        fields = "__all__"


class FinalsHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FinalsHistory
        fields = "__all__"


class CutHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CutHistory
        fields = "__all__"


class RatingSerializer(serializers.ModelSerializer):
    ratee_name = serializers.CharField(max_length=60, required=False)
    rater_name = serializers.CharField(max_length=60, required=False)
    year = serializers.IntegerField(required=False)
    month = serializers.IntegerField(required=False)
    day = serializers.IntegerField(required=False)

    class Meta:
        model = Rating
        fields = "__all__"


class CalibrationParamsSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=60, required=False)

    class Meta:
        model = CalibrationParams
        fields = "__all__"


class BannerSerializer(serializers.ModelSerializer):
    ballkid_name = serializers.CharField(max_length=60, required=False)

    class Meta:
        model = Banner
        fields = "__all__"
