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

import re

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from api.models.application import (
    ApplicationInterest,
    ApplicationSettings,
    APPLICATION_STATUS_CHOICES,
    BallcrewApplication,
    BallkidAdditionalContact,
    derive_last_day,
    TryoutReview,
)
from api.models.ballkid import Ballkid
from api.permissions import IsChairperson, IsChairpersonOrCaptain
from api.serializers_application import (
    ApplicationStatusUpdateSerializer,
    BallcrewApplicationReviewSerializer,
    BallcrewApplicationSubmitSerializer,
    get_tournament_start_date,
    get_tryout_slot_info,
    MINIMUM_AGE,
    TryoutReviewSerializer,
)
from api.utils.application_email import (
    INTEREST_BATCH_LIMIT,
    interest_send_in_progress,
    pending_interest_entries,
    send_application_confirmation_async,
    send_interest_notifications_async,
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
        start_date = get_tournament_start_date()
        tryout_slots = get_tryout_slot_info()
        return Response(
            {
                "is_open": ApplicationSettings.get_solo().is_open,
                "send_confirmation_emails": ApplicationSettings.get_solo().send_confirmation_emails,
                # Lets the public form compute and display real calendar
                # dates (e.g. "Saturday, July 25") for each semantic day key
                # without hardcoding a year -- see api/models/application.py
                "tournament_start_date": start_date.isoformat() if start_date else None,
                "minimum_age": MINIMUM_AGE,
                "tryout_slots": tryout_slots,
                # First-timer applications auto-close once both tryout
                # slots are full -- there'd be nowhere left to send a
                # rookie for a tryout. Veterans are unaffected.
                "rookie_tryouts_available": any(not s["full"] for s in tryout_slots),
            }
        )

    def patch(self, request):
        settings_obj = ApplicationSettings.get_solo()
        update_fields = []
        for field in ("is_open", "send_confirmation_emails"):
            if field in request.data:
                value = request.data[field]
                if value is None:
                    raise ValidationError({field: "This field may not be null."})
                setattr(settings_obj, field, bool(value))
                update_fields.append(field)
        if not update_fields:
            raise ValidationError(
                {"detail": "Provide is_open and/or send_confirmation_emails."}
            )
        settings_obj.save(update_fields=update_fields)
        return Response(
            {
                "is_open": settings_obj.is_open,
                "send_confirmation_emails": settings_obj.send_confirmation_emails,
            }
        )


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

    def perform_create(self, serializer):
        application = serializer.save()
        # Email a copy of their answers once the row is safely committed.
        # Runs in a background thread and never affects the submission.
        transaction.on_commit(
            lambda: send_application_confirmation_async(application.pk)
        )


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
        last_day = self._resolve_last_day(application)

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
            ballkid.last_day = last_day
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
                is_active=True,
                last_day=last_day,
            )
            if preferred_position:
                ballkid_kwargs["preferred_position"] = preferred_position
            if image_url:
                ballkid_kwargs["image"] = image_url

            ballkid = Ballkid.objects.create(**ballkid_kwargs)

        # Persist the "Additional Email Contact" (a parent, spouse, etc.)
        # onto the Ballkid so it's copied on ballcrew-wide emails year
        # after year. A non-blank answer replaces whatever was there; a
        # blank one leaves an existing contact alone rather than silently
        # deleting it (a chairperson can clear it manually in Django admin).
        if application.additional_email:
            BallkidAdditionalContact.objects.update_or_create(
                ballkid=ballkid,
                defaults={"email": application.additional_email},
            )

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

    @staticmethod
    def _resolve_last_day(application):
        """
        Maps derive_last_day()'s semantic day key (or "END") onto whatever
        string Ballkid.last_day / LAST_DAY_OPTIONS actually use -- plain
        weekday names, with "End" for the tournament's final day.
        """
        day_key = derive_last_day(application)
        label_by_key = {
            "sat_1": "Saturday",
            "sun_1": "Sunday",
            "mon": "Monday",
            "tue": "Tuesday",
            "wed": "Wednesday",
            "thu": "Thursday",
            "fri": "Friday",
            "sat_2": "Saturday",
            "sun_2": "Sunday",
            "END": "End",
        }
        return label_by_key.get(day_key, "End")


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


# ---------------------------------------------------------------------------
# Interest list ("email me when applications open")
# ---------------------------------------------------------------------------


