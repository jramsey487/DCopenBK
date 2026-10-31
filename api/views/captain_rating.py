"""
Place at: api/views/captain_rating.py (next to api/views/rating.py).

Serializers and the permission class live in this file so nothing else has to
change; move them into api/serializers.py / api/permissions.py if you prefer.
Imports are explicit (no star imports) so nothing can be shadowed.
"""
import logging

from django.db.models import Avg, Count, Q
from rest_framework import generics, serializers, status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.ballkid import Ballkid
from api.models.captain_rating import CaptainRating
from api.permissions import IsChairperson
from api.utils.captain_feedback_emails import (
    feedback_email_status,
    feedback_send_in_progress,
    send_feedback_emails_async,
)
from api.utils.consts import MAX_RATING, MIN_RATING
from api.utils.utils import get_current_year

logger = logging.getLogger("api.rating")

MIN_RATINGS_FOR_AVG = 3  # hide a captain's average until this many star ratings


def rateable_captains():
    """Active captains and chairpeople, identified by the Ballkid flags
    (the flags are what the app updates when captains are assigned)."""
    return Ballkid.objects.filter(is_active=True).filter(
        Q(is_captain=True) | Q(is_chairperson=True)
    )


def get_my_ballkid(request):
    """The logged-in user's active Ballkid (cached on the request).
    Ballkid.objects already excludes ticketing accounts."""
    if not hasattr(request, "_my_ballkid"):
        user = request.user
        request._my_ballkid = (
            Ballkid.objects.filter(user=user, is_active=True).order_by("id").first()
            if user and user.is_authenticated
            else None
        )
    return request._my_ballkid


# ---- permission ------------------------------------------------------------
class IsRegularBallcrew(BasePermission):
    """Active ballkid who is NOT a captain or chairperson. Checks both the
    Ballkid flags and the auth groups, since the two aren't kept in sync
    (Ballkid.update_field toggles is_captain without touching groups)."""

    def has_permission(self, request, view):
        me = get_my_ballkid(request)
        if me is None or me.is_captain or me.is_chairperson:
            return False
        return not request.user.groups.filter(
            name__in=["chairperson", "captain"]
        ).exists()


# ---- serializers -----------------------------------------------------------
class CaptainRatingWriteSerializer(serializers.Serializer):
    captain = serializers.PrimaryKeyRelatedField(queryset=rateable_captains())
    rating = serializers.FloatField(required=False, allow_null=True, default=None)
    comments = serializers.CharField(required=True, allow_blank=False)
    context = serializers.ChoiceField(
        choices=CaptainRating.Context.choices,
        required=False,
        allow_blank=True,
        default="",
    )
    share_name = serializers.BooleanField(default=False)

    def validate(self, attrs):
        rating = attrs.get("rating")
        comments = (attrs.get("comments") or "").strip()

        # Written feedback is the one required part of this feature.
        if not comments:
            raise serializers.ValidationError(
                {"comments": "Please provide some feedback."}
            )

        if rating is not None and not (MIN_RATING <= rating <= MAX_RATING):
            raise serializers.ValidationError(
                {"rating": f"Rating must be between {MIN_RATING} and {MAX_RATING}."}
            )

        attrs["comments"] = comments
        return attrs


class CaptainRatingChairSerializer(serializers.ModelSerializer):
    """What chairs see: no rater id, rater_name only if that rating opted in,
    and a date (not a timestamp) so timing can't help identify the rater."""

    captain_name = serializers.SerializerMethodField()
    rater_name = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()

    class Meta:
        model = CaptainRating
        fields = (
            "id",
            "captain",
            "captain_name",
            "rating",
            "comments",
            "context",
            "rater_name",
            "date",
        )

    def get_captain_name(self, obj):
        return obj.captain.get_name()

    def get_rater_name(self, obj):
        return obj.rater.get_name() if obj.share_name else None

    def get_date(self, obj):
        return obj.created_at.date().isoformat()


