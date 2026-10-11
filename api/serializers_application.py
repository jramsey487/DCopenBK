"""
Serializers for the ballcrew application + tryout review workflow.
Add these classes into the repo's existing api/serializers.py (or import
this module from there) alongside the existing serializers.
"""

from rest_framework import serializers

from api.models.application import (
    ApplicationSettings,
    BallcrewApplication,
    FIRST_TIMER_AVAILABILITY_DAYS,
    TRYOUT_CAPACITY_PER_SLOT,
    TRYOUT_SLOT_CHOICES,
    TryoutReview,
    VETERAN_END_OF_TOURNAMENT_DAYS,
)
from api.models.schedule import Tournament

MINIMUM_AGE = 14


def get_tournament_start_date():
    """
    Current tournament's start date, sourced from the Tournament model
    rather than hardcoded -- so the age check and day labels stay correct
    year to year without a code change. Falls back to None if no Tournament
    row exists yet (age validation is skipped in that case rather than
    guessing at a date).
    """
    tournament = Tournament.objects.order_by("-year").first()
    return tournament.start_date if tournament else None


def get_tryout_slot_info():
    """
    Returns a list of dicts, one per tryout slot ("first"/"second"), each
    with the slot's configured date (or None if not set yet), remaining
    capacity, and whether it's full. Capacity is counted against this
    season's first-timer applications only (submitted_at__year matches the
    current Tournament's year) -- applications persist across seasons
    (promoted ones are never purged), so counting all-time would wrongly
    treat a slot as permanently full once last year's 50 people filled it.

    Shared by the serializer (to reject a submission for an already-full
    slot) and ApplicationSettingsView (so the public form knows what to
    offer) -- one source of truth for both.
    """
    settings_obj = ApplicationSettings.get_solo()
    tournament = Tournament.objects.order_by("-year").first()
    year = tournament.year if tournament else None

    slots = []
    for value, label in TRYOUT_SLOT_CHOICES:
        date = (
            settings_obj.tryout_date_1
            if value == "first"
            else settings_obj.tryout_date_2
        )
        qs = BallcrewApplication.objects.filter(is_veteran=False, tryout_date=value)
        if year is not None:
            qs = qs.filter(submitted_at__year=year)
        count = qs.count()
        remaining = max(TRYOUT_CAPACITY_PER_SLOT - count, 0)
        slots.append(
            {
                "value": value,
                "label": label,
                "date": date.isoformat() if date else None,
                "remaining": remaining,
                "full": remaining <= 0,
            }
        )
    return slots


class BallcrewApplicationSubmitSerializer(serializers.ModelSerializer):
    """
    Used by the public, unauthenticated submit-application endpoint.
    Excludes the review-workflow fields entirely -- those are never
    applicant-settable.
    """

    class Meta:
        model = BallcrewApplication
        exclude = [
            "status",
            "reviewed_by",
            "reviewed_at",
            "promoted_ballkid",
            "submitted_at",
        ]

    def validate_date_of_birth(self, value):
        start_date = get_tournament_start_date()
        if start_date is None:
            return value  # no Tournament row configured yet -- can't check

        age_at_tournament = start_date.year - value.year
        had_birthday = (start_date.month, start_date.day) >= (
            value.month,
            value.day,
        )
        if not had_birthday:
            age_at_tournament -= 1
        if age_at_tournament < MINIMUM_AGE:
            raise serializers.ValidationError(
                f"Applicants must be {MINIMUM_AGE} years old by the start of "
                f"the tournament ({start_date:%B %-d, %Y})."
            )
        return value

    def validate(self, data):
        is_veteran = data.get("is_veteran")

        if is_veteran:
            required = [
                "years_experience",
                "position",
                "likelihood",
                "veteran_sunday_or_monday",
                "veteran_wed_thu_choice",
            ]
        else:
            required = ["has_tried_out_before", "tryout_date"]
            if not data.get("headshot"):
                raise serializers.ValidationError(
                    {"headshot": "A headshot is required for first-time applicants."}
                )

        missing = [f for f in required if data.get(f) in (None, "")]
        if missing:
            branch = "veteran" if is_veteran else "first-time"
            raise serializers.ValidationError(
                {f: f"Required for {branch} applicants." for f in missing}
            )

        # First-timers: re-check the chosen tryout slot still has room.
        # The public form hides a full slot from the dropdown, but this is
        # a second check server-side in case two people submit for the
        # last spot at nearly the same moment.
        if not is_veteran:
            chosen_slot = data.get("tryout_date")
            slot_info = next(
                (s for s in get_tryout_slot_info() if s["value"] == chosen_slot), None
            )
            if slot_info and slot_info["full"]:
                raise serializers.ValidationError(
                    {"tryout_date": "That tryout date just filled up -- please pick the other one."}
                )

        # availability_days means something different per branch -- make
        # sure whatever was submitted is actually a subset of the days that
        # branch was allowed to pick from.
        allowed_days = (
            VETERAN_END_OF_TOURNAMENT_DAYS
            if is_veteran
            else FIRST_TIMER_AVAILABILITY_DAYS
        )
        submitted_days = data.get("availability_days") or []
        invalid_days = [d for d in submitted_days if d not in allowed_days]
        if invalid_days:
            raise serializers.ValidationError(
                {"availability_days": f"Invalid day(s) for this branch: {invalid_days}"}
            )

        # Veteran's optional "willing to help run tryouts" checkboxes --
        # not required, not capacity-limited (unlike a rookie's actual
        # tryout slot), just constrained to the two real slot values.
        if is_veteran:
            help_slots = data.get("tryout_help_availability") or []
            valid_slots = [v for v, _ in TRYOUT_SLOT_CHOICES]
            invalid_help_slots = [s for s in help_slots if s not in valid_slots]
            if invalid_help_slots:
                raise serializers.ValidationError(
                    {"tryout_help_availability": f"Invalid value(s): {invalid_help_slots}"}
                )

        # Waiver: either the applicant's own signature (18+) or a parent's.
        if not data.get("waiver_signature_name"):
            raise serializers.ValidationError(
                {"waiver_signature_name": "A signature (or 'N/A' if a minor) is required."}
            )
        if data["waiver_signature_name"].strip().upper() == "N/A" and not data.get(
            "parent_signature_name"
        ):
            raise serializers.ValidationError(
                {"parent_signature_name": "Required when the applicant is a minor."}
            )

        return data


class TryoutReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = TryoutReview
        fields = "__all__"
        read_only_fields = ["reviewer", "submitted_at"]

    def get_reviewer_name(self, obj):
        return obj.reviewer.get_full_name() if obj.reviewer else None

    def create(self, validated_data):
        validated_data["reviewer"] = self.context["request"].user
        return super().create(validated_data)


class BallcrewApplicationReviewSerializer(serializers.ModelSerializer):
    """
    Used on the chairperson-facing review dashboard: read-only application
    data plus the aggregated tryout review scores.
    """

    tryout_reviews = TryoutReviewSerializer(many=True, read_only=True)
    average_overall_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = BallcrewApplication
        fields = "__all__"

    def get_average_overall_rating(self, obj):
        reviews = obj.tryout_reviews.all()
        if not reviews:
            return None
        return round(sum(r.overall_rating for r in reviews) / len(reviews), 2)

    def get_review_count(self, obj):
        return obj.tryout_reviews.count()


class ApplicationStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BallcrewApplication
        fields = ["status"]
