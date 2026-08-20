"""Render and send DC Open Ballcrew ticket notification emails."""

from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from email.mime.image import MIMEImage

from api.utils.consts import TICKET_LIMIT
from api.utils.tickets import (
    as_et,
    option_label,
    remaining_tickets,
    winner_confirm_by,
)

TEMPLATE_DIR = "email/tickets"
LOGO_CID = "crest-logo"


def ticket_logo_path():
    return Path(settings.BASE_DIR) / "api/static/email/mubadala-dc-open-crest.png"


def ticket_logo_url():
    base = getattr(settings, "SITE_BASE_URL", "https://dcopenbk.fly.dev").rstrip("/")
    return f"{base}/static/email/mubadala-dc-open-crest.png"


def ticket_logo_url_for_send():
    """Inline CID reference - image is attached to the outgoing message."""
    return f"cid:{LOGO_CID}"


def ticket_login_url():
    return getattr(settings, "SITE_BASE_URL", "https://dcopenbk.fly.dev").rstrip("/") + "/"


def ticket_cta_url():
    return ticket_login_url() + "tickets"


def _period_phrase(period):
    if period == "day":
        return "Day session"
    if period == "night":
        return "Night session"
    return "All day session"


def _session_date_display(option, session=None):
    ticket_date = option.ticket_date if option else (session.ticket_date if session else None)
    if ticket_date is None:
        return ""
    return ticket_date.strftime("%A, %B %-d")


def _session_display(option, session=None):
    """Canonical session line: Sunday, August 2 · Session 1 (Day session)."""
    ticket_date = _session_date_display(option, session)
    if option is None:
        return ticket_date
    period = _period_phrase(option.period or "")
    return f"{ticket_date} · Session {option.session_number} ({period})"


def _format_deadline_long(dt):
    local = as_et(dt)
    return local.strftime("%-I:%M %p ET on %A, %B %-d")


def _format_deadline_short(dt):
    local = as_et(dt)
    return local.strftime("%-I:%M %p ET")


def _tickets_remaining_display(ballkid):
    remaining = remaining_tickets(ballkid)
    return f"{remaining} of {TICKET_LIMIT}"


def round_live_context(ballkid, session, options):
    """Context for the round-live email, including every session option on the round."""
    options = list(options)
    primary = options[0] if options else None
    displays = [_session_display(opt, session) for opt in options]
    ctx = base_context(ballkid, session, primary)
    date_suffix = _session_date_display(primary, session)
    ctx["session_displays"] = displays
    # Subject + intro always use the date so 1-session and multi-session match.
    ctx["session_subject_suffix"] = date_suffix
    ctx["session_date_display"] = date_suffix
    if displays:
        ctx["session_display"] = displays[0]
        ctx["session_detail_display"] = displays[0]
    return ctx


def _outcome_rows(session, tickets):
    rows = []
    for ticket in tickets:
        rows.append(
            {
                "status": ticket.status,
                "session_display": _session_display(ticket.ticket_option, session),
                "ticket_count": ticket.num_granted or 0,
                "num_requested": ticket.num_requested or 0,
            }
        )
    return rows


def lottery_results_context(ballkid, session, tickets):
    tickets = list(tickets)
    primary = tickets[0].ticket_option if tickets else None
    ctx = base_context(ballkid, session, primary)
    outcomes = _outcome_rows(session, tickets)
    date_suffix = _session_date_display(primary, session)
    ctx["outcomes"] = outcomes
    ctx["has_confirmed"] = any(row["status"] == "confirmed" for row in outcomes)
    ctx["has_waitlist"] = any(row["status"] == "waitlist" for row in outcomes)
    ctx["session_subject_suffix"] = date_suffix
    ctx["session_date_display"] = date_suffix
    ctx["email_title"] = f"Ticket results - {date_suffix}"
    return ctx