class ApplicationInterestThrottle(AnonRateThrottle):
    # Needs "application-interest" in DEFAULT_THROTTLE_RATES in settings.py.
    scope = "application-interest"


class ApplicationInterestSignupView(APIView):
    """
    Public: join the interest list from the /apply page while applications
    are closed. Always answers the same way for a valid email, whether or not
    it was already on the list, so the form can't be used to find out who is.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ApplicationInterestThrottle]

    def post(self, request):
        # Honeypot: real people never see or fill this hidden field.
        if request.data.get("website"):
            return Response({"detail": "ok"})

        email = (request.data.get("email") or "").strip().lower()
        try:
            if not email or len(email) > 254:
                raise DjangoValidationError("invalid")
            validate_email(email)
        except DjangoValidationError:
            raise ValidationError({"email": "Enter a valid email address."})

        first_name = (request.data.get("first_name") or "").strip()[:100]
        ApplicationInterest.objects.get_or_create(
            email=email, defaults={"first_name": first_name}
        )
        return Response({"detail": "ok"})


class ApplicationInterestSummaryView(APIView):
    """Chairperson: counts for the interest-list card on the review page."""

    permission_classes = [IsChairperson]

    def get(self, request):
        total = ApplicationInterest.objects.count()
        emailed = ApplicationInterest.objects.filter(
            last_notified_at__isnull=False
        ).count()
        not_emailed = total - emailed
        pending = len(pending_interest_entries())
        return Response(
            {
                "total": total,
                "emailed": emailed,
                "pending": pending,
                # not emailed yet, but already applied this season, so skipped
                "already_applied": not_emailed - pending,
                "batch_limit": INTEREST_BATCH_LIMIT,
                "sending": interest_send_in_progress(),
            }
        )


class ApplicationInterestImportView(APIView):
    """
    Chairperson: add many emails at once (e.g. pasted from the existing
    Google Sheet). Anything that looks like an email is added; names and other
    text around them are ignored. If `already_emailed` is true, the new
    people are marked as already notified so the button won't email them.
    """

    permission_classes = [IsChairperson]

    def post(self, request):
        raw = str(request.data.get("emails") or "")
        if len(raw) > 200_000:
            raise ValidationError({"emails": "That's too much text at once."})
        already_emailed = bool(request.data.get("already_emailed"))

        tokens = re.split(r"[\s,;]+", raw)
        seen, invalid = set(), []
        for token in tokens:
            token = token.strip("<>\"'()[]")
            if "@" not in token:
                continue  # names, headers, and other text around the emails
            email = token.lower()
            if email in seen:
                continue
            seen.add(email)
            try:
                validate_email(email)
            except DjangoValidationError:
                invalid.append(token)

        valid = [e for e in seen if e not in {t.lower() for t in invalid}]
        if len(valid) > 5000:
            raise ValidationError({"emails": "Please add 5,000 or fewer at a time."})

        existing = set(
            ApplicationInterest.objects.filter(email__in=valid).values_list(
                "email", flat=True
            )
        )
        now = timezone.now()
        new_entries = [
            ApplicationInterest(
                email=e, last_notified_at=now if already_emailed else None
            )
            for e in valid
            if e not in existing
        ]
        ApplicationInterest.objects.bulk_create(new_entries, ignore_conflicts=True)
        return Response(
            {
                "added": len(new_entries),
                "already_on_list": len(valid) - len(new_entries),
                "invalid": invalid[:20],
            }
        )


class ApplicationInterestNotifyView(APIView):
    """
    Chairperson: email the application link to everyone on the interest list
    who hasn't been emailed yet. Only allowed while applications are open
    (otherwise the link in the email wouldn't work). Sends in the background.
    """

    permission_classes = [IsChairperson]

    def post(self, request):
        if not ApplicationSettings.get_solo().is_open:
            raise ValidationError(
                {"detail": "Open applications first, so the link in the email works."}
            )
        if interest_send_in_progress():
            return Response(
                {"detail": "A send is already in progress. Give it a minute."},
                status=status.HTTP_409_CONFLICT,
            )

        pending = len(pending_interest_entries())
        if pending == 0:
            return Response({"queued": 0, "remaining_after": 0})

        send_interest_notifications_async()
        queued = min(pending, INTEREST_BATCH_LIMIT)
        return Response({"queued": queued, "remaining_after": pending - queued})
