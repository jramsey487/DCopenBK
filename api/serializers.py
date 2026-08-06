from rest_framework import serializers
from api.models.ballkid import *
from api.models.schedule import *
from api.models.rating import *
from api.utils.utils import calculate_ballkid_age


# Fields needed on list screens (check-in, rate-by-name, cut, teams, etc.).
# Omits private/profile-only data to shrink list payloads.
BALLKID_LIST_MODEL_FIELDS = (
    "id",
    "first_name",
    "last_name",
    "age",
    "image",
    "num_years_experience",
    "is_out_of_town",
    "is_captain",
    "is_chairperson",
    "preferred_position",
    "is_cut",
    "cut_status",
    "is_active",
    "is_checked_in",
    "current_team",
    "finals_team",
    "position",
    "finals_position",
    "num_tickets",
    "last_day",
    "checkout_comments",
)

# Heavy / profile-only columns deferred at the DB for list querysets.
BALLKID_LIST_DEFER_FIELDS = (
    "user",
    "date_of_birth",
    "phone",
    "emergency_name",
    "emergency_phone",
    "comments",
)


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
    distance_to_ideal = serializers.FloatField(required=False)
    # Court leaderboard fields
    court_duration = serializers.DurationField(required=False)
    stadium_duration = serializers.DurationField(required=False)
    harris_duration = serializers.DurationField(required=False)
    grandstand_duration = serializers.DurationField(required=False)
    four_duration = serializers.DurationField(required=False)
    five_duration = serializers.DurationField(required=False)
    # Other fields
    num_my_ratings = serializers.IntegerField(required=False)
    have_draft = serializers.BooleanField(required=False)
    self_cut = serializers.BooleanField(required=False)
    rank = serializers.IntegerField(required=False)

    class Meta:
        model = Ballkid
        fields = "__all__"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        date_of_birth = (
            instance.get("date_of_birth")
            if isinstance(instance, dict)
            else getattr(instance, "date_of_birth", None)
        )
        if date_of_birth:
            data["age"] = calculate_ballkid_age(date_of_birth)
        return data


class BallkidListSerializer(serializers.ModelSerializer):
    """Lean serializer for list endpoints — skips profile-only fields."""

    num_ratings = serializers.IntegerField(required=False)
    calibrated_avg = serializers.FloatField(required=False)
    num_my_ratings = serializers.IntegerField(required=False)
    have_draft = serializers.BooleanField(required=False)
    self_cut = serializers.BooleanField(required=False)
    rank = serializers.IntegerField(required=False)

    class Meta:
        model = Ballkid
        fields = BALLKID_LIST_MODEL_FIELDS + (
            "num_ratings",
            "calibrated_avg",
            "num_my_ratings",
            "have_draft",
            "self_cut",
            "rank",
        )


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
    first_name = serializers.CharField(max_length=60, required=False)
    last_name = serializers.CharField(max_length=60, required=False)

    class Meta:
        model = FinalsHistory
        fields = "__all__"


class FinalsAnalyticsSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=60, required=False)
    last_name = serializers.CharField(max_length=60, required=False)

    class Meta:
        model = FinalsAnalytics
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


class TicketSerializer(serializers.ModelSerializer):
    ballkid_name = serializers.CharField(max_length=60, required=False)
    num_tickets = serializers.IntegerField(default=0, required=False)

    class Meta:
        model = Ticket
        fields = "__all__"
