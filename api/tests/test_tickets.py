from datetime import datetime, timedelta

from django.contrib.auth.models import User, Group
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from api.models.ballkid import Ballkid, Ticket, TicketOption, TicketSession
from api.models.enums import TICKET_STATUS
from api.utils.consts import TICKET_LIMIT
from api.utils.tickets import (
    EASTERN,
    for_storage,
    maybe_advance_session,
    remaining_tickets,
    run_lottery,
)


def _group(name):
    group, _ = Group.objects.get_or_create(name=name)
    return group


def _user(username, group_name, email=None):
    user = User.objects.create_user(
        username=username, password="password", email=email or ""
    )
    user.groups.add(_group(group_name))
    return user


def _naive(dt):
    return for_storage(dt)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class TicketFlowTests(APITestCase):
    def setUp(self):
        self.now = datetime.now(EASTERN)
        self.ticket_date = (self.now + timedelta(days=1)).date()
        self.closes = self.now + timedelta(hours=2)

        self.ticketing = _user("alexis", "ticketing", "alexis@example.com")
        self.bk_user = _user("kid.one", "ballkid", "kid.one@example.com")
        self.bk2_user = _user("kid.two", "ballkid", "kid.two@example.com")
        self.bk3_user = _user("kid.three", "ballkid", "kid.three@example.com")

        self.ballkid = Ballkid.objects.create(
            first_name="Kid", last_name="One", user=self.bk_user
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Kid", last_name="Two", user=self.bk2_user
        )
        self.ballkid3 = Ballkid.objects.create(
            first_name="Kid", last_name="Three", user=self.bk3_user, num_tickets=2
        )

        self.session = TicketSession.objects.create(
            year=self.ticket_date.year,
            ticket_date=self.ticket_date,
            closes_at=_naive(self.closes),
            pool_size=2,
            is_live=True,
        )
        self.option = TicketOption.objects.create(
            ticket_session=self.session,
            session_number=11,
            ticket_date=self.ticket_date,
            period="day",
            pool_size=2,
            order=0,
        )

        self.client = APIClient()

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _request(self, num=1, option=None):
        return self.client.post(
            reverse("request-tickets"),
            {
                "num_requested": num,
                "option_id": (option or self.option).id,
            },
            format="json",
        )

    def test_ticketing_account_is_hidden_from_ballkid_lists(self):
        leftover = Ballkid.objects.create(
            user=self.ticketing,
            first_name="Alexis",
            last_name="Tickets",
        )
        self._auth(self.ticketing)
        response = self.client.get(reverse("list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row["id"] for row in response.data]
        self.assertNotIn(leftover.id, ids)
        self.assertFalse(Ballkid.objects.filter(pk=leftover.pk).exists())
        self.assertTrue(Ballkid.all_objects.filter(pk=leftover.pk).exists())
        self.assertEqual(remaining_tickets(self.ballkid), TICKET_LIMIT)
        self.assertEqual(remaining_tickets(self.ballkid3), 0)

    def test_ballkid_can_request_while_open(self):
        self._auth(self.bk_user)
        response = self._request(1)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Ticket.objects.filter(ballkid=self.ballkid).count(), 1)

    def test_cannot_request_more_than_remaining(self):
        self._auth(self.bk_user)
        response = self._request(3)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_zero_remaining_blocked(self):
        self._auth(self.bk3_user)
        response = self._request(1)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("both", response.data["detail"].lower())

    def test_one_request_per_option(self):
        self._auth(self.bk_user)
        self._request(1)
        response = self._request(1)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already", response.data["detail"].lower())

    def test_can_split_requests_across_options(self):
        night = TicketOption.objects.create(
            ticket_session=self.session,
            session_number=12,
            ticket_date=self.ticket_date,
            period="night",
            pool_size=2,
            order=1,
        )
        self._auth(self.bk_user)
        response = self.client.post(
            reverse("request-tickets"),
            {
                "requests": [
                    {"option_id": self.option.id, "num_requested": 1},
                    {"option_id": night.id, "num_requested": 1},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tickets = Ticket.objects.filter(
            ballkid=self.ballkid, ticket_session=self.session
        )
        self.assertEqual(tickets.count(), 2)
        self.assertEqual(
            sorted(tickets.values_list("num_requested", flat=True)), [1, 1]
        )

    def test_cannot_exceed_cap_across_options(self):
        night = TicketOption.objects.create(
            ticket_session=self.session,
            session_number=12,
            ticket_date=self.ticket_date,
            period="night",
            pool_size=2,
            order=1,
        )
        self._auth(self.bk_user)
        response = self.client.post(
            reverse("request-tickets"),
            {
                "requests": [
                    {"option_id": self.option.id, "num_requested": 2},
                    {"option_id": night.id, "num_requested": 1},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            Ticket.objects.filter(
                ballkid=self.ballkid, ticket_session=self.session
            ).exists()
        )

    def test_can_decline_specific_confirmed_session(self):
        night = TicketOption.objects.create(
            ticket_session=self.session,
            session_number=12,
            ticket_date=self.ticket_date,
            period="night",
            pool_size=1,
            order=1,
        )
        self.option.pool_size = 1
        self.option.save()
        self._auth(self.bk_user)
        response = self.client.post(
            reverse("request-tickets"),
            {
                "requests": [
                    {"option_id": self.option.id, "num_requested": 1},
                    {"option_id": night.id, "num_requested": 1},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        run_lottery(self.session)
        confirmed = list(
            Ticket.objects.filter(
                ballkid=self.ballkid, status=TICKET_STATUS.CONFIRMED
            ).order_by("id")
        )
        self.assertEqual(len(confirmed), 2)
        self.ballkid.refresh_from_db()
        self.assertEqual(self.ballkid.num_tickets, 2)

        target = confirmed[0]
        kept = confirmed[1]
        response = self.client.post(
            reverse("confirm-tickets"),
            {"accept": False, "id": target.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        target.refresh_from_db()
        kept.refresh_from_db()
        self.ballkid.refresh_from_db()
        self.assertEqual(target.status, TICKET_STATUS.DECLINED)
        self.assertEqual(kept.status, TICKET_STATUS.CONFIRMED)
        self.assertEqual(self.ballkid.num_tickets, 1)

    def test_lottery_sends_one_digest_for_multi_session_requests(self):
        from django.core import mail

        night = TicketOption.objects.create(
            ticket_session=self.session,
            session_number=12,
            ticket_date=self.ticket_date,
            period="night",
            pool_size=1,
            order=1,
        )
        self.option.pool_size = 1
        self.option.save()
        self._auth(self.bk_user)
        response = self.client.post(
            reverse("request-tickets"),
            {
                "requests": [
                    {"option_id": self.option.id, "num_requested": 1},
                    {"option_id": night.id, "num_requested": 1},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mail.outbox.clear()
        run_lottery(self.session)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Ticket results", mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, [self.bk_user.email])
        body = mail.outbox[0].alternatives[0][0]
        self.assertIn("Confirmed", body)
        # Both options filled this ballkid alone - two confirmed lines.
        self.assertEqual(body.count("Confirmed for 1 ticket"), 2)

    def test_waitlist_promo_still_sends_individual_confirmed_email(self):
        from django.core import mail

        self.option.pool_size = 1
        self.option.save()
        for user in (self.bk_user, self.bk2_user):
            self._auth(user)
            self._request(1)
        run_lottery(self.session)
        confirmed = Ticket.objects.get(status=TICKET_STATUS.CONFIRMED)
        waitlisted = Ticket.objects.get(status=TICKET_STATUS.WAITLIST)
        mail.outbox.clear()
        self._auth(confirmed.ballkid.user)
        response = self.client.post(
            reverse("confirm-tickets"),
            {"accept": False, "id": confirmed.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        waitlisted.refresh_from_db()
        self.assertEqual(waitlisted.status, TICKET_STATUS.CONFIRMED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("You're off the waitlist", mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, [waitlisted.ballkid.user.email])

    def test_ballkid_cannot_put_session_or_change_used(self):
        self._auth(self.bk_user)
        response = self.client.put(
            reverse("ticket-session"),
            {
                "closes_at": self.closes.isoformat(),
                "options": [
                    {
                        "session_number": 11,
                        "ticket_date": self.ticket_date.isoformat(),
                        "period": "day",
                        "pool_size": 9,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.patch(
            reverse("ticket-used"),
            {"ballkidId": self.ballkid.id, "delta": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ticketing_can_configure_and_change_used(self):
        self._auth(self.ticketing)
        response = self.client.put(
            reverse("ticket-session"),
            {
                "id": self.session.id,
                "closes_at": "2026-08-15T11:00:00",
                "winner_confirm_by": "2026-08-15T18:00:00",
                "options": [
                    {
                        "id": self.option.id,
                        "session_number": 11,
                        "ticket_date": self.ticket_date.isoformat(),
                        "period": "day",
                        "pool_size": 4,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.option.refresh_from_db()
        self.assertEqual(self.option.pool_size, 4)
        self.session.refresh_from_db()
        self.assertIsNotNone(self.session.winner_confirm_by)

        response = self.client.patch(
            reverse("ticket-used"),
            {"ballkidId": self.ballkid.id, "delta": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ballkid.refresh_from_db()
        self.assertEqual(self.ballkid.num_tickets, 1)

    def test_ticket_list_is_own_for_ballkid_all_for_staff(self):
        Ticket.objects.create(
            year=self.session.year,
            session=self.ticket_date.isoformat(),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=1,
        )
        Ticket.objects.create(
            year=self.session.year,
            session=self.ticket_date.isoformat(),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid2,
            order=2,
            num_requested=1,
        )

        self._auth(self.bk_user)
        response = self.client.get(reverse("ticket-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["ballkid"], self.ballkid.id)

        self._auth(self.ticketing)
        response = self.client.get(reverse("ticket-list"))
        self.assertEqual(len(response.data), 2)

    def test_decline_reallocates_to_waitlist(self):
        for user in (self.bk_user, self.bk2_user):
            self._auth(user)
            self._request(1)

        self.option.pool_size = 1
        self.option.save()

        session = run_lottery(self.session)
        self.assertIsNotNone(session.lottery_run_at)
        confirmed = Ticket.objects.filter(status=TICKET_STATUS.CONFIRMED)
        waitlist = Ticket.objects.filter(status=TICKET_STATUS.WAITLIST)
        self.assertEqual(confirmed.count(), 1)
        self.assertEqual(waitlist.count(), 1)
        winner = confirmed.first()
        waitlisted = waitlist.first()
        winner.ballkid.refresh_from_db()
        self.assertEqual(winner.ballkid.num_tickets, 1)

        self._auth(winner.ballkid.user)
        response = self.client.post(
            reverse("confirm-tickets"), {"accept": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        winner.ballkid.refresh_from_db()
        self.assertEqual(winner.ballkid.num_tickets, 0)
        winner.refresh_from_db()
        self.assertEqual(winner.status, TICKET_STATUS.DECLINED)

        waitlisted.refresh_from_db()
        self.assertEqual(waitlisted.status, TICKET_STATUS.CONFIRMED)
        waitlisted.ballkid.refresh_from_db()
        self.assertEqual(waitlisted.ballkid.num_tickets, 1)
        self.assertEqual(
            Ticket.objects.filter(status=TICKET_STATUS.CONFIRMED).count(), 1
        )
        self.assertEqual(
            Ticket.objects.filter(status=TICKET_STATUS.DECLINED).count(), 1
        )

    def test_lottery_can_partially_fill_last_request(self):
        self.option.pool_size = 1
        self.option.save()
        self._auth(self.bk_user)
        self.assertEqual(self._request(2).status_code, status.HTTP_201_CREATED)

        run_lottery(self.session)
        ticket = Ticket.objects.get(ballkid=self.ballkid)
        self.assertEqual(ticket.status, TICKET_STATUS.CONFIRMED)
        self.assertEqual(ticket.num_granted, 1)
        self.ballkid.refresh_from_db()
        self.assertEqual(self.ballkid.num_tickets, 1)

    def test_lottery_partial_fills_remaining_pool(self):
        self.option.pool_size = 3
        self.option.save()
        self._auth(self.bk_user)
        self.assertEqual(self._request(2).status_code, status.HTTP_201_CREATED)
        self._auth(self.bk2_user)
        self.assertEqual(self._request(2).status_code, status.HTTP_201_CREATED)

        run_lottery(self.session)
        grants = sorted(
            Ticket.objects.filter(ticket_session=self.session).values_list(
                "num_granted", flat=True
            )
        )
        self.assertEqual(grants, [1, 2])
        self.assertEqual(
            Ticket.objects.filter(status=TICKET_STATUS.CONFIRMED).count(), 2
        )

    def test_can_edit_request_while_window_open(self):
        night = TicketOption.objects.create(
            ticket_session=self.session,
            session_number=12,
            ticket_date=self.ticket_date,
            period="night",
            pool_size=2,
            order=1,
        )
        self._auth(self.bk_user)
        self.assertEqual(self._request(1, self.option).status_code, status.HTTP_201_CREATED)
        response = self.client.patch(
            reverse("request-tickets"),
            {"num_requested": 2, "option_id": night.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ticket = Ticket.objects.get(ballkid=self.ballkid, ticket_session=self.session)
        self.assertEqual(ticket.num_requested, 2)
        self.assertEqual(ticket.ticket_option_id, night.id)

    def test_can_cancel_request_while_window_open(self):
        self._auth(self.bk_user)
        self.assertEqual(self._request(1).status_code, status.HTTP_201_CREATED)
        response = self.client.delete(reverse("request-tickets"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            Ticket.objects.filter(
                ballkid=self.ballkid, ticket_session=self.session
            ).exists()
        )
        self.assertEqual(self._request(1).status_code, status.HTTP_201_CREATED)

    def test_cannot_cancel_request_without_one(self):
        self._auth(self.bk_user)
        response = self.client.delete(reverse("request-tickets"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_cancel_request_after_window_closes(self):
        self._auth(self.bk_user)
        self.assertEqual(self._request(1).status_code, status.HTTP_201_CREATED)
        self.session.closes_at = _naive(self.now - timedelta(minutes=1))
        self.session.save()
        response = self.client.delete(reverse("request-tickets"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(
            Ticket.objects.filter(
                ballkid=self.ballkid, ticket_session=self.session
            ).exists()
        )

    def test_leftover_waitlist_auto_allocated_after_decline_deadline(self):
        self.option.pool_size = 1
        self.option.save()
        Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=1,
            status=TICKET_STATUS.WAITLIST,
        )
        self.session.lottery_run_at = _naive(self.now - timedelta(hours=2))
        self.session.winner_confirm_by = _naive(self.now - timedelta(minutes=1))
        self.session.save()

        session = maybe_advance_session(self.session, now=self.now)
        self.assertIsNotNone(session.waitlist_run_at)
        promoted = Ticket.objects.get(ballkid=self.ballkid, ticket_session=self.session)
        self.assertEqual(promoted.status, TICKET_STATUS.CONFIRMED)
        self.assertEqual(promoted.num_granted, 1)
        self.ballkid.refresh_from_db()
        self.assertEqual(self.ballkid.num_tickets, 1)

    def test_waitlist_marked_denied_after_decline_deadline(self):
        self.option.pool_size = 1
        self.option.save()
        Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=1,
            num_granted=1,
            status=TICKET_STATUS.CONFIRMED,
        )
        Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid2,
            order=2,
            num_requested=1,
            status=TICKET_STATUS.WAITLIST,
        )
        self.session.lottery_run_at = _naive(self.now - timedelta(hours=2))
        self.session.winner_confirm_by = _naive(self.now - timedelta(minutes=1))
        self.session.save()

        session = maybe_advance_session(self.session, now=self.now)
        self.assertIsNotNone(session.waitlist_run_at)
        waitlisted = Ticket.objects.get(
            ballkid=self.ballkid2, ticket_session=self.session
        )
        winner = Ticket.objects.get(ballkid=self.ballkid, ticket_session=self.session)
        self.assertEqual(winner.status, TICKET_STATUS.CONFIRMED)
        self.assertEqual(waitlisted.status, TICKET_STATUS.DENIED)

    def test_unclaimed_shown_when_waitlist_not_taken(self):
        self.option.pool_size = 3
        self.option.save()
        self.session.closes_at = _naive(self.now - timedelta(minutes=5))
        self.session.save()
        Ticket.objects.create(
            year=self.session.year,
            session=self.ticket_date.isoformat(),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=1,
            status=TICKET_STATUS.REQUESTED,
        )
        session = maybe_advance_session(self.session, now=self.now)
        self.assertFalse(session.is_live)
        self.assertIsNotNone(session.lottery_run_at)
        self._auth(self.ticketing)
        response = self.client.get(reverse("ticket-session"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rounds = response.data["sessions"]
        match = next(s for s in rounds if s["id"] == self.session.id)
        self.assertEqual(match["unclaimed_count"], 2)
        self.assertFalse(match["is_live"])

    def test_request_close_auto_takes_down_form(self):
        self._auth(self.bk_user)
        self.assertEqual(self._request(1).status_code, status.HTTP_201_CREATED)

        self.session.closes_at = _naive(self.now - timedelta(minutes=1))
        self.session.save()

        session = maybe_advance_session(self.session, now=self.now)
        self.assertIsNotNone(session.lottery_run_at)
        self.assertFalse(session.is_live)
        ticket = Ticket.objects.get(ballkid=self.ballkid)
        self.assertIn(
            ticket.status, (TICKET_STATUS.CONFIRMED, TICKET_STATUS.WAITLIST)
        )

    def test_ballkid_cannot_run_lottery(self):
        self._auth(self.bk_user)
        response = self.client.post(reverse("run-ticket-lottery"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ticketing_can_allocate_waitlisted_ticket(self):
        self.option.pool_size = 2
        self.option.save()
        Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=1,
            status=TICKET_STATUS.WAITLIST,
        )
        self.session.lottery_run_at = _naive(self.now)
        self.session.save()
        ticket = Ticket.objects.get(ballkid=self.ballkid)
        self._auth(self.ticketing)
        response = self.client.post(
            reverse("allocate-tickets"),
            {"id": ticket.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, TICKET_STATUS.CONFIRMED)
        self.assertEqual(ticket.num_granted, 1)
        self.ballkid.refresh_from_db()
        self.assertEqual(self.ballkid.num_tickets, 1)

    def test_ticketing_can_allocate_denied_ticket(self):
        self.option.pool_size = 2
        self.option.save()
        Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=1,
            status=TICKET_STATUS.DENIED,
        )
        self.session.lottery_run_at = _naive(self.now)
        self.session.waitlist_run_at = _naive(self.now)
        self.session.save()
        ticket = Ticket.objects.get(ballkid=self.ballkid)
        self._auth(self.ticketing)
        response = self.client.post(
            reverse("allocate-tickets"),
            {"id": ticket.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, TICKET_STATUS.CONFIRMED)
        self.assertEqual(ticket.num_granted, 1)
        self.ballkid.refresh_from_db()
        self.assertEqual(self.ballkid.num_tickets, 1)

    def test_allocate_waitlist_can_be_partial(self):
        self.option.pool_size = 1
        self.option.save()
        Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=2,
            status=TICKET_STATUS.WAITLIST,
        )
        self.session.lottery_run_at = _naive(self.now)
        self.session.save()
        ticket = Ticket.objects.get(ballkid=self.ballkid)
        self._auth(self.ticketing)
        response = self.client.post(
            reverse("allocate-tickets"),
            {"id": ticket.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, TICKET_STATUS.CONFIRMED)
        self.assertEqual(ticket.num_granted, 1)

    def test_cannot_allocate_declined_ticket(self):
        self.option.pool_size = 2
        self.option.save()
        Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=1,
            status=TICKET_STATUS.DECLINED,
        )
        ticket = Ticket.objects.get(ballkid=self.ballkid)
        self._auth(self.ticketing)
        response = self.client.post(
            reverse("allocate-tickets"),
            {"id": ticket.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, TICKET_STATUS.DECLINED)

    def test_cannot_allocate_without_leftover_tickets(self):
        self.option.pool_size = 1
        self.option.save()
        Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=1,
            num_granted=1,
            status=TICKET_STATUS.CONFIRMED,
        )
        waitlisted = Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid2,
            order=2,
            num_requested=1,
            status=TICKET_STATUS.WAITLIST,
        )
        self.session.lottery_run_at = _naive(self.now)
        self.session.save()
        self._auth(self.ticketing)
        response = self.client.post(
            reverse("allocate-tickets"),
            {"id": waitlisted.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        waitlisted.refresh_from_db()
        self.assertEqual(waitlisted.status, TICKET_STATUS.WAITLIST)

    def test_ballkid_cannot_allocate_waitlist(self):
        Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=1,
            status=TICKET_STATUS.WAITLIST,
        )
        ticket = Ticket.objects.get(ballkid=self.ballkid)
        self._auth(self.bk_user)
        response = self.client.post(
            reverse("allocate-tickets"),
            {"id": ticket.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lottery_is_per_option(self):
        night = TicketOption.objects.create(
            ticket_session=self.session,
            session_number=12,
            ticket_date=self.ticket_date,
            period="night",
            pool_size=1,
            order=1,
        )
        self.option.pool_size = 1
        self.option.save()
        self._auth(self.bk_user)
        self._request(1, self.option)
        self._auth(self.bk2_user)
        self._request(1, night)
        run_lottery(self.session)
        self.assertEqual(
            Ticket.objects.get(ballkid=self.ballkid).status, TICKET_STATUS.CONFIRMED
        )
        self.assertEqual(
            Ticket.objects.get(ballkid=self.ballkid2).status, TICKET_STATUS.CONFIRMED
        )

    def test_put_round_with_two_options(self):
        self._auth(self.ticketing)
        response = self.client.put(
            reverse("ticket-session"),
            {
                "id": self.session.id,
                "closes_at": "2026-08-15T11:00:00",
                "options": [
                    {
                        "id": self.option.id,
                        "session_number": 11,
                        "ticket_date": self.ticket_date.isoformat(),
                        "period": "day",
                        "pool_size": 9,
                    },
                    {
                        "session_number": 12,
                        "ticket_date": self.ticket_date.isoformat(),
                        "period": "night",
                        "pool_size": 6,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        options = response.data["session"]["options"]
        self.assertEqual(len(options), 2)
        labels = [o["label"] for o in options]
        self.assertTrue(any("DAY SESSION" in label for label in labels))
        self.assertTrue(any("NIGHT SESSION" in label for label in labels))
        self.assertEqual(response.data["session"]["pool_size"], 15)

    def test_all_day_option_has_plain_label(self):
        self._auth(self.ticketing)
        response = self.client.put(
            reverse("ticket-session"),
            {
                "id": self.session.id,
                "closes_at": "2026-08-15T11:00:00",
                "options": [
                    {
                        "id": self.option.id,
                        "session_number": 11,
                        "ticket_date": self.ticket_date.isoformat(),
                        "period": "all_day",
                        "pool_size": 9,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        label = response.data["session"]["options"][0]["label"]
        self.assertIn("Session 11", label)
        self.assertNotIn("DAY SESSION", label)
        self.assertNotIn("NIGHT SESSION", label)
        self.option.refresh_from_db()
        self.assertEqual(self.option.period, "all_day")

    def test_must_pick_option_when_several_exist(self):
        TicketOption.objects.create(
            ticket_session=self.session,
            session_number=12,
            ticket_date=self.ticket_date,
            period="night",
            pool_size=1,
            order=1,
        )
        self._auth(self.bk_user)
        response = self.client.post(
            reverse("request-tickets"),
            {"num_requested": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("session", response.data["detail"].lower())

    def test_cannot_request_until_round_is_live(self):
        self.session.is_live = False
        self.session.save()
        self._auth(self.bk_user)
        response = self._request(1)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("live", response.data["detail"].lower())

    def test_live_round_is_open_immediately(self):
        future = (self.now + timedelta(days=5)).date()
        self.session.ticket_date = future
        self.session.save()
        self.option.ticket_date = future
        self.option.save()

        self._auth(self.bk_user)
        payload = self.client.get(reverse("ticket-session")).data["session"]
        self.assertTrue(payload["is_live"])
        self.assertEqual(payload["phase"], "open")

        response = self._request(1)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def _make_next_live_round(self):
        next_date = self.ticket_date + timedelta(days=1)
        nxt = TicketSession.objects.create(
            year=next_date.year,
            ticket_date=next_date,
            closes_at=_naive(self.now + timedelta(hours=2)),
            pool_size=2,
            is_live=True,
        )
        TicketOption.objects.create(
            ticket_session=nxt,
            session_number=1,
            ticket_date=next_date,
            period="day",
            pool_size=2,
            order=0,
        )
        return nxt

    def test_ballkid_sees_new_live_round_after_previous_finalized(self):
        self._auth(self.bk_user)
        self.assertEqual(self._request(1).status_code, status.HTTP_201_CREATED)
        self.session = run_lottery(self.session)
        self.session.is_live = False
        self.session.winner_confirm_by = _naive(self.now - timedelta(minutes=1))
        self.session.save()
        maybe_advance_session(self.session, now=self.now)
        self.session.refresh_from_db()
        self.assertIsNotNone(self.session.waitlist_run_at)

        nxt = self._make_next_live_round()
        payload = self.client.get(reverse("ticket-session")).data["session"]
        self.assertEqual(payload["id"], nxt.id)
        self.assertTrue(payload["is_live"])
        self.assertEqual(payload["phase"], "open")

    def test_ballkid_stays_on_allocating_round_until_decline_deadline(self):
        self._auth(self.bk_user)
        self.assertEqual(self._request(1).status_code, status.HTTP_201_CREATED)
        self.session = run_lottery(self.session)
        self.session.is_live = False
        self.session.winner_confirm_by = _naive(self.now + timedelta(hours=2))
        self.session.save()
        nxt = self._make_next_live_round()

        payload = self.client.get(reverse("ticket-session")).data["session"]
        self.assertEqual(payload["id"], self.session.id)
        self.assertNotEqual(payload["id"], nxt.id)

    def test_decline_skips_ballkid_who_already_declined_that_day(self):
        night = TicketOption.objects.create(
            ticket_session=self.session,
            session_number=12,
            ticket_date=self.ticket_date,
            period="night",
            pool_size=1,
            order=1,
        )
        Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=None,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=1,
            num_granted=1,
            status=TICKET_STATUS.DECLINED,
        )
        Ticket.objects.create(
            year=self.session.year,
            session=str(night.session_number),
            ticket_session=self.session,
            ticket_option=night,
            ballkid=self.ballkid,
            order=2,
            num_requested=1,
            status=TICKET_STATUS.WAITLIST,
        )
        Ticket.objects.create(
            year=self.session.year,
            session=str(night.session_number),
            ticket_session=self.session,
            ticket_option=night,
            ballkid=self.ballkid2,
            order=3,
            num_requested=1,
            status=TICKET_STATUS.WAITLIST,
        )
        bk4_user = _user("kid.four", "ballkid", "kid.four@example.com")
        ballkid4 = Ballkid.objects.create(
            first_name="Kid", last_name="Four", user=bk4_user, num_tickets=1
        )
        Ticket.objects.create(
            year=self.session.year,
            session=str(night.session_number),
            ticket_session=self.session,
            ticket_option=night,
            ballkid=ballkid4,
            order=4,
            num_requested=1,
            num_granted=1,
            status=TICKET_STATUS.CONFIRMED,
        )
        self.session.lottery_run_at = _naive(self.now)
        self.session.save()

        self._auth(bk4_user)
        response = self.client.post(
            reverse("confirm-tickets"), {"accept": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        still_waitlisted = Ticket.objects.get(
            ballkid=self.ballkid, ticket_option=night
        )
        promoted = Ticket.objects.get(ballkid=self.ballkid2, ticket_option=night)
        self.assertEqual(still_waitlisted.status, TICKET_STATUS.WAITLIST)
        self.assertEqual(promoted.status, TICKET_STATUS.CONFIRMED)
        self.ballkid2.refresh_from_db()
        self.assertEqual(self.ballkid2.num_tickets, 1)

    def test_decline_reallocates_again_when_next_winner_declines(self):
        bk4_user = _user("kid.four", "ballkid", "kid.four@example.com")
        ballkid4 = Ballkid.objects.create(
            first_name="Kid", last_name="Four", user=bk4_user
        )
        self.option.pool_size = 1
        self.option.save()
        for user in (self.bk_user, self.bk2_user, bk4_user):
            self._auth(user)
            self._request(1)

        run_lottery(self.session)
        winner = Ticket.objects.get(status=TICKET_STATUS.CONFIRMED)
        self._auth(winner.ballkid.user)
        self.assertEqual(
            self.client.post(
                reverse("confirm-tickets"), {"accept": False}, format="json"
            ).status_code,
            status.HTTP_200_OK,
        )
        second = Ticket.objects.get(status=TICKET_STATUS.CONFIRMED)
        self.assertNotEqual(second.ballkid_id, winner.ballkid_id)

        self._auth(second.ballkid.user)
        self.assertEqual(
            self.client.post(
                reverse("confirm-tickets"), {"accept": False}, format="json"
            ).status_code,
            status.HTTP_200_OK,
        )
        third = Ticket.objects.get(status=TICKET_STATUS.CONFIRMED)
        self.assertNotEqual(third.ballkid_id, winner.ballkid_id)
        self.assertNotEqual(third.ballkid_id, second.ballkid_id)
        self.assertEqual(
            Ticket.objects.filter(status=TICKET_STATUS.DECLINED).count(), 2
        )

    def test_decline_does_not_reallocate_other_session_waitlist(self):
        night = TicketOption.objects.create(
            ticket_session=self.session,
            session_number=12,
            ticket_date=self.ticket_date,
            period="night",
            pool_size=1,
            order=1,
        )
        self.option.pool_size = 1
        self.option.save()
        Ticket.objects.create(
            year=self.session.year,
            session=str(self.option.session_number),
            ticket_session=self.session,
            ticket_option=self.option,
            ballkid=self.ballkid,
            order=1,
            num_requested=1,
            num_granted=1,
            status=TICKET_STATUS.CONFIRMED,
        )
        self.ballkid.num_tickets = 1
        self.ballkid.save()
        Ticket.objects.create(
            year=self.session.year,
            session=str(night.session_number),
            ticket_session=self.session,
            ticket_option=night,
            ballkid=self.ballkid2,
            order=2,
            num_requested=1,
            status=TICKET_STATUS.WAITLIST,
        )
        self.session.lottery_run_at = _naive(self.now)
        self.session.save()

        self._auth(self.bk_user)
        response = self.client.post(
            reverse("confirm-tickets"), {"accept": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        night_ticket = Ticket.objects.get(ballkid=self.ballkid2, ticket_option=night)
        self.assertEqual(night_ticket.status, TICKET_STATUS.WAITLIST)
        self.assertEqual(
            Ticket.objects.filter(status=TICKET_STATUS.CONFIRMED).count(), 0
        )
        other_date = self.ticket_date + timedelta(days=1)
        other = TicketSession.objects.create(
            year=other_date.year,
            ticket_date=other_date,
            closes_at=_naive(self.closes),
            pool_size=1,
            is_live=False,
        )
        self._auth(self.ticketing)
        response = self.client.patch(
            reverse("ticket-session"),
            {"id": other.id, "is_live": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        other.refresh_from_db()
        self.session.refresh_from_db()
        self.assertFalse(other.is_live)
        self.assertTrue(self.session.is_live)

        self.client.patch(
            reverse("ticket-session"),
            {"id": self.session.id, "is_live": False},
            format="json",
        )
        response = self.client.patch(
            reverse("ticket-session"),
            {"id": other.id, "is_live": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        other.refresh_from_db()
        self.session.refresh_from_db()
        self.assertTrue(other.is_live)
        self.assertFalse(self.session.is_live)
        self.assertEqual(len(response.data["sessions"]), 2)

    def test_take_down_denies_requested_tickets(self):
        self._auth(self.bk_user)
        self.assertEqual(self._request(1).status_code, status.HTTP_201_CREATED)
        ticket = Ticket.objects.get(ballkid=self.ballkid)
        self.assertEqual(ticket.status, TICKET_STATUS.REQUESTED)

        self._auth(self.ticketing)
        response = self.client.patch(
            reverse("ticket-session"),
            {"id": self.session.id, "is_live": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.assertFalse(TicketSession.objects.get(id=self.session.id).is_live)
        self.assertEqual(ticket.status, TICKET_STATUS.DENIED)

        self._auth(self.bk_user)
        listed = self.client.get(reverse("ticket-list"))
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["status"], TICKET_STATUS.DENIED)

    def test_can_delete_saved_round(self):
        other_date = self.ticket_date + timedelta(days=1)
        other = TicketSession.objects.create(
            year=other_date.year,
            ticket_date=other_date,
            closes_at=_naive(self.closes),
            pool_size=1,
            is_live=False,
        )
        self._auth(self.bk_user)
        self._request(1)
        self.assertTrue(
            Ticket.objects.filter(ticket_session=self.session).exists()
        )

        self._auth(self.ticketing)
        response = self.client.delete(
            reverse("ticket-session"),
            {"id": self.session.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            TicketSession.objects.filter(id=self.session.id).exists()
        )
        self.assertFalse(
            Ticket.objects.filter(ticket_session=self.session.id).exists()
        )
        self.assertTrue(TicketSession.objects.filter(id=other.id).exists())
        self.assertEqual(len(response.data["sessions"]), 1)

        missing = self.client.delete(
            reverse("ticket-session"),
            {},
            format="json",
        )
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_round_refunds_confirmed_ticket_allocation(self):
        self._auth(self.bk_user)
        self.assertEqual(self._request(1).status_code, status.HTTP_201_CREATED)
        run_lottery(self.session)
        ticket = Ticket.objects.get(ballkid=self.ballkid)
        self.assertEqual(ticket.status, TICKET_STATUS.CONFIRMED)
        self.ballkid.refresh_from_db()
        self.assertEqual(self.ballkid.num_tickets, ticket.num_granted)

        self._auth(self.ticketing)
        response = self.client.delete(
            reverse("ticket-session"),
            {"id": self.session.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ballkid.refresh_from_db()
        self.assertEqual(self.ballkid.num_tickets, 0)
        self.assertFalse(
            Ticket.objects.filter(id=ticket.id).exists()
        )

    def test_ballkid_cannot_delete_round(self):
        self._auth(self.bk_user)
        response = self.client.delete(
            reverse("ticket-session"),
            {"id": self.session.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(TicketSession.objects.filter(id=self.session.id).exists())

    def test_put_without_id_creates_another_round(self):
        other_date = self.ticket_date + timedelta(days=1)
        self._auth(self.ticketing)
        response = self.client.put(
            reverse("ticket-session"),
            {
                "closes_at": "2026-08-15T11:00:00",
                "options": [
                    {
                        "session_number": 20,
                        "ticket_date": other_date.isoformat(),
                        "period": "all_day",
                        "pool_size": 4,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            TicketSession.objects.filter(year=self.ticket_date.year).count(), 2
        )
        created = TicketSession.objects.exclude(id=self.session.id).get()
        self.assertFalse(created.is_live)
        self.assertEqual(created.ticket_date, other_date)

    def test_cannot_create_round_for_existing_date(self):
        self._auth(self.ticketing)
        response = self.client.put(
            reverse("ticket-session"),
            {
                "closes_at": "2026-08-15T11:00:00",
                "options": [
                    {
                        "session_number": 20,
                        "ticket_date": self.ticket_date.isoformat(),
                        "period": "all_day",
                        "pool_size": 4,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("edit it below", response.data["detail"].lower())
        self.assertEqual(
            TicketSession.objects.filter(year=self.ticket_date.year).count(), 1
        )

    def test_cannot_create_round_for_finalized_date(self):
        self._auth(self.ticketing)
        self.session.lottery_run_at = _naive(self.now - timedelta(hours=3))
        self.session.winner_confirm_by = _naive(self.now - timedelta(hours=1))
        self.session.waitlist_run_at = _naive(self.now - timedelta(hours=1))
        self.session.is_live = False
        self.session.save()
        response = self.client.put(
            reverse("ticket-session"),
            {
                "closes_at": "2026-08-15T11:00:00",
                "options": [
                    {
                        "session_number": 20,
                        "ticket_date": self.ticket_date.isoformat(),
                        "period": "all_day",
                        "pool_size": 4,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        detail = response.data["detail"].lower()
        self.assertIn("finalized", detail)
        self.assertIn("finalized rounds", detail)
        self.assertEqual(
            TicketSession.objects.filter(year=self.ticket_date.year).count(), 1
        )


class TestTicketEmailTemplates(APITestCase):
    def test_preview_templates_render(self):
        from api.utils.ticket_emails import render_ticket_email, sample_contexts

        samples = sample_contexts()
        for sample_name, template_name in (
            ("round_live", "round_live"),
            ("confirmed_waitlist", "confirmed"),
            ("denied", "denied"),
        ):
            html = render_ticket_email(template_name, samples[sample_name])
            self.assertIn("Mubadala DC Open", html)
            self.assertIn("Hi Andrea", html)
            self.assertIn("/tickets", html)

        live_html = render_ticket_email("round_live", samples["round_live"])
        self.assertNotIn("LIVE", live_html)
        self.assertIn(
            "You have 1 of your allotted 2 tickets left to request", live_html
        )
        self.assertIn(
            "You can request tickets by 6:00 PM ET on Saturday, August 1 for the "
            "Sunday, August 2 session:",
            live_html,
        )
        self.assertIn("Sunday, August 2 · Session 1 (Day session)", live_html)
        self.assertEqual(
            samples["round_live"]["session_subject_suffix"], "Sunday, August 2"
        )
        self.assertEqual(
            samples["round_live_multi"]["session_subject_suffix"], "Sunday, August 2"
        )

        multi_html = render_ticket_email("round_live", samples["round_live_multi"])
        self.assertIn(
            "You can request tickets by 6:00 PM ET on Saturday, August 1 for the "
            "Sunday, August 2 sessions:",
            multi_html,
        )
        self.assertIn("Sunday, August 2 · Session 1 (Day session)", multi_html)
        self.assertIn("Sunday, August 2 · Session 2 (Night session)", multi_html)

        display = samples["confirmed_waitlist"]["session_display"]
        self.assertEqual(display, "Sunday, August 2 · Session 1 (Day session)")
        confirmed_html = render_ticket_email(
            "confirmed", samples["confirmed_waitlist"]
        )
        self.assertIn(display, confirmed_html)
        self.assertIn("You&apos;re off the waitlist", confirmed_html)
        self.assertIn("session you were waitlisted for", confirmed_html)
        self.assertIn("#ecfdf3", confirmed_html)
        self.assertEqual(
            samples["confirmed_waitlist"]["session_subject_suffix"], "Sunday, August 2"
        )

        mixed = render_ticket_email(
            "lottery_results", samples["lottery_results_mixed"]
        )
        self.assertIn("Your ticket results", mixed)
        self.assertNotIn("RESULTS", mixed)
        self.assertIn("Confirmed for 1 ticket", mixed)
        self.assertIn("Waitlisted", mixed)
        self.assertIn("#ecfdf3", mixed)
        self.assertIn("#fef9c3", mixed)

        waitlist_html = render_ticket_email(
            "lottery_results", samples["lottery_results_waitlist"]
        )
        self.assertIn("Your ticket results", waitlist_html)
        self.assertIn("Waitlisted", waitlist_html)
        self.assertIn("email you automatically", waitlist_html)
        self.assertIn("#fef9c3", waitlist_html)

        denied_html = render_ticket_email("denied", samples["denied"])
        self.assertIn("No tickets this round", denied_html)
        self.assertNotIn("DENIED", denied_html)
        self.assertIn("#fef2f2", denied_html)
        self.assertIn(
            "You didn&apos;t receive tickets this time for your requested session.",
            denied_html,
        )
        self.assertIn("Sunday, August 2 · Session 1 (Day session)", denied_html)
        self.assertEqual(samples["denied"]["session_subject_suffix"], "Sunday, August 2")

        denied_multi = render_ticket_email("denied", samples["denied_digest"])
        self.assertNotIn("DENIED", denied_multi)
        self.assertIn("#fef2f2", denied_multi)
        self.assertIn(
            "You didn&apos;t receive tickets this time for your requested sessions.",
            denied_multi,
        )
        self.assertIn("Sunday, August 2 · Session 2 (Night session)", denied_multi)

        partial_html = render_ticket_email("confirmed", samples["confirmed_partial"])
        self.assertIn("session you were waitlisted for", partial_html)
        self.assertIn("Partially confirmed for 1 ticket", partial_html)
        self.assertIn("you requested 2", partial_html)
        self.assertIn("Can&apos;t use it?", partial_html)
        waitlist_html = render_ticket_email(
            "confirmed", samples["confirmed_waitlist"]
        )
        self.assertIn("Can&apos;t use it?", waitlist_html)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class TestTicketEmailRecipients(APITestCase):
    def setUp(self):
        self.ticketing = _user("alexis.emails", "ticketing", "alexis.emails@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.ticketing)

    def test_recipient_count_on_session_payload(self):
        response = self.client.get(reverse("ticket-session"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["ticket_email_recipient_count"], 0)
        self.assertIn("ticket_emails_enabled", response.data)
        self.assertTrue(response.data["ticket_emails_enabled"])

    def test_can_toggle_ticket_emails(self):
        from api.models.schedule import Tournament
        from api.utils.utils import get_current_year

        Tournament.objects.get_or_create(year=get_current_year())
        response = self.client.patch(
            reverse("ticket-session"),
            {"ticket_emails_enabled": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["ticket_emails_enabled"])
        session = self.client.get(reverse("ticket-session"))
        self.assertFalse(session.data["ticket_emails_enabled"])

    def test_disabled_emails_skip_lottery_digest(self):
        from django.core import mail
        from api.models.schedule import Tournament
        from api.utils.tickets import run_lottery
        from api.utils.utils import get_current_year

        Tournament.objects.update_or_create(
            year=get_current_year(),
            defaults={"ticket_emails_enabled": False},
        )
        flow = TicketFlowTests()
        flow.setUp()
        flow._auth(flow.bk_user)
        flow._request(1)
        mail.outbox.clear()
        run_lottery(flow.session)
        self.assertEqual(len(mail.outbox), 0)

    def test_round_live_count_skips_used_up_tickets(self):
        from api.utils.tickets import round_live_email_recipients

        used = _user("used.up", "ballkid", "used.up@example.com")
        open_kid = _user("has.tix", "ballkid", "has.tix@example.com")
        Ballkid.objects.create(
            first_name="Used", last_name="Up", user=used, num_tickets=TICKET_LIMIT
        )
        Ballkid.objects.create(
            first_name="Has", last_name="Tix", user=open_kid, num_tickets=1
        )
        emails = set(round_live_email_recipients().values_list("user__email", flat=True))
        self.assertIn("has.tix@example.com", emails)
        self.assertNotIn("used.up@example.com", emails)

    def test_round_live_count_skips_cut_and_archived(self):
        from api.utils.tickets import round_live_email_recipients

        cut_user = _user("cut.kid", "ballkid", "cut.kid@example.com")
        archived_user = _user("arch.kid", "ballkid", "arch.kid@example.com")
        ok_user = _user("ok.kid", "ballkid", "ok.kid@example.com")
        Ballkid.objects.create(
            first_name="Cut", last_name="Kid", user=cut_user, is_cut=True
        )
        Ballkid.objects.create(
            first_name="Arch", last_name="Kid", user=archived_user, is_active=False
        )
        Ballkid.objects.create(
            first_name="Ok", last_name="Kid", user=ok_user, num_tickets=0
        )
        emails = set(round_live_email_recipients().values_list("user__email", flat=True))
        self.assertIn("ok.kid@example.com", emails)
        self.assertNotIn("cut.kid@example.com", emails)
        self.assertNotIn("arch.kid@example.com", emails)


class TicketEligibilityTests(APITestCase):
    def setUp(self):
        flow = TicketFlowTests()
        flow.setUp()
        self.flow = flow
        self.client = flow.client

    def test_cut_ballkid_cannot_request(self):
        self.flow.ballkid.is_cut = True
        self.flow.ballkid.save(update_fields=["is_cut"])
        self.flow._auth(self.flow.bk_user)
        response = self.flow._request(1)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        session = self.client.get(reverse("ticket-session"))
        self.assertFalse(session.data["ticket_eligible"])
        self.assertIsNone(session.data["session"])

    def test_archived_ballkid_cannot_request(self):
        self.flow.ballkid.is_active = False
        self.flow.ballkid.save(update_fields=["is_active"])
        self.flow._auth(self.flow.bk_user)
        response = self.flow._request(1)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lottery_denies_cut_ballkid_and_skips_email(self):
        from django.core import mail
        from api.utils.tickets import run_lottery

        self.flow._auth(self.flow.bk_user)
        self.flow._request(1)
        self.flow.ballkid.is_cut = True
        self.flow.ballkid.save(update_fields=["is_cut"])
        mail.outbox.clear()
        run_lottery(self.flow.session)
        ticket = Ticket.objects.get(ballkid=self.flow.ballkid)
        self.assertEqual(ticket.status, TICKET_STATUS.DENIED)
        self.assertEqual(ticket.num_granted, 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_staff_cannot_allocate_waitlist_to_cut_ballkid(self):
        from api.utils.tickets import allocate_waitlist_ticket, run_lottery

        self.flow.session.pool_size = 0
        self.flow.session.save(update_fields=["pool_size"])
        self.flow.option.pool_size = 0
        self.flow.option.save(update_fields=["pool_size"])
        self.flow._auth(self.flow.bk_user)
        self.flow._request(1)
        run_lottery(self.flow.session)
        ticket = Ticket.objects.get(ballkid=self.flow.ballkid)
        self.assertEqual(ticket.status, TICKET_STATUS.WAITLIST)
        self.flow.ballkid.is_cut = True
        self.flow.ballkid.save(update_fields=["is_cut"])
        self.flow.option.pool_size = 2
        self.flow.option.save(update_fields=["pool_size"])
        with self.assertRaises(ValueError):
            allocate_waitlist_ticket(ticket)
