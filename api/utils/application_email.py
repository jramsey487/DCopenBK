"""
Confirmation email sent to an applicant right after they submit the public
ballcrew application form (and again after they edit it), containing a copy
of what they submitted and their personal edit link.

Design notes:
- Sent from a background thread after the response is already on its way, so
  a slow or failing mail server never delays or breaks a submission.
- Any failure is logged (see the "api.utils" logger in settings.py) and
  swallowed -- the application itself is already saved.
- Chairpersons can switch confirmations off from the review dashboard
  (ApplicationSettings.send_confirmation_emails).
- Dates are computed from the current Tournament, same as the public form.
"""

import logging
import threading
from datetime import date, timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db import close_old_connections
from django.utils import timezone
from django.utils.html import escape

from api.models.application import (
    ApplicationInterest,
    ApplicationSettings,
    BallcrewApplication,
    TOURNAMENT_DAYS,
)
from api.models.schedule import Tournament
from api.serializers_application import (
    get_tournament_start_date,
    get_tryout_slot_info,
)

logger = logging.getLogger("api.utils.application_email")

_WEEKDAY = {
    "sat_1": "Saturday",
    "sun_1": "Sunday",
    "mon": "Monday",
    "tue": "Tuesday",
    "wed": "Wednesday",
    "thu": "Thursday",
    "fri": "Friday",
    "sat_2": "Saturday",
    "sun_2": "Sunday",
}


def _day_label(key, start_date):
    """'Saturday, July 25' for a semantic day key, given the tournament's
    first Saturday. Just the weekday if the start date isn't known."""
    weekday = _WEEKDAY.get(key, str(key))
    if not start_date or key not in TOURNAMENT_DAYS:
        return weekday
    day = start_date + timedelta(days=TOURNAMENT_DAYS.index(key))
    return f"{weekday}, {day:%B} {day.day}"


def _slot_text(slot):
    """'First tryout date: Saturday, June 6 at Banneker Tennis Courts'."""
    text = slot["label"]
    if slot.get("date"):
        d = date.fromisoformat(slot["date"])
        text += f": {d:%A}, {d:%B} {d.day}"
    if slot.get("location"):
        text += f" at {slot['location']}"
    return text


def _yes_no(value):
    if value is None:
        return ""
    return "Yes" if value else "No"


