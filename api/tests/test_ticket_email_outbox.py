from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from api.models.ballkid import Ballkid, Ticket, TicketOption, TicketSession
from api.models.enums import TICKET_STATUS
from api.models.notifications import TicketEmailDelivery
from api.utils.consts import TICKET_LIMIT
from api.utils.ticket_email_outbox import enqueue_ticket_email, process_ticket_email_outbox
from api.utils.tickets import _auto_confirm_win, for_storage, now_et


class TicketEmailOutboxTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ticket-email-test",
            email="volunteer@example.com",
            password="not-used",
        )
        self.ballkid = Ballkid.objects.create(
            user=self.user, first_name="Test", last_name="Volunteer"
        )
        self.context = {
            "recipient_name": "Test",
            "session_date_display": "Sunday, August 2",
            "outcomes": [{"status": "confirmed", "ticket_count": 1}],
        }

    def test_enqueue_is_idempotent(self):
        self.assertTrue(
            enqueue_ticket_email(
                self.ballkid, "Ticket results", "lottery_results", self.context
            )
        )
        self.assertFalse(
            enqueue_ticket_email(
                self.ballkid, "Ticket results", "lottery_results", self.context
            )
        )
        self.assertEqual(TicketEmailDelivery.objects.count(), 1)

    @patch("api.utils.ticket_email_outbox._send")
    def test_worker_sends_and_marks_email_sent(self, send):
        enqueue_ticket_email(
            self.ballkid, "Ticket results", "lottery_results", self.context
        )

        self.assertEqual(process_ticket_email_outbox(limit=1), 1)

        delivery = TicketEmailDelivery.objects.get()
        self.assertEqual(delivery.status, TicketEmailDelivery.STATUS_SENT)
        self.assertEqual(delivery.attempts, 1)
        send.assert_called_once()

    @patch("api.utils.ticket_email_outbox._send", side_effect=RuntimeError("provider down"))
    def test_worker_retries_transient_provider_failure(self, send):
        enqueue_ticket_email(
            self.ballkid, "Ticket results", "lottery_results", self.context
        )

        self.assertEqual(process_ticket_email_outbox(limit=1), 0)

        delivery = TicketEmailDelivery.objects.get()
        self.assertEqual(delivery.status, TicketEmailDelivery.STATUS_PENDING)
        self.assertEqual(delivery.attempts, 1)
        self.assertIn("provider down", delivery.last_error)


class TicketAllocationLockTests(TestCase):
    def test_stale_ballkid_instance_cannot_push_balance_over_tournament_cap(self):
        ballkid = Ballkid.objects.create(
            first_name="At", last_name="Cap", num_tickets=TICKET_LIMIT - 1
        )
        session = TicketSession.objects.create(
            year=date.today().year,
            ticket_date=date.today() + timedelta(days=1),
            closes_at=for_storage(now_et() - timedelta(hours=1)),
            pool_size=1,
        )
        option = TicketOption.objects.create(
            ticket_session=session,
            session_number=1,
            ticket_date=session.ticket_date,
            pool_size=1,
        )
        ticket = Ticket.objects.create(
            year=session.year,
            session=str(option.session_number),
            ticket_session=session,
            ticket_option=option,
            ballkid=ballkid,
            order=1,
            num_requested=1,
            status=TICKET_STATUS.WAITLIST,
        )
        stale_ticket = Ticket.objects.select_related("ballkid", "ticket_option").get(pk=ticket.pk)
        Ballkid.objects.filter(pk=ballkid.pk).update(num_tickets=TICKET_LIMIT)

        _auto_confirm_win(
            stale_ticket,
            1,
            now_et(),
            session,
            option=option,
            notify=False,
        )

        ticket.refresh_from_db()
        ballkid.refresh_from_db()
        self.assertEqual(ticket.status, TICKET_STATUS.WAITLIST)
        self.assertEqual(ticket.num_granted, 0)
        self.assertEqual(ballkid.num_tickets, TICKET_LIMIT)
