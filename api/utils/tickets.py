"""Ticket rounds, lottery, waitlist, and email helpers (America/New_York).

A round is a TicketSession (one date's form). A session is a TicketOption
(session #, day/night/all day, pool size) that ballkids pick on that form.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import random

from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from api.models.ballkid import Ticket, TicketSession
from api.models.enums import TICKET_STATUS
from api.utils.consts import (
    TICKET_LIMIT,
    TICKET_WINNER_CONFIRM_HOUR,
)
from api.utils.utils import get_current_year

EASTERN = ZoneInfo("America/New_York")


def now_et(now=None):
    if now is None:
        now = datetime.now(EASTERN)
    if timezone.is_naive(now):
        return now.replace(tzinfo=EASTERN)
    return now.astimezone(EASTERN)


def for_storage(dt):
    if dt is None:
        return None
    aware = now_et(dt)
    if getattr(settings, "USE_TZ", False):
        return aware
    return aware.replace(tzinfo=None)


def as_et(dt):
    if dt is None:
        return None
    return now_et(dt)


def parse_et_datetime(value):
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return now_et(value)
    s = str(value).strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    return now_et(dt)


def remaining_tickets(ballkid):
    used = ballkid.num_tickets or 0
    return max(0, TICKET_LIMIT - used)


def option_label(option):
    if option is None:
        return ""
    date_part = f"{option.ticket_date.strftime('%a %B')} {option.ticket_date.day}"
    label = f"{date_part}: Session {option.session_number}"
    if option.period == "day":
        return f"{label} (DAY SESSION)"
    if option.period == "night":
        return f"{label} (NIGHT SESSION)"
    return label


def default_winner_confirm_by(closes_at):
    """Decline deadline must be after requests close so winners get a window."""
    local = as_et(closes_at)
    candidate = datetime(
        local.year,
        local.month,
        local.day,
        TICKET_WINNER_CONFIRM_HOUR,
        0,
        tzinfo=EASTERN,
    )
    if candidate <= local:
        candidate = candidate + timedelta(days=1)
    return candidate


def winner_confirm_by(session):
    stored = getattr(session, "winner_confirm_by", None)
    if stored:
        return as_et(stored)
    return default_winner_confirm_by(session.closes_at)


def option_unclaimed(option):
    confirmed = (
        option.tickets.filter(status=TICKET_STATUS.CONFIRMED).aggregate(
            total=Sum("num_granted")
        )["total"]
        or 0
    )
    return max(0, option.pool_size - confirmed)


def unclaimed_count(session):
    options = list(session.options.all())
    if options:
        return sum(option_unclaimed(o) for o in options)
    confirmed = (
        session.tickets.filter(status=TICKET_STATUS.CONFIRMED).aggregate(
            total=Sum("num_granted")
        )["total"]
        or 0
    )
    return max(0, session.pool_size - confirmed)


def session_phase(session, now=None):
    now = now_et(now)
    closes = as_et(session.closes_at)
    confirm_by = winner_confirm_by(session)

    if not session.is_live and not session.lottery_run_at:
        return "draft"
    if session.is_live and now < closes:
        return "open"
    if not session.lottery_run_at:
        return "closed"
    if now < confirm_by:
        return "confirming"
    if not session.waitlist_run_at:
        return "waitlist_pending"
    return "done"


def serialize_option(option):
    return {
        "id": option.id,
        "session_number": option.session_number,
        "ticket_date": option.ticket_date.isoformat(),
        "period": option.period or "",
        "pool_size": option.pool_size,
        "order": option.order,
        "label": option_label(option),
        "unclaimed_count": option_unclaimed(option),
    }


def serialize_session(session, now=None):
    now = now_et(now)
    option_models = list(session.options.all())
    options = [serialize_option(o) for o in option_models]
    ticket_date = (
        min(o.ticket_date for o in option_models)
        if option_models
        else session.ticket_date
    )
    unclaimed = (
        sum(o["unclaimed_count"] for o in options)
        if options
        else unclaimed_count(session)
    )
    return {
        "id": session.id,
        "year": session.year,
        "ticket_date": ticket_date.isoformat(),
        "session_number": session.session_number,
        "closes_at": as_et(session.closes_at).isoformat(),
        "pool_size": sum(o["pool_size"] for o in options) or session.pool_size,
        "lottery_run_at": (
            as_et(session.lottery_run_at).isoformat()
            if session.lottery_run_at
            else None
        ),
        "waitlist_run_at": (
            as_et(session.waitlist_run_at).isoformat()
            if session.waitlist_run_at
            else None
        ),
        "winner_confirm_by": winner_confirm_by(session).isoformat(),
        "phase": session_phase(session, now),
        "unclaimed_count": unclaimed,
        "is_live": bool(session.is_live),
        "options": options,
    }


def is_ticket_admin(user):
    if not user or not user.is_authenticated:
        return False
    return user.groups.filter(name__in=["chairperson", "ticketing"]).exists()


def pick_current_session(now=None, ticket_date=None, year=None):
    year = year or get_current_year()
    qs = TicketSession.objects.filter(year=year).prefetch_related("options")
    if ticket_date:
        return qs.filter(
            Q(ticket_date=ticket_date) | Q(options__ticket_date=ticket_date)
        ).distinct().first()

    live = qs.filter(is_live=True).first()
    if live:
        return live

    now = now_et(now)
    sessions = list(qs.order_by("ticket_date", "id"))
    if not sessions:
        return None

    for session in sessions:
        confirm_by = winner_confirm_by(session)
        if now <= confirm_by:
            return session
    return sessions[-1]


def pick_live_session(now=None, year=None):
    year = year or get_current_year()
    session = (
        TicketSession.objects.filter(year=year, is_live=True)
        .prefetch_related("options")
        .first()
    )
    return maybe_advance_session(session, now=now)


def _round_still_allocating(session, now=None):
    """True while winners can still decline or waitlist backfill has not run."""
    if session is None or not session.lottery_run_at or session.waitlist_run_at:
        return False
    return now_et(now) < winner_confirm_by(session)


def pick_ballkid_session(ballkid, now=None):
    now = now_et(now)
    mine = (
        Ticket.objects.filter(
            ballkid=ballkid,
            ticket_session__isnull=False,
            ticket_session__lottery_run_at__isnull=False,
        )
        .select_related("ticket_session", "ticket_option")
        .order_by("-ticket_session__ticket_date", "-id")
        .first()
    )
    previous = None
    if mine and mine.ticket_session_id:
        previous = maybe_advance_session(mine.ticket_session, now=now)
        # Stay on the previous round until it is finalized so decline / waitlist
        # still show as the current form.
        if _round_still_allocating(previous, now):
            return previous

    live = pick_live_session(now=now)
    if live:
        return live
    return previous


def set_session_live(session, is_live=True):
    if is_live:
        taken = (
            TicketSession.objects.filter(year=session.year, is_live=True)
            .exclude(pk=session.pk)
            .exists()
        )
        if taken:
            raise ValueError(
                "Another ticket round is already live. Take it down first."
            )
        session.is_live = True
    else:
        session.is_live = False
        session.tickets.filter(status=TICKET_STATUS.REQUESTED).update(
            status=TICKET_STATUS.DENIED
        )
    session.save(update_fields=["is_live"])
    return session


def send_ticket_email(ballkid, subject, body):
    # Ticket emails are paused; keep helpers in place to turn back on later.
    return False


def _name(ballkid):
    return f"{ballkid.first_name} {ballkid.last_name}".strip()


def _format_et(dt):
    local = as_et(dt)
    return local.strftime("%-I:%M %p ET on %a %-m/%-d")


def _request_label(ticket=None, session=None, option=None):
    option = option or (ticket.ticket_option if ticket else None)
    if option:
        return option_label(option)
    session = session or (ticket.ticket_session if ticket else None)
    if session:
        return session.ticket_date.strftime("%-m/%-d")
    return "tickets"


def email_request_confirmation(ballkid, session, num_requested, option=None):
    date_label = _request_label(session=session, option=option)
    send_ticket_email(
        ballkid,
        f"Ticket request received for {date_label}",
        (
            f"Hi {_name(ballkid)},\n\n"
            f"We received your request for {num_requested} ticket(s) "
            f"for {date_label}. You'll get another email after the lottery "
            f"closes at {_format_et(session.closes_at)}.\n"
        ),
    )


def email_selected(ballkid, session, num_granted, option=None):
    date_label = _request_label(session=session, option=option)
    confirm_by = winner_confirm_by(session)
    send_ticket_email(
        ballkid,
        f"You won {date_label} tickets",
        (
            f"Hi {_name(ballkid)},\n\n"
            f"You were selected for {num_granted} ticket(s) for {date_label}. "
            f"They've been added to your tournament total. "
            f"If you can't use them, decline in the app by {_format_et(confirm_by)} "
            f"so they can go to the waitlist.\n"
        ),
    )


def email_not_selected(ballkid, session, option=None):
    date_label = _request_label(session=session, option=option)
    send_ticket_email(
        ballkid,
        f"You weren't selected for {date_label} tickets",
        (
            f"Hi {_name(ballkid)},\n\n"
            f"You weren't selected in the lottery for {date_label} tickets. "
            f"You're on the waitlist in case winners decline.\n"
        ),
    )


def ticket_event_date(ticket):
    option = getattr(ticket, "ticket_option", None)
    if option is not None:
        return option.ticket_date
    session = getattr(ticket, "ticket_session", None)
    if session is not None:
        return session.ticket_date
    return None


def declined_ballkid_ids_for_date(ticket_date, year=None):
    if ticket_date is None:
        return set()
    qs = Ticket.objects.filter(
        status=TICKET_STATUS.DECLINED,
        ballkid_id__isnull=False,
    ).filter(
        Q(ticket_option__ticket_date=ticket_date)
        | Q(
            ticket_option__isnull=True,
            ticket_session__ticket_date=ticket_date,
        )
    )
    if year is not None:
        qs = qs.filter(year=year)
    return set(qs.values_list("ballkid_id", flat=True))


def _waitlist_for_option(session, option, exclude_ballkid_ids=None):
    qs = session.tickets.filter(status=TICKET_STATUS.WAITLIST)
    if option is not None:
        qs = qs.filter(ticket_option=option)
    else:
        qs = qs.filter(ticket_option__isnull=True)
    if exclude_ballkid_ids:
        qs = qs.exclude(ballkid_id__in=exclude_ballkid_ids)
    return qs


def _grant_size(ticket, remaining_pool):
    """Tickets this request can take from remaining_pool (0 if none)."""
    if remaining_pool <= 0:
        return 0
    budget = remaining_tickets(ticket.ballkid) if ticket.ballkid else 0
    need = min(ticket.num_requested, budget) if budget > 0 else 0
    if need <= 0:
        return 0
    return need if remaining_pool >= need else remaining_pool


@transaction.atomic
def reallocate_declined_grants(declined_ticket, now=None):
    """Randomly give declined tickets to waitlisted ballkids who have not declined that day."""
    now = now_et(now)
    declined_ticket = Ticket.objects.select_for_update().get(pk=declined_ticket.pk)
    released = declined_ticket.num_granted or 0
    session = declined_ticket.ticket_session
    if released <= 0 or session is None:
        return []

    session = TicketSession.objects.select_for_update().get(pk=session.pk)
    option = declined_ticket.ticket_option
    exclude = declined_ballkid_ids_for_date(
        ticket_event_date(declined_ticket), year=session.year
    )
    if declined_ticket.ballkid_id:
        exclude.add(declined_ticket.ballkid_id)

    candidates = list(_waitlist_for_option(session, option, exclude).select_for_update())
    random.shuffle(candidates)

    remaining_pool = released
    allocated = []
    for ticket in candidates:
        grant = _grant_size(ticket, remaining_pool)
        if grant <= 0:
            continue
        remaining_pool -= grant
        _auto_confirm_win(
            ticket, grant, now, session, option=option or ticket.ticket_option
        )
        allocated.append(ticket)
    return allocated


def _auto_confirm_win(ticket, grant, now, session, option=None):
    ticket.num_granted = grant
    ticket.status = TICKET_STATUS.CONFIRMED
    ticket.confirmed_at = for_storage(now)
    ticket.save()
    if ticket.ballkid_id:
        ballkid = ticket.ballkid
        ballkid.num_tickets = (ballkid.num_tickets or 0) + grant
        ballkid.save(update_fields=["num_tickets"])
        email_selected(ballkid, session, grant, option=option or ticket.ticket_option)


def _lottery_one_option(session, option, tickets, now=None):
    now = now_et(now)
    random.shuffle(tickets)
    remaining_pool = option.pool_size if option else session.pool_size
    for index, ticket in enumerate(tickets, start=1):
        ticket.order = index
        ticket_option = option or ticket.ticket_option
        grant = _grant_size(ticket, remaining_pool)
        if grant <= 0:
            ticket.status = TICKET_STATUS.WAITLIST
            ticket.num_granted = 0
            ticket.save()
            if ticket.ballkid:
                email_not_selected(ticket.ballkid, session, option=ticket_option)
            continue
        remaining_pool -= grant
        _auto_confirm_win(ticket, grant, now, session, option=ticket_option)


@transaction.atomic
def run_lottery(session, now=None):
    now = now_et(now)
    session = TicketSession.objects.select_for_update().get(pk=session.pk)
    if session.lottery_run_at:
        return session

    options = list(session.options.all())
    if options:
        for option in options:
            tickets = list(
                session.tickets.filter(
                    status=TICKET_STATUS.REQUESTED, ticket_option=option
                ).select_related("ballkid", "ticket_option")
            )
            _lottery_one_option(session, option, tickets, now=now)
        leftovers = list(
            session.tickets.filter(
                status=TICKET_STATUS.REQUESTED, ticket_option__isnull=True
            ).select_related("ballkid", "ticket_option")
        )
        if leftovers:
            _lottery_one_option(session, None, leftovers, now=now)
    else:
        tickets = list(
            session.tickets.filter(status=TICKET_STATUS.REQUESTED).select_related(
                "ballkid", "ticket_option"
            )
        )
        _lottery_one_option(session, None, tickets, now=now)

    session.lottery_run_at = for_storage(now)
    session.save(update_fields=["lottery_run_at"])
    return session


@transaction.atomic
def run_waitlist_pass(session, now=None):
    now = now_et(now)
    session = TicketSession.objects.select_for_update().get(pk=session.pk)
    if session.waitlist_run_at:
        return session

    options = list(session.options.all()) or [None]
    for option in options:
        waitlisted = session.tickets.filter(status=TICKET_STATUS.WAITLIST)
        if option is not None:
            waitlisted = waitlisted.filter(ticket_option=option)
        else:
            waitlisted = waitlisted.filter(ticket_option__isnull=True)

        remaining_pool = option_unclaimed(option) if option else unclaimed_count(session)
        exclude = declined_ballkid_ids_for_date(
            option.ticket_date if option is not None else session.ticket_date,
            year=session.year,
        )
        waitlist = list(
            waitlisted.exclude(ballkid_id__in=exclude)
            .select_related("ballkid", "ticket_option")
        )
        random.shuffle(waitlist)
        for ticket in waitlist:
            grant = _grant_size(ticket, remaining_pool)
            if grant <= 0:
                continue
            remaining_pool -= grant
            _auto_confirm_win(
                ticket, grant, now, session, option=option or ticket.ticket_option
            )

    deny_unfilled_waitlist(session)
    session.waitlist_run_at = for_storage(now)
    session.save(update_fields=["waitlist_run_at"])
    return session


def deny_unfilled_waitlist(session):
    session.tickets.filter(status=TICKET_STATUS.WAITLIST).update(
        status=TICKET_STATUS.DENIED
    )


@transaction.atomic
def allocate_waitlist_ticket(ticket, now=None):
    """Staff failsafe: confirm leftover tickets for a waitlisted or denied request."""
    now = now_et(now)
    ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    if ticket.status not in (TICKET_STATUS.WAITLIST, TICKET_STATUS.DENIED):
        raise ValueError("Only waitlisted or denied requests can be allocated.")
    session = ticket.ticket_session
    if session is None:
        raise ValueError("No ticket round found.")
    TicketSession.objects.select_for_update().get(pk=session.pk)
    if ticket.ballkid_id:
        ticket.ballkid.refresh_from_db()
    option = ticket.ticket_option
    if ticket.ballkid_id in declined_ballkid_ids_for_date(
        ticket_event_date(ticket), year=ticket.year or session.year
    ):
        raise ValueError("This ballkid already declined tickets for that day.")
    leftover = option_unclaimed(option) if option else unclaimed_count(session)
    grant = _grant_size(ticket, leftover)
    if leftover <= 0 or grant <= 0:
        if leftover <= 0:
            raise ValueError("No tickets left to allocate for this session.")
        raise ValueError("This ballkid has no tickets remaining this tournament.")
    _auto_confirm_win(ticket, grant, now, session, option=option)
    return Ticket.objects.select_related("ticket_option", "ballkid").get(pk=ticket.pk)


def maybe_advance_session(session, now=None):
    if session is None:
        return None
    if not session.is_live and not session.lottery_run_at:
        return session
    now = now_et(now)
    closes = as_et(session.closes_at)
    if now >= closes and not session.lottery_run_at:
        session = run_lottery(session, now=now)

    if now >= closes and session.is_live:
        session.is_live = False
        session.save(update_fields=["is_live"])

    confirm_by = winner_confirm_by(session)
    if now >= confirm_by:
        if not session.waitlist_run_at:
            session = run_waitlist_pass(session, now=now)
        else:
            deny_unfilled_waitlist(session)

    return TicketSession.objects.get(pk=session.pk)
