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

from api.models.application import (
    ApplicationSettings,
    APPLICATION_STATUS_CHOICES,
    BallcrewApplication,
    TryoutReview,
)
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


class ApplicationSettingsView(APIView):
    """
    GET is public (the /apply page checks this before showing the form).
    PATCH is chairperson-only (the toggle on the review dashboard).
    """

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsChairperson()]

    def get(self, request):
        return Response({"is_open": ApplicationSettings.get_solo().is_open})

    def patch(self, request):
        is_open = request.data.get("is_open")
        if is_open is None:
            raise ValidationError({"is_open": "This field is required."})
        settings_obj = ApplicationSettings.get_solo()
        settings_obj.is_open = bool(is_open)
        settings_obj.save(update_fields=["is_open"])
        return Response({"is_open": settings_obj.is_open})


class SubmitApplicationView(generics.CreateAPIView):
    """Public endpoint. Replaces the Google Form entirely."""

    queryset = BallcrewApplication.objects.all()
    serializer_class = BallcrewApplicationSubmitSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ApplicationSubmitThrottle]

    def create(self, request, *args, **kwargs):
        if not ApplicationSettings.get_solo().is_open:
            return Response(
                {"detail": "Applications are currently closed."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)


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

        existing_ballkid_id = request.data.get("ballkid_id")

        if existing_ballkid_id:
            # Returning veteran, matched to their existing record by a
            # chairperson (never automatically -- see ApplyHeadshotUpdateView
            # for why). Update it rather than creating a duplicate.
            #
            # Contact/identity fields are refreshed from this year's
            # application, since those legitimately change year to year
            # (phone numbers, and -- deliberately handled by matching on
            # more than just name -- a legal name change after marriage).
            # num_years_experience is auto-incremented from the existing
            # record rather than trusted from the application's
            # self-reported number, since people misremember their own
            # tenure. is_captain is left untouched entirely -- captain
            # status is set through a separate process outside applications.
            try:
                ballkid = Ballkid.objects.get(pk=existing_ballkid_id)
            except Ballkid.DoesNotExist:
                return Response(
                    {"ballkid_id": "No ballkid found with that id."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            ballkid.first_name = application.first_name
            ballkid.last_name = application.last_name
            ballkid.date_of_birth = application.date_of_birth
            ballkid.phone = application.phone
            ballkid.emergency_name = application.emergency_contact_name
            ballkid.emergency_phone = application.emergency_contact_phone
            ballkid.num_years_experience = (ballkid.num_years_experience or 0) + 1
            if preferred_position:
                ballkid.preferred_position = preferred_position
            if image_url:
                ballkid.image = image_url
            ballkid.is_active = True
            ballkid.save()
        else:
            # First-time applicant, or a veteran with no existing record
            # found (e.g. an old record that's since been purged) -- create
            # fresh, same as before.
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


class PurgeUnpromotedApplicationsView(APIView):
    """
    GET returns a preview (count + breakdown by status) so the frontend can
    show exactly what a confirm dialog is about to delete. POST performs
    the deletion. Chairperson-only, both methods -- this is destructive.
    """

    permission_classes = [IsChairperson]

    def _candidates(self):
        return BallcrewApplication.objects.filter(promoted_ballkid__isnull=True)

    def get(self, request):
        candidates = self._candidates()
        by_status = {}
        for value, _ in APPLICATION_STATUS_CHOICES:
            by_status[value] = candidates.filter(status=value).count()
        return Response({"count": candidates.count(), "by_status": by_status})

    def post(self, request):
        candidates = self._candidates()
        count = candidates.count()
        # QuerySet.delete() still fires pre_delete per-instance, so the
        # headshot-cleanup signal in api/models/application.py runs for each.
        candidates.delete()
        return Response({"deleted_count": count})


class ApplyHeadshotUpdateView(APIView):
    """
    Applies a veteran applicant's updated headshot (application.headshot_
    update, already sitting in R2 from the moment they submitted) onto an
    EXISTING Ballkid's image field -- for a returning veteran whose
    application isn't going through the promote-a-new-Ballkid flow at all.

    Deliberately requires the chairperson to name which Ballkid this is
    (ballkid_id in the request body) rather than matching by name
    automatically -- same reasoning as shift groups: an automatic
    name-match here could silently overwrite the wrong person's photo, and
    that's worse than requiring one extra click to confirm.
    """

    permission_classes = [IsChairperson]

    def post(self, request, pk):
        try:
            application = BallcrewApplication.objects.get(pk=pk)
        except BallcrewApplication.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if not application.headshot_update:
            raise ValidationError(
                "This application has no updated headshot to apply."
            )

        ballkid_id = request.data.get("ballkid_id")
        if not ballkid_id:
            raise ValidationError({"ballkid_id": "Required."})

        try:
            ballkid = Ballkid.objects.get(pk=ballkid_id)
        except Ballkid.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # No file copy needed -- application.headshot_update is already in
        # R2 (or local disk in dev) via Django's storage API, so we just
        # point the Ballkid at the same URL, same as PromoteApplicationView
        # does for a brand-new promotion.
        ballkid.image = application.headshot_update.url
        ballkid.save(update_fields=["image"])

        return Response({"updated_ballkid_id": ballkid.id, "image": ballkid.image})
