from datetime import date, timedelta

from django.test import TestCase

from api.models.ballkid import Ballkid, Ticket, TicketOption, TicketSession
from api.models.enums import TICKET_STATUS
from api.models.schedule import Tournament
from api.utils.consts import TICKET_LIMIT
from api.utils.tickets import (
    allocate_waitlist_ticket,
    ballkid_eligible_for_tickets,
    declined_ballkid_ids_for_date,
    for_storage,
    now_et,
    option_unclaimed,
    reallocate_declined_grants,
    remaining_tickets,
    run_lottery,
    run_waitlist_pass,
    ticket_event_date,
)
from api.utils.utils import get_current_year

YEAR = get_current_year()
S = TICKET_STATUS


def make_ballkid(name, **kwargs):
    return Ballkid.objects.create(first_name=name, last_name="InvariantTest", **kwargs)


def make_round(pool=2):
    closes = for_storage(now_et() - timedelta(hours=1))
    session = TicketSession.objects.create(
        year=YEAR,
        ticket_date=date.today() + timedelta(days=1),
        closes_at=closes,
        winner_confirm_by=for_storage(now_et() + timedelta(hours=12)),
        pool_size=pool,
        is_live=True,
    )
    option = TicketOption.objects.create(
        ticket_session=session,
        session_number=1,
        ticket_date=session.ticket_date,
        pool_size=pool,
    )
    return session, option


def request_ticket(session, option, ballkid, num=1):
    return Ticket.objects.create(
        year=YEAR,
        session=str(option.session_number),
        ticket_session=session,
        ticket_option=option,
        ballkid=ballkid,
        order=session.tickets.count() + 1,
        num_requested=num,
        status=S.REQUESTED,
    )


def decline(ticket, reallocate=True):
    """Mirror the production ConfirmTickets decline branch."""
    ballkid = ticket.ballkid
    ballkid.num_tickets = max(0, (ballkid.num_tickets or 0) - ticket.num_granted)
    ballkid.save(update_fields=["num_tickets"])
    ticket.status = S.DECLINED
    ticket.save(update_fields=["status"])
    if reallocate:
        reallocate_declined_grants(ticket)


class TicketInvariantTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        Tournament.objects.create(
            year=YEAR,
            start_date=date(YEAR, 7, 20),
            end_date=date(YEAR, 7, 28),
            ticket_emails_enabled=False,
        )

    def statuses(self, session):
        return sorted(session.tickets.values_list("status", flat=True))


class TicketLotteryInvariantTests(TicketInvariantTestCase):
    def test_lottery_grants_only_up_to_pool_and_waitlists_remaining_requests(self):
        session, option = make_round(pool=2)
        for name in "ABC":
            request_ticket(session, option, make_ballkid(name))

        run_lottery(session)

        self.assertEqual(
            self.statuses(session),
            sorted([S.CONFIRMED, S.CONFIRMED, S.WAITLIST]),
        )
        self.assertEqual(
            Ballkid.objects.filter(ticket_set__ticket_session=session, ticket_set__status=S.CONFIRMED)
            .count(),
            2,
        )
        self.assertEqual(option_unclaimed(option), 0)

    def test_lottery_never_grants_more_than_pool_and_partially_fills_last_request(self):
        session, option = make_round(pool=3)
        for name in "AB":
            request_ticket(session, option, make_ballkid(name), num=2)

        run_lottery(session)

        self.assertEqual(
            sum(ticket.num_granted for ticket in session.tickets.all()), 3
        )

    def test_ballkid_at_tournament_cap_is_not_granted(self):
        session, option = make_round(pool=5)
        ticket = request_ticket(
            session, option, make_ballkid("AtCap", num_tickets=TICKET_LIMIT)
        )

        run_lottery(session)

        ticket.refresh_from_db()
        self.assertNotEqual(ticket.status, S.CONFIRMED)
        self.assertEqual(ticket.num_granted, 0)

    def test_cut_ballkid_is_denied_by_lottery(self):
        session, option = make_round(pool=5)
        ticket = request_ticket(session, option, make_ballkid("Cut", is_cut=True))

        run_lottery(session)

        ticket.refresh_from_db()
        self.assertEqual(ticket.status, S.DENIED)

    def test_lottery_is_idempotent_and_does_not_double_increment_tickets(self):
        session, option = make_round(pool=1)
        for name in "AB":
            request_ticket(session, option, make_ballkid(name))

        first = run_lottery(session)
        total_before = sum(ballkid.num_tickets for ballkid in Ballkid.objects.all())
        second = run_lottery(session)

        self.assertEqual(first.lottery_run_at, second.lottery_run_at)
        self.assertEqual(
            total_before, sum(ballkid.num_tickets for ballkid in Ballkid.objects.all())
        )


