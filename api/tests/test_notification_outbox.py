from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from api.models.notifications import NotificationDelivery, NotificationSettings
from api.utils.notification_outbox import enqueue_push, process_notification_outbox


class NotificationOutboxTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="outbox-test",
            password="not-a-real-password",
        )
        self.payload = {
            "title": "Test notification",
            "body": "This is a durable outbox test.",
            "url": "/",
            "tag": "outbox-test",
        }

    @patch("api.utils.notification_outbox.web_push_configured", return_value=True)
    def test_enqueue_is_idempotent_for_same_user_type_and_key(self, _configured):
        first = enqueue_push(self.user, "announcement", "same-key", self.payload)
        second = enqueue_push(self.user, "announcement", "same-key", self.payload)

        self.assertTrue(first)
        self.assertFalse(second)
        self.assertEqual(NotificationDelivery.objects.count(), 1)

        delivery = NotificationDelivery.objects.get()
        self.assertEqual(delivery.status, NotificationDelivery.STATUS_PENDING)
        self.assertEqual(delivery.payload, self.payload)

    @patch("api.utils.notification_outbox.web_push_configured", return_value=True)
    def test_enqueue_respects_disabled_preference(self, _configured):
        NotificationSettings.objects.create(
            user=self.user,
            announcements_enabled=False,
        )

        queued = enqueue_push(
            self.user,
            "announcement",
            "disabled-pref",
            self.payload,
            pref_field="announcements_enabled",
        )

        self.assertFalse(queued)
        self.assertFalse(NotificationDelivery.objects.exists())

    @patch("api.utils.notification_outbox.web_push_configured", return_value=True)
    @patch("api.utils.notification_outbox.send_push_to_user", return_value=True)
    def test_successful_delivery_is_recorded(self, _send, _configured):
        enqueue_push(self.user, "announcement", "success", self.payload)

        sent = process_notification_outbox(limit=10)

        self.assertEqual(sent, 1)
        delivery = NotificationDelivery.objects.get(reference_key="success")
        self.assertEqual(delivery.status, NotificationDelivery.STATUS_SENT)
        self.assertIsNotNone(delivery.sent_at)
        self.assertIsNone(delivery.locked_until)
        self.assertEqual(delivery.attempts, 1)

    @patch("api.utils.notification_outbox.web_push_configured", return_value=True)
    @patch("api.utils.notification_outbox.send_push_to_user", return_value=False)
    def test_failed_delivery_is_scheduled_for_retry(self, _send, _configured):
        enqueue_push(self.user, "announcement", "retry", self.payload)

        before = timezone.now()
        sent = process_notification_outbox(limit=10)

        self.assertEqual(sent, 0)
        delivery = NotificationDelivery.objects.get(reference_key="retry")
        self.assertEqual(delivery.status, NotificationDelivery.STATUS_PENDING)
        self.assertEqual(delivery.attempts, 1)
        self.assertGreater(delivery.available_at, before)
        self.assertIn("did not succeed", delivery.last_error)
        self.assertIsNone(delivery.locked_until)

    @patch("api.utils.notification_outbox.web_push_configured", return_value=True)
    @patch("api.utils.notification_outbox.send_push_to_user", return_value=True)
    def test_expired_processing_lease_is_recovered(self, _send, _configured):
        delivery = NotificationDelivery.objects.create(
            user=self.user,
            notification_type="announcement",
            reference_key="expired-lease",
            payload=self.payload,
            status=NotificationDelivery.STATUS_PROCESSING,
            attempts=1,
            locked_until=timezone.now() - timedelta(seconds=1),
        )

        sent = process_notification_outbox(limit=10)

        self.assertEqual(sent, 1)
        delivery.refresh_from_db()
        self.assertEqual(delivery.status, NotificationDelivery.STATUS_SENT)
        self.assertEqual(delivery.attempts, 2)
        self.assertIsNotNone(delivery.sent_at)
