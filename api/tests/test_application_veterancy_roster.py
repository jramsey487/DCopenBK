from django.contrib.auth.models import Group, User
from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate
from unittest.mock import patch
from django.core import mail

from api.models.ballkid import Ballkid, SeasonParticipation
from api.models.application import ApplicationLaunchDecision, ApplicationLaunchEmailLog, ApplicationSettings
from api.utils.utils import get_current_year
from api.views.application import (
    ApplicationLaunchDecisionView,
    ApplicationLaunchPreviewView,
    ApplicationLaunchSendView,
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
    @patch("api.utils.application_launch_email.get_tryout_slot_info", return_value=[])
    def test_launch_email_send_is_logged_and_not_sent_twice(self, _slots):
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
    @patch("api.utils.application_launch_email.get_tryout_slot_info", return_value=[])
    @patch("api.utils.application_launch_email.EmailMultiAlternatives.send", side_effect=[Exception("temporary SMTP failure"), 1])
    def test_failed_launch_email_can_be_retried(self, _send, _slots):
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
