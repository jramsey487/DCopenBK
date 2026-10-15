"""
Confirmation email sent to an applicant right after they submit the public
ballcrew application form, containing a copy of what they submitted.

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
from django.core.mail import EmailMultiAlternatives
from django.db import close_old_connections
from django.utils.html import escape

from api.models.application import (
    ApplicationSettings,
    BallcrewApplication,
    TOURNAMENT_DAYS,
)
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


def build_confirmation(application, start_date, slots, site_name, handbook_url):
    """Returns (subject, plain_text, html) for the confirmation email."""
    a = application
    sections = build_sections(a, start_date, slots)
    slot_by_value = {s["value"]: s for s in slots}

    if a.is_veteran:
        note = (
            "Tryouts aren't required for returning ball crew, but they're "
            "highly encouraged."
        )
    else:
        slot = slot_by_value.get(a.tryout_date)
        note = (
            f"You're signed up for: {_slot_text(slot)}. Tryouts are required "
            "for first-time ball crew."
            if slot
            else "Tryouts are required for first-time ball crew."
        )

    intro = (
        f"Hi {a.first_name}, thanks for applying to the {site_name}! "
        "We've received your application. Here's a copy of what you submitted."
    )
    outro = (
        f"New to ball crew, or want a refresher? The handbook is here: {handbook_url}\n"
        "If anything above is wrong or you have questions, just reply to this email."
    )

    subject = f"We received your application — {site_name}"

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
        "If anything above is wrong or you have questions, just reply to this email.</p>"
    )
    html_parts.append("</div>")

    return subject, text, "".join(html_parts)


def send_application_confirmation(application_id):
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
        logger.info(f"Sent application confirmation for application {application_id}")
    except Exception:
        logger.exception(
            f"Could not send application confirmation for application {application_id}"
        )
    finally:
        # This runs in its own thread; don't leave its DB connection open.
        close_old_connections()


def send_application_confirmation_async(application_id):
    threading.Thread(
        target=send_application_confirmation, args=(application_id,), daemon=True
    ).start()