def build_sections(application, start_date, slots):
    """Returns [(section title, [(label, value), ...]), ...] with blank
    answers left out. `slots` is get_tryout_slot_info()'s result."""
    slot_by_value = {s["value"]: s for s in slots}
    a = application

    dob = a.date_of_birth
    basic = [
        ("Name", a.full_name),
        ("Email", a.email),
        ("Additional email", a.additional_email),
        ("Gender", a.get_gender_display()),
        ("Date of birth", f"{dob:%B} {dob.day}, {dob.year}" if dob else ""),
        ("State", a.state),
        ("Phone", a.phone),
    ]
    emergency = [
        ("Name", a.emergency_contact_name),
        ("Relationship", a.emergency_contact_relationship),
        ("Phone", a.emergency_contact_phone),
    ]
    sizing = [
        ("T-shirt", a.get_tshirt_size_display()),
        ("Shorts", a.get_shorts_size_display()),
        ("Shoe", a.shoe_size),
    ]
    about = [
        ("Why you want to be on ball crew", a.motivation),
        ("Vegetarian", _yes_no(a.is_vegetarian)),
        ("Fun fact", a.fun_fact),
        ("Traveling / applying with", a.traveling_with_names),
    ]

    sections = [
        ("Basic information", basic),
        ("Emergency contact", emergency),
        ("Sizing", sizing),
        ("About you", about),
    ]

    if a.is_veteran:
        help_slots = [
            _slot_text(slot_by_value[v])
            for v in (a.tryout_help_availability or [])
            if v in slot_by_value
        ]
        end_days = [_day_label(d, start_date) for d in (a.availability_days or [])]
        sections.append(
            (
                "Returning ball crew",
                [
                    ("Years of experience", a.years_experience),
                    ("Position", a.get_position_display() if a.position else ""),
                    (
                        "Likelihood you'll volunteer",
                        a.get_likelihood_display() if a.likelihood else "",
                    ),
                    ("Updated headshot", "Uploaded" if a.headshot_update else ""),
                    ("Tryouts you can help at", "\n".join(help_slots)),
                    (
                        "Sunday / Monday",
                        a.get_veteran_sunday_or_monday_display()
                        if a.veteran_sunday_or_monday
                        else "",
                    ),
                    (
                        "Wednesday / Thursday",
                        a.get_veteran_wed_thu_choice_display()
                        if a.veteran_wed_thu_choice
                        else "",
                    ),
                    ("End of tournament", "\n".join(end_days)),
                ],
            )
        )
    else:
        slot = slot_by_value.get(a.tryout_date)
        days = [_day_label(d, start_date) for d in (a.availability_days or [])]
        sections.append(
            (
                "First-time applicant",
                [
                    ("Tried out with us before", _yes_no(a.has_tried_out_before)),
                    ("Prior ball crew experience", a.prior_experience),
                    ("Your tryout", _slot_text(slot) if slot else ""),
                    ("Headshot", "Uploaded" if a.headshot else ""),
                    ("Days you're available", "\n".join(days)),
                ],
            )
        )

    sections.append(
        (
            "Waiver",
            [
                ("Signed by", a.waiver_signature_name),
                ("Parent / guardian", a.parent_signature_name),
            ],
        )
    )

    cleaned = []
    for title, rows in sections:
        rows = [(label, str(value)) for label, value in rows if value not in (None, "")]
        if rows:
            cleaned.append((title, rows))
    return cleaned


def build_confirmation(
    application,
    start_date,
    slots,
    site_name,
    handbook_url,
    edit_url=None,
    updated=False,
):
    """Returns (subject, plain_text, html) for the confirmation email.

    edit_url: the applicant's personal edit link; included when provided.
    updated: True for the email sent after an applicant edits, which
    changes the wording but otherwise sends the same copy of their answers.
    """
    a = application
    sections = build_sections(a, start_date, slots)
    slot_by_value = {s["value"]: s for s in slots}

    if a.is_veteran:
        note = (
            "Tryouts aren't required for returning ball crew, but they're "
            "highly encouraged to teach the next generation."
        )
    else:
        slot = slot_by_value.get(a.tryout_date)
        note = (
            f"You're signed up for: {_slot_text(slot)}. Tryouts are required "
            "for first-time ball crew."
            if slot
            else "Tryouts are required for first-time ball crew."
        )

    if updated:
        intro = (
            f"Hi {a.first_name}, your {site_name} application has been "
            "updated. Here's a copy of what we have on file now."
        )
        subject = f"Your application was updated — {site_name}"
    else:
        intro = (
            f"Hi {a.first_name}, thanks for applying to the {site_name}! "
            "We've received your application. Here's a copy of what you submitted."
        )
        subject = f"We received your application — {site_name}"

    edit_line = (
        f"Need to change something? You can edit your application until it's "
        f"reviewed or the tournament starts, using your personal link (keep it "
        f"private): {edit_url}\n"
        if edit_url
        else ""
    )
    outro = (
        f"New to ball crew, or want a refresher? The handbook is here: {handbook_url}\n"
        f"{edit_line}"
        "If anything else comes up, just reply to this email."
    )

    # Plain text
    lines = [intro, "", note, ""]
    for title, rows in sections:
        lines.append(title.upper())
        for label, value in rows:
            if "\n" in value:
                lines.append(f"{label}:")
                lines.extend(f"  {v}" for v in value.split("\n"))
            else:
                lines.append(f"{label}: {value}")
        lines.append("")
    lines.append(outro)
    text = "\n".join(lines)

    # HTML
    def cell(value):
        return escape(value).replace("\n", "<br>")

    html_parts = [
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a2233;max-width:640px">',
        f"<p>{escape(intro)}</p>",
        f"<p><strong>{escape(note)}</strong></p>",
    ]
    if edit_url:
        html_parts.append(
            '<p style="margin:16px 0">'
            f'<a href="{escape(edit_url)}" style="display:inline-block;padding:10px 16px;'
            'background:#0d1b3e;color:#ffffff;text-decoration:none;border-radius:6px;'
            'font-weight:600">Edit your application</a><br>'
            '<span style="font-size:12px;color:#556">Available until your application '
            "is reviewed or the tournament starts. This link is personal to you -- "
            "please don't share it.</span></p>"
        )
    for title, rows in sections:
        html_parts.append(
            f'<h3 style="margin:20px 0 6px;font-size:15px;color:#0b1b3f">{escape(title)}</h3>'
        )
        html_parts.append('<table style="border-collapse:collapse;width:100%">')
        for label, value in rows:
            html_parts.append(
                '<tr>'
                f'<td style="padding:4px 12px 4px 0;vertical-align:top;color:#556;width:38%">{escape(label)}</td>'
                f'<td style="padding:4px 0;vertical-align:top">{cell(value)}</td>'
                "</tr>"
            )
        html_parts.append("</table>")
    html_parts.append(
        f'<p style="margin-top:24px">New to ball crew, or want a refresher? '
        f'<a href="{escape(handbook_url)}">Read the handbook</a>.<br>'
        "If anything else comes up, just reply to this email.</p>"
    )
    html_parts.append("</div>")

    return subject, text, "".join(html_parts)


