from unittest.mock import patch

from django.conf import settings
from django.test import SimpleTestCase

from api.utils.operational_alerts import alert_delivery_outbox_health


class OperationalDeliveryAlertTests(SimpleTestCase):
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
        self.assertEqual(args["recipient_list"], [settings.EMAIL_HOST_USER])
        self.assertEqual(args["from_email"], settings.DEFAULT_FROM_EMAIL)
        self.assertIn("Failed push notifications: 2", args["message"])
        self.assertIn("Stale ticket-email leases: 3", args["message"])

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
