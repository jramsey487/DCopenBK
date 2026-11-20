"""
Push notifications triggered by ticket changes.

Hooked in with model signals (like api/utils/audit.py) so the ticket code
itself doesn't need to know about push:

- A round going live                    -> "Ticket requests are open"
- The lottery running                   -> "Your ticket results are in"
- A ticket becoming confirmed AFTER the
  lottery (waitlist promotion, decline
  reallocation, staff Allocate)         -> "A spot opened up"

Everything is a no-op until Web Push is configured, and sends happen in a
background thread after the transaction commits.
"""

import logging

from django.db import transaction
from django.db.models.signals import post_init, post_save

from api.utils.push_notifications import (
    deliver_push,
    push_recipients,
    run_in_background,
    web_push_configured,
)

logger = logging.getLogger("api.notifications")

PREF = "ticket_updates_enabled"


# ---------------------------------------------------------------- tickets


def _ticket_init(sender, instance, **kwargs):
    instance._push_status = instance.__dict__.get("status")


def _ticket_saved(sender, instance, created, **kwargs):
    from api.models.ballkid import TicketSession
    from api.models.enums import TICKET_STATUS

    try:
        previous = getattr(instance, "_push_status", None)
        if (
            web_push_configured()
            and not created
            and previous is not None
            and previous != TICKET_STATUS.CONFIRMED
            and instance.status == TICKET_STATUS.CONFIRMED
            and instance.ballkid_id
            and instance.ticket_session_id
        ):
            # Decide *now*, inside the transaction: winners confirmed by the
            # lottery itself are saved before lottery_run_at is set, and they
            # get the results notification instead of this one.
            after_lottery = TicketSession.objects.filter(
                pk=instance.ticket_session_id, lottery_run_at__isnull=False
            ).exists()
            if after_lottery:
                ticket_id = instance.pk
                transaction.on_commit(
                    lambda: run_in_background(_notify_spot_opened, ticket_id)
                )
    except Exception:
        logger.exception("Ticket push hook failed")
    finally:
        instance._push_status = instance.__dict__.get("status")


def _notify_spot_opened(ticket_id):
    from api.models.ballkid import Ticket
    from api.utils.tickets import ballkid_eligible_for_tickets, option_label

    ticket = (
        Ticket.objects.select_related("ballkid", "ballkid__user", "ticket_option")
        .filter(pk=ticket_id)
        .first()
    )
    if ticket is None or ticket.ballkid is None or not ticket.ballkid.user_id:
        return
    if not ballkid_eligible_for_tickets(ticket.ballkid):
        return

    granted = ticket.num_granted or 0
    noun = "ticket" if granted == 1 else "tickets"
    label = option_label(ticket.ticket_option) if ticket.ticket_option_id else ""
    payload = {
        "title": "A ticket spot opened up",
        "body": f"You're confirmed for {granted} {noun}"
        + (f" — {label}." if label else "."),
        "url": "/tickets",
        "tag": f"waitlist-{ticket.id}",
    }
    deliver_push(
        ticket.ballkid.user,
        "waitlist_spot",
        f"ticket-{ticket.id}-{granted}",
        payload,
        pref_field=PREF,
    )


# --------------------------------------------------------------- sessions


def _session_init(sender, instance, **kwargs):
    instance._push_orig = {
        field: instance.__dict__[field]
        for field in ("is_live", "lottery_run_at")
        if field in instance.__dict__
    }


def _session_saved(sender, instance, created, **kwargs):
    try:
        orig = getattr(instance, "_push_orig", {})
        if web_push_configured():
            if instance.is_live and orig.get("is_live") is False:
                session_id = instance.pk
                transaction.on_commit(
                    lambda: run_in_background(_notify_round_live, session_id)
                )
            if (
                instance.lottery_run_at is not None
                and "lottery_run_at" in orig
                and orig["lottery_run_at"] is None
            ):
                session_id = instance.pk
                transaction.on_commit(
                    lambda: run_in_background(_notify_lottery_results, session_id)
                )
    except Exception:
        logger.exception("Ticket session push hook failed")
    finally:
        _session_init(sender, instance)


def _notify_round_live(session_id):
    from api.models.ballkid import TicketSession
    from api.utils.tickets import as_et

    session = TicketSession.objects.filter(pk=session_id).first()
    if session is None:
        return

    closes = as_et(session.closes_at)
    date_label = f"{session.ticket_date.strftime('%A, %B')} {session.ticket_date.day}"
    payload = {
        "title": "Ticket requests are open",
        "body": (
            f"Request tickets for {date_label} by "
            f"{closes.strftime('%I:%M %p').lstrip('0')} ET."
        ),
        "url": "/tickets",
        "tag": f"ticket-round-{session.id}",
    }
    for ballkid in push_recipients(pref_field=PREF, tickets_left=True):
        deliver_push(
            ballkid.user,
            "ticket_round",
            f"round-{session.id}",
            payload,
            pref_field=PREF,
        )


def _notify_lottery_results(session_id):
    from api.models.ballkid import Ticket, TicketSession
    from api.models.enums import TICKET_STATUS
    from api.utils.tickets import ballkid_eligible_for_tickets

    session = TicketSession.objects.filter(pk=session_id).first()
    if session is None:
        return

    tickets = Ticket.objects.filter(
        ticket_session=session,
        status__in=(TICKET_STATUS.CONFIRMED, TICKET_STATUS.WAITLIST),
    ).select_related("ballkid", "ballkid__user")

    per_user = {}
    for ticket in tickets:
        ballkid = ticket.ballkid
        if ballkid is None or not ballkid.user_id:
            continue
        if not ballkid_eligible_for_tickets(ballkid):
            continue
        info = per_user.setdefault(ballkid.user, {"granted": 0, "waitlisted": False})
        if ticket.status == TICKET_STATUS.CONFIRMED:
            info["granted"] += ticket.num_granted or 0
        else:
            info["waitlisted"] = True

    date_label = f"{session.ticket_date.strftime('%A, %B')} {session.ticket_date.day}"
    for user, info in per_user.items():
        if info["granted"]:
            noun = "ticket" if info["granted"] == 1 else "tickets"
            body = f"You're confirmed for {info['granted']} {noun} for {date_label}."
            if info["waitlisted"]:
                body += " You're waitlisted for another session."
        else:
            body = (
                f"You're on the waitlist for {date_label}. "
                "We'll notify you if a spot opens up."
            )
        payload = {
            "title": "Your ticket results are in",
            "body": body,
            "url": "/tickets",
            "tag": f"ticket-results-{session.id}",
        }
        deliver_push(
            user, "ticket_results", f"results-{session.id}", payload, pref_field=PREF
        )


# ------------------------------------------------------------ installation

_installed = False


def install():
    global _installed
    if _installed:
        return
    _installed = True

    from api.models.ballkid import Ticket, TicketSession

    post_init.connect(_ticket_init, sender=Ticket, dispatch_uid="push_ticket_init")
    post_save.connect(_ticket_saved, sender=Ticket, dispatch_uid="push_ticket_saved")
    post_init.connect(
        _session_init, sender=TicketSession, dispatch_uid="push_session_init"
    )
    post_save.connect(
        _session_saved, sender=TicketSession, dispatch_uid="push_session_saved"
    )