def send_application_confirmation(application_id, updated=False):
    """Builds and sends the confirmation for one application. Never raises."""
    try:
        if not ApplicationSettings.get_solo().send_confirmation_emails:
            return

        application = BallcrewApplication.objects.get(pk=application_id)
        subject, text, html = build_confirmation(
            application,
            get_tournament_start_date(),
            get_tryout_slot_info(),
            settings.SITE_NAME,
            f"{settings.SITE_BASE_URL}/handbook",
            edit_url=f"{settings.SITE_BASE_URL}/apply?edit={application.edit_token}",
            updated=updated,
        )

        cc = []
        extra = (application.additional_email or "").strip()
        if extra and extra.lower() != application.email.lower():
            cc.append(extra)

        message = EmailMultiAlternatives(
            subject,
            text,
            to=[application.email],
            cc=cc,
            reply_to=[settings.SUPPORT_EMAIL],
        )
        message.attach_alternative(html, "text/html")
        message.send(fail_silently=False)
        logger.info(
            f"Sent application {'update ' if updated else ''}confirmation "
            f"for application {application_id}"
        )
    except Exception:
        logger.exception(
            f"Could not send application confirmation for application {application_id}"
        )
    finally:
        # This runs in its own thread; don't leave its DB connection open.
        close_old_connections()


def send_application_confirmation_async(application_id, updated=False):
    threading.Thread(
        target=send_application_confirmation,
        args=(application_id, updated),
        daemon=True,
    ).start()

# ---------------------------------------------------------------------------
# Interest list: "email me when applications open"
# ---------------------------------------------------------------------------

# Gmail's SMTP limit is roughly 500 messages a day, shared with every other
# email the app sends, so one click never sends more than this. Anyone left
# over stays "not yet emailed" and goes out the next time the button is used.
INTEREST_BATCH_LIMIT = 400
_MAX_CONSECUTIVE_FAILURES = 5

_interest_lock = threading.Lock()


def interest_send_in_progress():
    return _interest_lock.locked()


