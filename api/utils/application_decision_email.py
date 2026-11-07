"""
Emails sent to applicants after they apply:

    accepted            status set to Accepted
    waitlisted          status set to Waitlisted
    rejected            status set to Rejected
    waitlist_promoted   moved from the waitlist to Accepted
    tryout_reminder     first-timers, shortly before their tryout

Design notes (same approach as application_email.py):
- Every send is claimed in ApplicationEmailLog *before* sending and the claim
  is removed if the send fails, so nobody gets the same email twice.
- Nothing here raises; failures are logged and reported as "failed".
- The chairperson toggle ApplicationSettings.send_confirmation_emails turns
  all applicant emails off (confirmations, decisions and reminders).
- The applicant's "additional email" is copied, like the confirmation email.
"""

import logging
import threading
from datetime import date, timedelta
from email.mime.image import MIMEImage

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db import close_old_connections
from django.template.loader import render_to_string

from api.models.application import ApplicationSettings, BallcrewApplication
from api.models.application_email_log import ApplicationEmailLog
from api.models.schedule import Tournament
from api.serializers_application import get_tryout_slot_info
from api.utils.application_email import _slot_text
from api.utils.ticket_emails import LOGO_CID, ticket_logo_path

logger = logging.getLogger("api.utils.application_email")

STATUS_TO_KIND = {
    "accepted": "accepted",
    "waitlisted": "waitlisted",
    "rejected": "rejected",
}

_reminder_lock = threading.Lock()


def reminders_in_progress():
    return _reminder_lock.locked()


def applicant_emails_enabled():
    return ApplicationSettings.get_solo().send_confirmation_emails


def build_content(kind, application, slots):
    """Returns (subject, heading, paragraphs, cta) or None if there is nothing
    sensible to send (e.g. a reminder for someone with no tryout slot).
    cta is (label, url) or None."""
    a = application
    site = settings.SITE_NAME
    handbook = (
        "Read the handbook",
        f"{settings.SITE_BASE_URL}/handbook",
    )
    hi = f"Hi {a.first_name},"

    if kind == "accepted":
        return (
            f"You're on the ball crew — {site}",
            "Welcome to the ball crew",
            [
                hi,
                f"Congratulations! We're excited to offer you a spot on the {site} ball crew.",
                "We'll follow up by email with your schedule and next steps once teams are set. If you're no longer able to take your spot, please reply to this email as soon as you can so we can offer it to someone else.",
            ],
            handbook,
        )

    if kind == "waitlist_promoted":
        return (
            f"A spot opened up — {site}",
            "A spot opened up for you",
            [
                hi,
                f"Good news: a spot has opened on the {site} ball crew and we'd like to offer it to you, since you were on our waitlist.",
                "Please reply to this email to confirm you can still take the spot. We'll follow up with your schedule and next steps.",
            ],
            handbook,
        )

    if kind == "waitlisted":
        return (
            f"Your application status — {site}",
            "You're on our waitlist",
            [
                hi,
                f"Thank you for applying to the {site} ball crew. We had a lot of strong applicants, and we've placed you on our waitlist.",
                "If a spot opens up we'll email you right away. If your plans change and you'd like to be taken off the list, just reply to this email.",
            ],
            None,
        )

    if kind == "rejected":
        return (
            f"Your application status — {site}",
            "Thank you for applying",
            [
                hi,
                f"Thank you for applying to the {site} ball crew. We had many more strong applicants than spots this year, and unfortunately we aren't able to offer you a place.",
                "We really appreciate your interest and hope you'll apply again next year.",
            ],
            None,
        )

    if kind == "tryout_reminder":
        slot = next((s for s in slots if s["value"] == a.tryout_date), None)
        if slot is None:
            return None
        return (
            f"Tryout reminder — {site}",
            "Your tryout is coming up",
            [
                hi,
                f"A reminder that you're signed up for: {_slot_text(slot)}.",
                "Tryouts are required for first-time ball crew. If you can't make it, please reply to this email right away.",
            ],
            handbook,
        )

    return None


