from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from api.management.commands.send_notifications import Command
from api.models.notifications import NotificationDelivery, TicketEmailDelivery


class NotificationWorkerObservabilityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="worker-observability-test",
            password="not-a-real-password",
        )

    def test_heartbeat_reports_pending_failed_and_stale_outbox_rows(self):
        expired_lease = timezone.now() - timedelta(seconds=1)
        NotificationDelivery.objects.create(
            user=self.user,
            notification_type="announcement",
            reference_key="push-pending",
            payload={},
            status=NotificationDelivery.STATUS_PENDING,
        )
        NotificationDelivery.objects.create(
            user=self.user,
            notification_type="announcement",
            reference_key="push-failed",
            payload={},
            status=NotificationDelivery.STATUS_FAILED,
        )
        NotificationDelivery.objects.create(
            user=self.user,
            notification_type="announcement",
            reference_key="push-stale",
            payload={},
            status=NotificationDelivery.STATUS_PROCESSING,
            locked_until=expired_lease,
        )

        TicketEmailDelivery.objects.create(
            idempotency_key="email-pending",
            recipient="volunteer@example.com",
            subject="Pending",
            template_name="ticket_round_live",
            context={},
            status=TicketEmailDelivery.STATUS_PENDING,
        )
        TicketEmailDelivery.objects.create(
            idempotency_key="email-failed",
            recipient="volunteer@example.com",
            subject="Failed",
            template_name="ticket_round_live",
            context={},
            status=TicketEmailDelivery.STATUS_FAILED,
        )
        TicketEmailDelivery.objects.create(
            idempotency_key="email-stale",
            recipient="volunteer@example.com",
            subject="Stale",
            template_name="ticket_round_live",
            context={},
            status=TicketEmailDelivery.STATUS_PROCESSING,
            locked_until=expired_lease,
        )

        with self.assertLogs("api.notifications", level="INFO") as captured:
            Command().log_health()

        message = captured.output[0]
        self.assertIn("push_pending=1", message)
        self.assertIn("push_failed=1", message)
        self.assertIn("push_stale=1", message)
        self.assertIn("ticket_email_pending=1", message)
        self.assertIn("ticket_email_failed=1", message)
        self.assertIn("ticket_email_stale=1", message)