def denied_digest_context(ballkid, session, tickets):
    tickets = list(tickets)
    primary = tickets[0].ticket_option if tickets else None
    ctx = base_context(ballkid, session, primary)
    outcomes = _outcome_rows(session, tickets)
    for row in outcomes:
        row["status"] = "denied"
    date_suffix = _session_date_display(primary, session)
    ctx["outcomes"] = outcomes
    ctx["has_confirmed"] = False
    ctx["has_waitlist"] = False
    ctx["session_subject_suffix"] = date_suffix
    ctx["session_date_display"] = date_suffix
    ctx["email_title"] = f"No tickets - {date_suffix}"
    return ctx


def base_context(ballkid, session, option=None, **extra):
    session_display = _session_display(option, session)
    ctx = {
        "recipient_name": ballkid.first_name,
        "logo_url": ticket_logo_url(),
        "login_url": ticket_login_url(),
        "cta_url": ticket_cta_url(),
        "session_display": session_display,
        "session_date_display": _session_date_display(option, session),
        "session_detail_display": session_display,
        "session_subject_suffix": session_display,
        "request_closes_display": _format_deadline_short(session.closes_at),
        "deadline_display": _format_deadline_long(session.closes_at),
        "decline_deadline_display": _format_deadline_long(winner_confirm_by(session)),
        "tickets_remaining_display": _tickets_remaining_display(ballkid),
        "tickets_remaining": remaining_tickets(ballkid),
        "ticket_limit": TICKET_LIMIT,
        "option_label": option_label(option) if option else "",
    }
    ctx.update(extra)
    return ctx


def render_ticket_email(template_name, context):
    html = render_to_string(f"{TEMPLATE_DIR}/{template_name}.html", context)
    return html


def _from_email():
    return getattr(
        settings,
        "DEFAULT_FROM_EMAIL",
        getattr(settings, "EMAIL_HOST_USER", "mubadalacitiopenballcrew@gmail.com"),
    )


def _deliver_html_email(recipient, subject, html, plain):
    """Send HTML email with the crest embedded as an inline attachment."""
    msg = EmailMultiAlternatives(subject, plain, _from_email(), [recipient])
    msg.mixed_subtype = "related"
    msg.attach_alternative(html, "text/html")

    logo_path = ticket_logo_path()
    if logo_path.is_file():
        with logo_path.open("rb") as logo_file:
            image = MIMEImage(logo_file.read(), _subtype="png")
        image.add_header("Content-ID", f"<{LOGO_CID}>")
        image.add_header("Content-Disposition", "inline", filename="mubadala-dc-open-crest.png")
        msg.attach(image)

    msg.send(fail_silently=False)


def _ballkid_email(ballkid):
    if ballkid.user_id and ballkid.user.email:
        return ballkid.user.email.strip()
    return ""


def send_ticket_html_email(ballkid, subject, template_name, context):
    recipient = _ballkid_email(ballkid)
    if not recipient:
        return False

    context = dict(context)
    context.setdefault("email_title", subject)
    context["logo_url"] = ticket_logo_url_for_send()
    html = render_ticket_email(template_name, context)
    plain = strip_tags(html)
    _deliver_html_email(recipient, subject, html, plain)
    return True


def _html_template_name(sample_name):
    if sample_name in ("confirmed_waitlist", "confirmed_partial"):
        return "confirmed"
    if sample_name == "round_live_multi":
        return "round_live"
    if sample_name in ("lottery_results_mixed", "lottery_results_waitlist"):
        return "lottery_results"
    if sample_name == "denied_digest":
        return "denied"
    return sample_name


def send_test_ticket_email(recipient, template_name, context=None):
    """Send one sample ticket email to an arbitrary address (local testing)."""
    samples = sample_contexts()
    if template_name not in samples:
        raise ValueError(
            f"Unknown template {template_name!r}. "
            f"Use: {', '.join(samples.keys())}."
        )
    context = dict(context or samples[template_name])
    html_template = _html_template_name(template_name)
    context.setdefault("email_title", "Ticket notification")
    context["logo_url"] = ticket_logo_url_for_send()
    html = render_ticket_email(html_template, context)
    plain = strip_tags(html)
    subject = context["email_title"]
    _deliver_html_email(recipient, subject, html, plain)
    return subject


