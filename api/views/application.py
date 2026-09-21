"""
Views for the ballcrew application + tryout review workflow.

Wire these into api/urls.py:

    path("submit-application", SubmitApplicationView.as_view()),
    path("applications", ApplicationListView.as_view()),
    path("applications/<int:pk>", ApplicationDetailView.as_view()),
    path("applications/<int:pk>/status", UpdateApplicationStatusView.as_view()),
    path("promote-application/<int:pk>", PromoteApplicationView.as_view()),
    path("tryout-reviews", TryoutReviewCreateView.as_view()),
    path("tryout-reviews/application/<int:application_id>", TryoutReviewListView.as_view()),
"""

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from api.models.application import BallcrewApplication, TryoutReview
from api.models.ballkid import Ballkid
from api.permissions import IsChairperson, IsChairpersonOrCaptain
from api.serializers_application import (
    ApplicationStatusUpdateSerializer,
    BallcrewApplicationReviewSerializer,
    BallcrewApplicationSubmitSerializer,
    TryoutReviewSerializer,
)


class ApplicationSubmitThrottle(AnonRateThrottle):
    # DRF requires a matching entry in settings.py:
    #   REST_FRAMEWORK = {
    #       "DEFAULT_THROTTLE_RATES": {"application-submit": "5/hour"},
    #   }
    scope = "application-submit"


class SubmitApplicationView(generics.CreateAPIView):
    """Public endpoint. Replaces the Google Form entirely."""

    queryset = BallcrewApplication.objects.all()
    serializer_class = BallcrewApplicationSubmitSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ApplicationSubmitThrottle]


class ApplicationListView(generics.ListAPIView):
    """
    Chairperson-only. Supports ?status=pending style filtering for the
    review dashboard.
    """

    serializer_class = BallcrewApplicationReviewSerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        qs = BallcrewApplication.objects.all().prefetch_related("tryout_reviews")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class ApplicationDetailView(generics.RetrieveAPIView):
    queryset = BallcrewApplication.objects.all().prefetch_related("tryout_reviews")
    serializer_class = BallcrewApplicationReviewSerializer
    permission_classes = [IsChairperson]


class UpdateApplicationStatusView(generics.UpdateAPIView):
    """PATCH {"status": "accepted" | "rejected" | "waitlisted"}"""

    queryset = BallcrewApplication.objects.all()
    serializer_class = ApplicationStatusUpdateSerializer
    permission_classes = [IsChairperson]

    def perform_update(self, serializer):
        serializer.save(reviewed_by=self.request.user, reviewed_at=timezone.now())


class PromoteApplicationView(APIView):
    """
    Creates a real Ballkid record from an accepted application. Application
    rows are never written directly into Ballkid -- this is the one path.
    """

    permission_classes = [IsChairperson]

    def post(self, request, pk):
        try:
            application = BallcrewApplication.objects.get(pk=pk)
        except BallcrewApplication.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if application.status != "accepted":
            raise ValidationError(
                "Application must be marked accepted before promotion."
            )
        if application.promoted_ballkid_id:
            raise ValidationError("Application has already been promoted.")

        # Derive preferred position: prefer the applicant's own stated
        # position (veterans), fall back to what tryout reviewers observed.
        preferred_position = application.position
        if not preferred_position:
            reviews = application.tryout_reviews.exclude(observed_position="")
            if reviews.exists():
                preferred_position = reviews.first().observed_position

        image_url = self._resolve_headshot_url(application)

        ballkid_kwargs = dict(
            first_name=application.first_name,
            last_name=application.last_name,
            date_of_birth=application.date_of_birth,
            phone=application.phone,
            emergency_name=application.emergency_contact_name,
            emergency_phone=application.emergency_contact_phone,
            num_years_experience=application.years_experience or 0,
            is_captain=bool(application.is_captain),
            is_active=True,
        )
        if preferred_position:
            ballkid_kwargs["preferred_position"] = preferred_position
        if image_url:
            ballkid_kwargs["image"] = image_url

        ballkid = Ballkid.objects.create(**ballkid_kwargs)

        application.promoted_ballkid = ballkid
        application.save(update_fields=["promoted_ballkid"])

        return Response(
            BallcrewApplicationReviewSerializer(application).data,
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _resolve_headshot_url(application):
        """
        Ballkid.image already works as a plain CharField holding either a
        legacy '/static/img/...' path or a full https:// URL -- both
        BallkidCard and ProfileAvatar on the frontend render either form
        correctly with no extra handling. So promotion doesn't need to
        copy or move the file at all: the applicant's headshot is already
        sitting in R2 (or local disk in dev) with a working public URL via
        Django's storage API, so we just hand that URL straight through.
        """
        source_field = application.headshot or application.headshot_update
        if not source_field:
            return None
        return source_field.url


class TryoutReviewCreateView(generics.CreateAPIView):
    """Chairpersons and captains can both submit tryout evaluations."""

    queryset = TryoutReview.objects.all()
    serializer_class = TryoutReviewSerializer
    permission_classes = [IsChairpersonOrCaptain]


class TryoutReviewListView(generics.ListAPIView):
    """All reviews submitted for one applicant -- chairperson-only, since
    this is used on the aggregated decision dashboard."""

    serializer_class = TryoutReviewSerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        return TryoutReview.objects.filter(
            application_id=self.kwargs["application_id"]
        )
