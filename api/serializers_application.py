"""
Serializers for the ballcrew application + tryout review workflow.
Add these classes into the repo's existing api/serializers.py (or import
this module from there) alongside the existing serializers.
"""

from datetime import date

from rest_framework import serializers

from api.models.application import BallcrewApplication, TryoutReview

# Tournament start date drives the "must be 14 by start" check.
# Move this to Tournament model / settings if it should vary by year.
TOURNAMENT_START_DATE = date(2026, 7, 25)
MINIMUM_AGE = 14


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
        age_at_tournament = TOURNAMENT_START_DATE.year - value.year
        had_birthday = (TOURNAMENT_START_DATE.month, TOURNAMENT_START_DATE.day) >= (
            value.month,
            value.day,
        )
        if not had_birthday:
            age_at_tournament -= 1
        if age_at_tournament < MINIMUM_AGE:
            raise serializers.ValidationError(
                f"Applicants must be {MINIMUM_AGE} years old by the start of "
                f"the tournament ({TOURNAMENT_START_DATE:%B %-d, %Y})."
            )
        return value

    def validate(self, data):
        is_veteran = data.get("is_veteran")

        if is_veteran:
            required = ["years_experience", "position", "is_captain", "likelihood"]
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
