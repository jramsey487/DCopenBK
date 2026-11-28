from datetime import timedelta
from unittest.mock import patch

from django.conf import settings
from django.test import TestCase
from django.utils import timezone

from api.models.schedule import Tournament
from api.utils.operational_alerts import alert_delivery_outbox_health


class OperationalDeliveryAlertTests(TestCase):
    def setUp(self):
        self.tournament = Tournament.objects.create(
            year=timezone.localdate().year + 1,
            start_date=timezone.localdate() + timedelta(days=30),
            end_date=timezone.localdate() + timedelta(days=32),
            operational_alert_email="tournament-alerts@example.org",
        )
    @patch("api.utils.operational_alerts.cache.delete")
    @patch("api.utils.operational_alerts.cache.add", return_value=True)
    @patch("api.utils.operational_alerts.send_mail", return_value=1)
    def test_alert_uses_shared_smtp_mailbox_and_reports_counts(
        self, send_mail, cache_add, cache_delete
    ):
        sent = alert_delivery_outbox_health(
            push_failed=2,
            push_stale=1,
            ticket_email_failed=0,
            ticket_email_stale=3,
        )

        self.assertTrue(sent)
        cache_add.assert_called_once()
        args = send_mail.call_args.kwargs
        self.assertEqual(args["recipient_list"], [self.tournament.operational_alert_email])
        self.assertEqual(args["from_email"], settings.DEFAULT_FROM_EMAIL)
        self.assertIn("Failed push notifications: 2", args["message"])
        self.assertIn("Stale ticket-email leases: 3", args["message"])

    @patch("api.utils.operational_alerts.get_tournament_contact_email", return_value="contact@example.org")
    @patch("api.utils.operational_alerts.cache.delete")
    @patch("api.utils.operational_alerts.cache.add", return_value=True)
    @patch("api.utils.operational_alerts.send_mail", return_value=1)
    def test_alert_falls_back_to_tournament_contact_email(
        self, send_mail, cache_add, cache_delete, get_contact_email
    ):
        self.tournament.operational_alert_email = ""
        self.tournament.save(update_fields=["operational_alert_email"])

        sent = alert_delivery_outbox_health(
            push_failed=1,
            push_stale=0,
            ticket_email_failed=0,
            ticket_email_stale=0,
        )

        self.assertTrue(sent)
        self.assertEqual(send_mail.call_args.kwargs["recipient_list"], ["contact@example.org"])

    @patch("api.utils.operational_alerts.cache.delete")
    @patch("api.utils.operational_alerts.cache.add", return_value=False)
    @patch("api.utils.operational_alerts.send_mail")
    def test_deduplicates_alert_during_cooldown(
        self, send_mail, cache_add, cache_delete
    ):
        sent = alert_delivery_outbox_health(
            push_failed=1,
            push_stale=0,
            ticket_email_failed=0,
            ticket_email_stale=0,
        )

        self.assertFalse(sent)
        send_mail.assert_not_called()

    @patch("api.utils.operational_alerts.cache.delete")
    @patch("api.utils.operational_alerts.cache.add")
    @patch("api.utils.operational_alerts.send_mail")
    def test_clears_cooldown_when_queues_are_healthy(
        self, send_mail, cache_add, cache_delete
    ):
        sent = alert_delivery_outbox_health(
            push_failed=0,
            push_stale=0,
            ticket_email_failed=0,
            ticket_email_stale=0,
        )

        self.assertFalse(sent)
        cache_delete.assert_called_once()
        cache_add.assert_not_called()
        send_mail.assert_not_called()

    @patch("api.utils.operational_alerts.cache.delete")
    @patch("api.utils.operational_alerts.cache.add", return_value=True)
    @patch("api.utils.operational_alerts.send_mail", return_value=0)
    def test_failed_email_delivery_releases_cooldown(
        self, send_mail, cache_add, cache_delete
    ):
        sent = alert_delivery_outbox_health(
            push_failed=1,
            push_stale=0,
            ticket_email_failed=0,
            ticket_email_stale=0,
        )

        self.assertFalse(sent)
        cache_delete.assert_called_once()