class TicketDeclineAndWaitlistInvariantTests(TicketInvariantTestCase):
    def test_decline_reallocates_released_grant_to_waitlist(self):
        session, option = make_round(pool=1)
        for name in "AB":
            request_ticket(session, option, make_ballkid(name))
        run_lottery(session)

        winner = session.tickets.get(status=S.CONFIRMED)
        waitlisted = session.tickets.get(status=S.WAITLIST)
        decline(winner)

        waitlisted.refresh_from_db()
        self.assertEqual(waitlisted.status, S.CONFIRMED)
        self.assertEqual(waitlisted.ballkid.num_tickets, 1)
        self.assertEqual(Ballkid.objects.get(pk=winner.ballkid_id).num_tickets, 0)

    def test_decliner_is_recorded_for_the_event_date(self):
        session, option = make_round(pool=1)
        request_ticket(session, option, make_ballkid("Decliner"))
        run_lottery(session)
        winner = session.tickets.get(status=S.CONFIRMED)
        decline(winner)

        self.assertIn(
            winner.ballkid_id,
            declined_ballkid_ids_for_date(ticket_event_date(winner), year=YEAR),
        )

    def test_waitlist_pass_allocates_leftovers_and_denies_unfilled_requests(self):
        session, option = make_round(pool=2)
        for name in "ABCD":
            request_ticket(session, option, make_ballkid(name))
        run_lottery(session)

        decline(session.tickets.filter(status=S.CONFIRMED).first(), reallocate=False)
        run_waitlist_pass(session)

        session.refresh_from_db()
        self.assertIsNotNone(session.waitlist_run_at)
        counts = {
            status: session.tickets.filter(status=status).count()
            for status in set(S.values)
        }
        self.assertEqual(counts[S.CONFIRMED], 2)
        self.assertEqual(counts[S.DENIED], 1)
        self.assertEqual(counts[S.WAITLIST], 0)
        self.assertEqual(counts[S.DECLINED], 1)

    def test_staff_allocation_fails_when_pool_is_empty(self):
        session, option = make_round(pool=1)
        for name in "AB":
            request_ticket(session, option, make_ballkid(name))
        run_lottery(session)

        with self.assertRaisesRegex(ValueError, "No tickets left"):
            allocate_waitlist_ticket(session.tickets.get(status=S.WAITLIST))

    def test_staff_allocation_uses_released_leftover_tickets(self):
        session, option = make_round(pool=1)
        for name in "AB":
            request_ticket(session, option, make_ballkid(name))
        run_lottery(session)
        decline(session.tickets.get(status=S.CONFIRMED), reallocate=False)

        allocated = allocate_waitlist_ticket(session.tickets.get(status=S.WAITLIST))
        self.assertEqual(allocated.status, S.CONFIRMED)


class TicketEligibilityHelperTests(TicketInvariantTestCase):
    def test_remaining_tickets_respects_tournament_cap(self):
        self.assertEqual(remaining_tickets(make_ballkid("Fresh")), TICKET_LIMIT)
        self.assertEqual(
            remaining_tickets(make_ballkid("AtCap", num_tickets=TICKET_LIMIT)),
            0,
        )

    def test_ticket_eligibility_requires_active_non_cut_ballkid(self):
        self.assertTrue(ballkid_eligible_for_tickets(make_ballkid("Eligible")))
        self.assertFalse(
            ballkid_eligible_for_tickets(make_ballkid("Cut", is_cut=True))
        )
        self.assertFalse(
            ballkid_eligible_for_tickets(make_ballkid("Archived", is_active=False))
        )
        self.assertFalse(ballkid_eligible_for_tickets(None))
