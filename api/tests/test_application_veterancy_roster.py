from django.contrib.auth.models import Group, User
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.db import connection
from rest_framework.test import APIRequestFactory, force_authenticate
from unittest.mock import patch
from django.core import mail
from django.utils import timezone
from datetime import date, timedelta
import smtplib

from api.models.ballkid import Ballkid, SeasonParticipation
from api.models.schedule import Tournament
from api.models.application import ApplicationLaunchDecision, ApplicationLaunchEmailLog, ApplicationSettings
from api.utils.utils import get_current_year
from api.serializers_application import (
    BallcrewApplicationEditSerializer,
    BallcrewApplicationSubmitSerializer,
)
from api.views.application import (
    ApplicationLaunchDecisionView,
    ApplicationLaunchPreviewView,
    ApplicationLaunchSendView,
    ApplicationLaunchTournamentView,
    ApplicationVeterancyRosterView,
)


class TestApplicationVeterancyRosterView(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username="launch-chair", email="chair@example.com", password="test"
        )
        chairperson_group, _ = Group.objects.get_or_create(name="chairperson")
        self.user.groups.add(chairperson_group)

        # Legacy state: dates belong to 2027, but the record was saved
        # under the year the settings were entered (2026).
        Tournament.objects.create(
            year=2026,
            start_date=date(2027, 7, 24),
            end_date=date(2027, 8, 1),
        )

        self.ballkid = Ballkid.objects.create(
            first_name="Taylor",
            last_name="Volunteer",
            user=self.user,
            veterancy_baseline_years=5,
            veterancy_baseline_through_year=2026,
        )
        SeasonParticipation.objects.create(
            ballkid=self.ballkid,
            year=2025,
            source=SeasonParticipation.SOURCE_IMPORTED,
        )
        SeasonParticipation.objects.create(
            ballkid=self.ballkid,
            year=2026,
            source=SeasonParticipation.SOURCE_CHECKIN,
        )
        SeasonParticipation.objects.create(
            ballkid=self.ballkid,
            year=2027,
            source=SeasonParticipation.SOURCE_CHECKIN,
        )

    def test_applicant_api_no_longer_exposes_years_experience(self):
        self.assertNotIn("years_experience", BallcrewApplicationSubmitSerializer().fields)
        self.assertNotIn("years_experience", BallcrewApplicationEditSerializer().fields)

    def test_returns_checkin_roster_and_veterancy_as_of_requested_year(self):
        request = self.factory.get(
            "/api/applications/veterancy-roster", {"year": 2026}
        )
        force_authenticate(request, user=self.user)

        response = ApplicationVeterancyRosterView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["year"], 2026)
        self.assertEqual(response.data["count"], 1)
        person = response.data["results"][0]
        self.assertEqual(person["ballkid_id"], self.ballkid.id)
        self.assertEqual(person["historical_veterancy_years"], 5)
        self.assertEqual(person["verified_veterancy_years"], 0)
        self.assertEqual(person["veterancy_years"], 5)

    def test_requires_chairperson_or_superuser(self):
        regular_user = User.objects.create_user(
            username="regular-volunteer", password="test"
        )
        request = self.factory.get(
            "/api/applications/veterancy-roster", {"year": 2026}
        )
        force_authenticate(request, user=regular_user)

        response = ApplicationVeterancyRosterView.as_view()(request)

        self.assertEqual(response.status_code, 403)

    def test_chairperson_can_save_invite_back_decision(self):
        request = self.factory.patch(
            "/api/applications/veterancy-roster/decision",
            {"year": 2027, "decision": "invite_back"},
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = ApplicationLaunchDecisionView.as_view()(
            request, ballkid_id=self.ballkid.id
        )

        self.assertEqual(response.status_code, 200)
        decision = ApplicationLaunchDecision.objects.get(
            ballkid=self.ballkid, year=2027
        )
        self.assertEqual(decision.source_year, 2026)
        self.assertEqual(decision.decision, "invite_back")
        self.assertEqual(decision.updated_by, self.user)

    def test_roster_veterancy_uses_constant_participation_query_count(self):
        current_year = get_current_year()
        for index in range(8):
            kid = Ballkid.objects.create(
                first_name=f"Roster{index}",
                last_name="Query",
                veterancy_baseline_years=1,
                veterancy_baseline_through_year=2026,
            )
            SeasonParticipation.objects.create(
                ballkid=kid,
                year=current_year,
                source=SeasonParticipation.SOURCE_CHECKIN,
            )

        expected_count = 8 + int(
            SeasonParticipation.objects.filter(
                ballkid=self.ballkid, year=current_year
            ).exists()
        )
        request = self.factory.get(
            "/api/applications/veterancy-roster", {"year": current_year}
        )
        force_authenticate(request, user=self.user)

        with CaptureQueriesContext(connection) as captured:
            response = ApplicationVeterancyRosterView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        participation_queries = [
            query
            for query in captured.captured_queries
            if "api_seasonparticipation" in query["sql"].lower()
        ]
        # One query loads the selected-season roster and one prefetches
        # earned seasons for all roster members; no per-person queries.
        self.assertEqual(len(participation_queries), 3)
        self.assertEqual(response.data["count"], expected_count)

    def test_default_roster_year_is_latest_year_with_checkins(self):
        current_year = get_current_year()
        expected_year = (
            current_year
            if SeasonParticipation.objects.filter(year=current_year).exists()
            else current_year - 1
        )
        request = self.factory.get("/api/applications/veterancy-roster")
        force_authenticate(request, user=self.user)

        response = ApplicationVeterancyRosterView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["year"], expected_year)

    def test_launch_tournament_endpoint_reads_admin_configured_dates(self):
        request = self.factory.get(
            "/api/applications/launch-tournament", {"year": 2027}
        )
        force_authenticate(request, user=self.user)
        response = ApplicationLaunchTournamentView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["configured"])
        self.assertEqual(response.data["start_date"], "2027-07-24")
        self.assertEqual(response.data["end_date"], "2027-08-01")

    def test_target_tournament_dates_are_in_launch_email_preview(self):
        ApplicationLaunchDecision.objects.create(
            ballkid=self.ballkid,
            year=2027,
            source_year=2026,
            decision="invite_back",
            updated_by=self.user,
        )
        request = self.factory.get(
            "/api/applications/launch-preview", {"source_year": 2026}
        )
        force_authenticate(request, user=self.user)
        response = ApplicationLaunchPreviewView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["tournament_configured"])
        self.assertEqual(response.data["tournament_dates"], "July 24, 2027 – August 1, 2027")
        self.assertIn("Tournament dates: July 24, 2027 – August 1, 2027", response.data["results"][0]["text"])

    def test_forced_tryout_email_is_direct_and_omits_tryout_schedule(self):
        from api.utils.application_launch_email import _content

        subject, text, html = _content(
            "Taylor",
            ApplicationLaunchDecision.DECISION_MUST_TRY_OUT,
            2027,
            "July 24, 2027 – August 1, 2027",
        )

        self.assertIn("Required tryout", subject)
        self.assertIn("previous on-court performance did not meet the standard", text)
        self.assertIn("must attend a tryout", text)
        self.assertIn("does not guarantee selection", text)
        self.assertNotIn("Tryout information:", text)
        self.assertNotIn("Tryout information:", html)

    def test_preview_lists_decision_for_next_application_year(self):
        ApplicationLaunchDecision.objects.create(
            ballkid=self.ballkid,
            year=2027,
            source_year=2026,
            decision="invite_back",
            updated_by=self.user,
        )
        request = self.factory.get(
            "/api/applications/launch-preview", {"source_year": 2026}
        )
        force_authenticate(request, user=self.user)

        response = ApplicationLaunchPreviewView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["year"], 2027)
        self.assertEqual(response.data["sendable"], 1)
        self.assertEqual(response.data["results"][0]["decision"], "invite_back")
        self.assertIn("invited back", response.data["results"][0]["subject"].lower())

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
        def test_launch_email_send_is_logged_and_not_sent_twice(self):
        settings_obj = ApplicationSettings.get_solo()
        settings_obj.is_open = True
        settings_obj.save(update_fields=["is_open"])
        ApplicationLaunchDecision.objects.create(
            ballkid=self.ballkid,
            year=2027,
            source_year=2026,
            decision="invite_back",
            updated_by=self.user,
        )

        from api.utils.application_launch_email import send_launch_notifications

        first = send_launch_notifications(2026)
        second = send_launch_notifications(2026)

        self.assertEqual(first["sent"], 1)
        self.assertEqual(second["skipped"], 1)
        self.assertEqual(len(mail.outbox), 1)
        log = ApplicationLaunchEmailLog.objects.get(
            ballkid=self.ballkid, year=2027, kind="returning_invitation"
        )
        self.assertEqual(log.status, ApplicationLaunchEmailLog.STATUS_SENT)
        self.assertEqual(log.attempts, 1)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
        @patch("api.utils.application_launch_email.EmailMultiAlternatives.send", side_effect=[Exception("temporary SMTP failure"), 1])
    def test_failed_launch_email_can_be_retried(self, _send):
        ApplicationLaunchDecision.objects.create(
            ballkid=self.ballkid,
            year=2027,
            source_year=2026,
            decision="invite_back",
            updated_by=self.user,
        )

        from api.utils.application_launch_email import send_launch_notifications

        first = send_launch_notifications(2026)
        log = ApplicationLaunchEmailLog.objects.get(
            ballkid=self.ballkid, year=2027, kind="returning_invitation"
        )
        self.assertEqual(first["failed"], 1)
        self.assertEqual(log.status, ApplicationLaunchEmailLog.STATUS_FAILED)

        second = send_launch_notifications(2026)
        log.refresh_from_db()
        self.assertEqual(second["sent"], 1)
        self.assertEqual(log.status, ApplicationLaunchEmailLog.STATUS_SENT)
        self.assertEqual(log.attempts, 2)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
        @patch(
        "api.utils.application_launch_email.EmailMultiAlternatives.send",
        side_effect=smtplib.SMTPResponseException(452, b"4.7.28 rate limit"),
    )
    def test_provider_throttle_stops_batch_and_leaves_remaining_recipients_unsent(
        self, _send
    ):
        settings_obj = ApplicationSettings.get_solo()
        settings_obj.is_open = True
        settings_obj.save(update_fields=["is_open"])

        second_user = User.objects.create_user(
            username="second-launch-volunteer",
            email="second@example.com",
            password="test",
        )
        second_kid = Ballkid.objects.create(
            first_name="Second", last_name="Volunteer", user=second_user
        )
        SeasonParticipation.objects.create(
            ballkid=second_kid,
            year=2026,
            source=SeasonParticipation.SOURCE_CHECKIN,
        )
        for kid in (self.ballkid, second_kid):
            ApplicationLaunchDecision.objects.create(
                ballkid=kid,
                year=2027,
                source_year=2026,
                decision="invite_back",
                updated_by=self.user,
            )

        from api.utils.application_launch_email import send_launch_notifications

        result = send_launch_notifications(2026)

        self.assertEqual(result["sent"], 0)
        self.assertEqual(result["failed"], 1)
        self.assertEqual(
            ApplicationLaunchEmailLog.objects.filter(
                ballkid=self.ballkid, year=2027, status=ApplicationLaunchEmailLog.STATUS_FAILED
            ).count(),
            1,
        )
        self.assertFalse(
            ApplicationLaunchEmailLog.objects.filter(
                ballkid=second_kid, year=2027
            ).exists()
        )
        _send.assert_called_once()

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
        def test_stale_sending_email_is_visible_and_can_be_retried(self):
        settings_obj = ApplicationSettings.get_solo()
        settings_obj.is_open = True
        settings_obj.save(update_fields=["is_open"])
        ApplicationLaunchDecision.objects.create(
            ballkid=self.ballkid,
            year=2027,
            source_year=2026,
            decision="invite_back",
            updated_by=self.user,
        )
        log = ApplicationLaunchEmailLog.objects.create(
            ballkid=self.ballkid,
            year=2027,
            source_year=2026,
            kind="returning_invitation",
            recipient_email=self.user.email,
            subject="Previous launch email",
            status=ApplicationLaunchEmailLog.STATUS_SENDING,
            attempts=1,
        )
        ApplicationLaunchEmailLog.objects.filter(pk=log.pk).update(
            updated_at=timezone.now() - timedelta(hours=1)
        )

        from api.utils.application_launch_email import (
            build_launch_preview,
            send_launch_notifications,
        )

        preview = build_launch_preview(2026)
        self.assertEqual(preview["results"][0]["status"], "failed")
        self.assertEqual(preview["sendable"], 1)
        self.assertIn("may send a duplicate", preview["results"][0]["last_error"])

        result = send_launch_notifications(2026)
        log.refresh_from_db()
        self.assertEqual(result["sent"], 1)
        self.assertEqual(log.status, ApplicationLaunchEmailLog.STATUS_SENT)
        self.assertEqual(log.attempts, 2)
        self.assertEqual(len(mail.outbox), 1)

    @patch("api.views.application.send_launch_notifications_async")
    def test_launch_send_requires_target_tournament_dates(self, send_async):
        # Remove both a correctly keyed target and any legacy record whose
        # start date belongs to 2027 but whose Tournament.year is stale.
        Tournament.objects.filter(year=2027).delete()
        Tournament.objects.filter(start_date__year=2027).delete()
        ApplicationLaunchDecision.objects.create(
            ballkid=self.ballkid,
            year=2027,
            source_year=2026,
            decision="invite_back",
            updated_by=self.user,
        )
        settings_obj = ApplicationSettings.get_solo()
        settings_obj.is_open = True
        settings_obj.save(update_fields=["is_open"])
        request = self.factory.post(
            "/api/applications/launch-send",
            {"source_year": 2026},
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = ApplicationLaunchSendView.as_view()(request)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Configure start and end dates", response.data["detail"])
        send_async.assert_not_called()

    @patch("api.views.application.send_launch_notifications_async")
    def test_launch_send_requires_open_applications_and_resolved_decisions(self, send_async):
        ApplicationLaunchDecision.objects.create(
            ballkid=self.ballkid,
            year=2027,
            source_year=2026,
            decision="invite_back",
            updated_by=self.user,
        )
        settings_obj = ApplicationSettings.get_solo()
        settings_obj.is_open = False
        settings_obj.save(update_fields=["is_open"])

        closed_request = self.factory.post(
            "/api/applications/launch-send",
            {"source_year": 2026},
            format="json",
        )
        force_authenticate(closed_request, user=self.user)
        closed_response = ApplicationLaunchSendView.as_view()(closed_request)
        self.assertEqual(closed_response.status_code, 400)
        send_async.assert_not_called()

        settings_obj.is_open = True
        settings_obj.save(update_fields=["is_open"])
        open_request = self.factory.post(
            "/api/applications/launch-send",
            {"source_year": 2026},
            format="json",
        )
        force_authenticate(open_request, user=self.user)
        open_response = ApplicationLaunchSendView.as_view()(open_request)

        self.assertEqual(open_response.status_code, 202)
        send_async.assert_called_once_with(2026)