def pending_interest_entries():
    """Interest-list people who haven't been emailed yet, leaving out anyone
    who has already submitted an application this season (they don't need
    the link)."""
    applications = BallcrewApplication.objects.all()
    tournament = Tournament.objects.order_by("-year").first()
    if tournament:
        applications = applications.filter(submitted_at__year=tournament.year)
    applied = {e.strip().lower() for e in applications.values_list("email", flat=True)}
    return [
        entry
        for entry in ApplicationInterest.objects.filter(last_notified_at__isnull=True)
        if entry.email.lower() not in applied
    ]


def build_interest_email(first_name, site_name, apply_url, handbook_url):
    """Returns (subject, plain_text, html) for the "applications are open" email."""
    greeting = f"Hi {first_name}," if first_name else "Hi,"
    subject = f"Ball crew applications are open — {site_name}"
    body = (
        "You asked us to let you know when ball crew applications open -- "
        "they're open now!"
    )
    text = "\n".join(
        [
            greeting,
            "",
            body,
            "",
            f"Apply here: {apply_url}",
            f"Ball crew handbook: {handbook_url}",
            "",
            site_name,
        ]
    )
    html = (
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a2233;max-width:560px">'
        f"<p>{escape(greeting)}</p>"
        f"<p>{escape(body)}</p>"
        f'<p><a href="{escape(apply_url)}" style="display:inline-block;padding:10px 18px;'
        'background:#0b1b3f;color:#fff;text-decoration:none;border-radius:4px">'
        "Apply now</a></p>"
        f'<p>New to ball crew? <a href="{escape(handbook_url)}">Read the handbook</a>.</p>'
        f"<p>{escape(site_name)}</p></div>"
    )
    return subject, text, html


def send_interest_notifications(limit=INTEREST_BATCH_LIMIT):
    """Emails the application link to people on the interest list who haven't
    been emailed yet, up to `limit`. Meant to run in a background thread;
    never raises. Each person is marked as emailed *before* sending so two
    overlapping runs can't double-send, and the mark is undone if their send
    fails."""
    if not _interest_lock.acquire(blocking=False):
        return  # a run is already in progress on this machine
    connection = None
    try:
        entries = pending_interest_entries()[:limit]
        if not entries:
            return

        apply_url = f"{settings.SITE_BASE_URL}/apply"
        handbook_url = f"{settings.SITE_BASE_URL}/handbook"
        connection = get_connection(fail_silently=False)
        connection.open()

        sent = failures = consecutive = 0
        for entry in entries:
            claimed = ApplicationInterest.objects.filter(
                pk=entry.pk, last_notified_at__isnull=True
            ).update(last_notified_at=timezone.now())
            if not claimed:
                continue  # another run already handled this person
            try:
                subject, text, html = build_interest_email(
                    entry.first_name, settings.SITE_NAME, apply_url, handbook_url
                )
                message = EmailMultiAlternatives(
                    subject,
                    text,
                    to=[entry.email],
                    reply_to=[settings.SUPPORT_EMAIL],
                    connection=connection,
                )
                message.attach_alternative(html, "text/html")
                message.send(fail_silently=False)
                sent += 1
                consecutive = 0
            except Exception:
                ApplicationInterest.objects.filter(pk=entry.pk).update(
                    last_notified_at=None
                )
                failures += 1
                consecutive += 1
                logger.exception(f"Could not email interest-list entry {entry.pk}")
                if consecutive >= _MAX_CONSECUTIVE_FAILURES:
                    logger.error(
                        "Stopping interest-list send after repeated failures "
                        "(check the mail login or Gmail's daily limit)."
                    )
                    break
        logger.info(f"Interest-list send finished: {sent} sent, {failures} failed")
    except Exception:
        logger.exception("Interest-list send failed")
    finally:
        if connection is not None:
            try:
                connection.close()
            except Exception:
                pass
        _interest_lock.release()
        close_old_connections()


def send_interest_notifications_async(limit=INTEREST_BATCH_LIMIT):
    threading.Thread(
        target=send_interest_notifications, args=(limit,), daemon=True
    ).start()