def sample_contexts():
    """Sample data for local HTML previews."""

    class _Option:
        session_number = 1
        ticket_date = __import__("datetime").date(2026, 8, 2)
        period = "day"

    class _Session:
        closes_at = __import__("datetime").datetime(2026, 8, 1, 18, 0)
        winner_confirm_by = None
        ticket_date = _Option.ticket_date

    class _Ballkid:
        first_name = "Andrea"
        num_tickets = 1
        user = None

    ballkid = _Ballkid()
    session = _Session()
    option = _Option()

    shared = base_context(ballkid, session, option)
    round_live = round_live_context(ballkid, session, [option])

    class _Option2:
        session_number = 2
        ticket_date = _Option.ticket_date
        period = "night"

    round_live_multi = round_live_context(
        ballkid, session, [option, _Option2()]
    )
    date_suffix = shared["session_date_display"]
    lottery_mixed = {
        **shared,
        "session_date_display": date_suffix,
        "session_subject_suffix": date_suffix,
        "email_title": f"Ticket results - {date_suffix}",
        "has_confirmed": True,
        "has_waitlist": True,
        "outcomes": [
            {
                "status": "confirmed",
                "session_display": f"{date_suffix} · Session 1 (Day session)",
                "ticket_count": 1,
                "num_requested": 1,
            },
            {
                "status": "waitlist",
                "session_display": f"{date_suffix} · Session 2 (Night session)",
                "ticket_count": 0,
                "num_requested": 1,
            },
        ],
    }
    denied_digest = {
        **shared,
        "session_date_display": date_suffix,
        "session_subject_suffix": date_suffix,
        "email_title": f"No tickets - {date_suffix}",
        "has_confirmed": False,
        "has_waitlist": False,
        "outcomes": [
            {
                "status": "denied",
                "session_display": f"{date_suffix} · Session 1 (Day session)",
                "ticket_count": 0,
                "num_requested": 1,
            },
            {
                "status": "denied",
                "session_display": f"{date_suffix} · Session 2 (Night session)",
                "ticket_count": 0,
                "num_requested": 1,
            },
        ],
    }
    return {
        "round_live": {
            **round_live,
            "email_title": f"Ticket requests open - {round_live['session_subject_suffix']}",
        },
        "round_live_multi": {
            **round_live_multi,
            "email_title": f"Ticket requests open - {round_live_multi['session_subject_suffix']}",
        },
        "lottery_results": {
            **shared,
            "session_date_display": date_suffix,
            "session_subject_suffix": date_suffix,
            "email_title": f"Ticket results - {date_suffix}",
            "has_confirmed": True,
            "has_waitlist": False,
            "outcomes": [
                {
                    "status": "confirmed",
                    "session_display": shared["session_display"],
                    "ticket_count": 2,
                    "num_requested": 2,
                }
            ],
        },
        "lottery_results_mixed": lottery_mixed,
        "lottery_results_waitlist": {
            **shared,
            "session_date_display": date_suffix,
            "session_subject_suffix": date_suffix,
            "email_title": f"Ticket results - {date_suffix}",
            "has_confirmed": False,
            "has_waitlist": True,
            "outcomes": [
                {
                    "status": "waitlist",
                    "session_display": shared["session_display"],
                    "ticket_count": 0,
                    "num_requested": 1,
                }
            ],
        },
        "confirmed_waitlist": {
            **shared,
            "session_date_display": date_suffix,
            "session_subject_suffix": date_suffix,
            "email_title": f"You're off the waitlist - {date_suffix}",
            "ticket_count": 1,
            "num_requested": 1,
            "confirmed_source": "waitlist",
        },
        "confirmed_partial": {
            **shared,
            "session_date_display": date_suffix,
            "session_subject_suffix": date_suffix,
            "email_title": f"You're off the waitlist - {date_suffix}",
            "ticket_count": 1,
            "num_requested": 2,
            "confirmed_source": "waitlist",
        },
        "denied": {
            **shared,
            "session_date_display": date_suffix,
            "session_subject_suffix": date_suffix,
            "email_title": f"No tickets - {date_suffix}",
            "outcomes": [
                {
                    "status": "denied",
                    "session_display": shared["session_display"],
                    "ticket_count": 0,
                    "num_requested": 1,
                }
            ],
        },
        "denied_digest": denied_digest,
    }