def _send_message(application, subject, heading, paragraphs, cta, connection=None):
    a = application
    context = {
        "heading": heading,
        "paragraphs": paragraphs,
        "cta_label": cta[0] if cta else "",
        "cta_url": cta[1] if cta else "",
        "site_name": settings.SITE_NAME,
        "logo_url": f"cid:{LOGO_CID}",
    }
    html = render_to_string("email/applications/message.html", context)

    lines = list(paragraphs)
    if cta:
        lines.append(f"{cta[0]}: {cta[1]}")
    lines.append(settings.SITE_NAME)
    text = "\n\n".join(lines)

    cc = []
    extra = (a.additional_email or "").strip()
    if extra and extra.lower() != a.email.lower():
        cc.append(extra)

    message = EmailMultiAlternatives(
        subject,
        text,
        to=[a.email],
        cc=cc,
        reply_to=[settings.SUPPORT_EMAIL],
        connection=connection,
    )
    message.mixed_subtype = "related"
    message.attach_alternative(html, "text/html")

    logo_path = ticket_logo_path()
    if logo_path.is_file():
        with logo_path.open("rb") as logo_file:
            image = MIMEImage(logo_file.read(), _subtype="png")
        image.add_header("Content-ID", f"<{LOGO_CID}>")
        image.add_header(
            "Content-Disposition", "inline", filename="mubadala-dc-open-crest.png"
        )
        message.attach(image)

    message.send(fail_silently=False)


def send_application_email(application_id, kind, slots=None, connection=None):
    """Sends one applicant email. Returns "sent", "skipped" (already sent, or
    nothing to send), "off" (emails switched off) or "failed". Never raises."""
    claim = None
    try:
        if not applicant_emails_enabled():
            return "off"

        application = BallcrewApplication.objects.get(pk=application_id)
        if not application.email:
            return "skipped"

        if slots is None:
            slots = get_tryout_slot_info()
        content = build_content(kind, application, slots)
        if content is None:
            return "skipped"

        claim, created = ApplicationEmailLog.objects.get_or_create(
            application=application, kind=kind
        )
        if not created:
            claim = None  # someone else owns it; don't delete it on failure
            return "skipped"

        subject, heading, paragraphs, cta = content
        _send_message(
            application, subject, heading, paragraphs, cta, connection=connection
        )
        logger.info(f"Sent {kind} email for application {application_id}")
        return "sent"
    except Exception:
        if claim is not None:
            claim.delete()  # undo the claim so it can be retried
        logger.exception(f"Could not send {kind} email for application {application_id}")
        return "failed"


def _send_in_thread(application_id, kind):
    try:
        send_application_email(application_id, kind)
    finally:
        # This runs in its own thread; don't leave its DB connection open.
        close_old_connections()


def send_application_email_async(application_id, kind):
    threading.Thread(
        target=_send_in_thread, args=(application_id, kind), daemon=True
    ).start()


# ---------------------------------------------------------------------------
# Tryout reminders
# ---------------------------------------------------------------------------


def tryout_reminder_candidates(days_ahead=2, today=None):
    """First-time applicants (not rejected, this season) whose tryout falls
    within the next `days_ahead` days and who haven't been reminded yet."""
    today = today or date.today()
    horizon = today + timedelta(days=days_ahead)

    upcoming = {
        slot["value"]
        for slot in get_tryout_slot_info()
        if slot["date"] and today <= date.fromisoformat(slot["date"]) <= horizon
    }
    if not upcoming:
        return []

    applications = (
        BallcrewApplication.objects.filter(
            is_veteran=False, tryout_date__in=upcoming
        )
        .exclude(status="rejected")
        .exclude(email_logs__kind="tryout_reminder")
    )
    tournament = Tournament.objects.order_by("-year").first()
    if tournament:
        applications = applications.filter(submitted_at__year=tournament.year)
    return list(applications)


def send_tryout_reminders(days_ahead=2):
    """Sends every due reminder over one SMTP connection. Returns
    {"sent", "failed", "skipped"}, or None if a run is already in progress."""
    if not _reminder_lock.acquire(blocking=False):
        return None
    connection = None
    try:
        counts = {"sent": 0, "failed": 0, "skipped": 0}
        if not applicant_emails_enabled():
            return counts

        candidates = tryout_reminder_candidates(days_ahead)
        if not candidates:
            return counts

        slots = get_tryout_slot_info()
        connection = get_connection(fail_silently=False)
        connection.open()
        for application in candidates:
            outcome = send_application_email(
                application.pk, "tryout_reminder", slots=slots, connection=connection
            )
            counts["sent" if outcome == "sent" else "failed" if outcome == "failed" else "skipped"] += 1
        logger.info(f"Tryout reminders: {counts}")
        return counts
    except Exception:
        logger.exception("Tryout reminder run failed")
        return {"sent": 0, "failed": 0, "skipped": 0}
    finally:
        if connection is not None:
            try:
                connection.close()
            except Exception:
                pass
        _reminder_lock.release()


def _run_reminders_in_thread(days_ahead):
    try:
        send_tryout_reminders(days_ahead)
    finally:
        close_old_connections()


def send_tryout_reminders_async(days_ahead=2):
    threading.Thread(
        target=_run_reminders_in_thread, args=(days_ahead,), daemon=True
    ).start()