class CaptainRatingMineSerializer(serializers.ModelSerializer):
    """A rater's view of their own submissions (so they can edit/retract)."""

    captain_name = serializers.SerializerMethodField()

    class Meta:
        model = CaptainRating
        fields = (
            "id",
            "captain",
            "captain_name",
            "rating",
            "comments",
            "context",
            "share_name",
            "updated_at",
        )

    def get_captain_name(self, obj):
        return obj.captain.get_name()


# ---- views: regular ballcrew -----------------------------------------------
class CreateCaptainRating(APIView):
    """Create or update (upsert) my feedback for a captain/chairperson."""

    permission_classes = [IsRegularBallcrew]

    def post(self, request, format=None):
        serializer = CaptainRatingWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        # The rater always comes from the logged-in user, never the request body.
        obj, created = CaptainRating.objects.update_or_create(
            year=get_current_year(),
            rater=get_my_ballkid(request),
            captain=d["captain"],
            defaults={
                "rating": d.get("rating"),
                "comments": d["comments"],
                "context": d["context"],
                "share_name": d["share_name"],
            },
        )
        logger.info(f"[CreateCaptainRating] saved rating id={obj.id} created={created}")
        return Response(
            CaptainRatingMineSerializer(obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MyCaptainRatings(generics.ListAPIView):
    serializer_class = CaptainRatingMineSerializer
    permission_classes = [IsRegularBallcrew]

    def get_queryset(self):
        return CaptainRating.objects.filter(
            rater=get_my_ballkid(self.request), year=get_current_year()
        ).select_related("captain")


class DeleteMyCaptainRating(APIView):
    permission_classes = [IsRegularBallcrew]

    def delete(self, request, pk, format=None):
        deleted, _ = CaptainRating.objects.filter(
            pk=pk, rater=get_my_ballkid(request)
        ).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---- views: chairpeople ----------------------------------------------------
class CaptainRatingsList(generics.ListAPIView):
    """Every feedback entry for a year, anonymized unless the rater opted in."""

    serializer_class = CaptainRatingChairSerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        return (
            CaptainRating.objects.filter(year=self.kwargs.get("year"))
            .select_related("rater", "captain")
            .order_by("captain__last_name", "captain__first_name", "-created_at")
        )


class CaptainRatingsSummary(APIView):
    """Per-captain feedback count and star average.

    The average stays hidden until there are at least three actual star
    ratings. Written feedback without a star still counts as feedback.
    """

    permission_classes = [IsChairperson]

    def get(self, request, year, format=None):
        rows = (
            CaptainRating.objects.filter(year=year)
            .values("captain", "captain__first_name", "captain__last_name")
            .annotate(avg=Avg("rating"), feedback_count=Count("id"), star_count=Count("rating"))
            .order_by("captain__last_name", "captain__first_name")
        )
        return Response(
            [
                {
                    "captain": r["captain"],
                    "captain_name": f"{r['captain__first_name']} {r['captain__last_name']}",
                    "count": r["feedback_count"],
                    "star_count": r["star_count"],
                    "average": (
                        round(r["avg"], 2) if r["star_count"] >= MIN_RATINGS_FOR_AVG else None
                    ),
                }
                for r in rows
            ]
        )


class CaptainFeedbackEmails(APIView):
    """
    GET  -> who would be emailed (ready / already sent / held back / no email).
    POST -> email everyone who is ready, in the background. Safe to click more
            than once: anyone already emailed this year is skipped.
    """

    permission_classes = [IsChairperson]

    def get(self, request, year, format=None):
        return Response(feedback_email_status(year))

    def post(self, request, year, format=None):
        if feedback_send_in_progress():
            return Response(
                {"detail": "A send is already in progress. Give it a minute."},
                status=status.HTTP_409_CONFLICT,
            )

        ready = feedback_email_status(year)["ready"]
        if ready == 0:
            return Response({"queued": 0})

        send_feedback_emails_async(year)
        logger.info(f"[CaptainFeedbackEmails] queued {ready} email(s) for {year}")
        return Response({"queued": ready})
