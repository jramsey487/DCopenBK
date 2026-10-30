"""
Emails each captain/chairperson the crew feedback written about them.

Safety rules:
- Someone with fewer than MIN_FEEDBACK_FOR_EMAIL pieces of feedback is held
  back (with very few raters, a comment is easy to trace to its author).
- A rater's name only appears if that rating opted in (share_name).
- Dates are left out and the order of comments is shuffled, so neither
  timing nor submission order can help identify anyone.
- A CaptainFeedbackEmail row is created *before* sending and removed if the
  send fails, so nobody is emailed twice, even across overlapping runs.
"""

import logging
import random
import threading

from django.db import close_old_connections
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from api.models.ballkid import Ballkid
from api.models.captain_rating import CaptainFeedbackEmail, CaptainRating
from api.utils.ticket_emails import (
    _deliver_html_email,
    ticket_login_url,
    ticket_logo_url_for_send,
)

logger = logging.getLogger("api.utils.captain_feedback")

MIN_FEEDBACK_FOR_EMAIL = 3  # pieces of feedback needed before anything is emailed
MIN_STARS_FOR_AVERAGE = 3  # star ratings needed before an average is shown

_send_lock = threading.Lock()


def feedback_send_in_progress():
    return _send_lock.locked()


def _fmt_rating(value):
    if value is None:
        return ""
    value = float(value)
    return str(int(value)) if value.is_integer() else f"{value:.1f}"


def _email_for(captain):
    if captain.user_id and captain.user and captain.user.email:
        return captain.user.email.strip()
    return ""


def collect_feedback(year):
    """One row per captain/chairperson who received feedback this year."""
    grouped = {}
    for rating in CaptainRating.objects.filter(year=year).select_related("rater"):
        grouped.setdefault(rating.captain_id, []).append(rating)

    captains = (
        Ballkid.objects.filter(id__in=list(grouped.keys()))
        .select_related("user")
        .order_by("last_name", "first_name")
    )
    sent = {s.captain_id: s for s in CaptainFeedbackEmail.objects.filter(year=year)}

    rows = []
    for captain in captains:
        ratings = grouped[captain.id]
        email = _email_for(captain)
        if captain.id in sent:
            status_value = "sent"
        elif len(ratings) < MIN_FEEDBACK_FOR_EMAIL:
            status_value = "held_back"
        elif not email:
            status_value = "no_email"
        else:
            status_value = "ready"
        rows.append(
            {
                "captain": captain,
                "ratings": ratings,
                "email": email,
                "status": status_value,
                "sent_at": sent[captain.id].sent_at if captain.id in sent else None,
            }
        )
    return rows


def feedback_email_status(year):
    """Payload for the chairperson table."""
    counts = {"ready": 0, "sent": 0, "held_back": 0, "no_email": 0}
    payload = []
    for row in collect_feedback(year):
        counts[row["status"]] += 1
        payload.append(
            {
                "captain": row["captain"].id,
                "name": row["captain"].get_name(),
                "feedback_count": len(row["ratings"]),
                "status": row["status"],
                "sent_at": row["sent_at"].isoformat() if row["sent_at"] else None,
            }
        )
    return {
        "year": year,
        "min_required": MIN_FEEDBACK_FOR_EMAIL,
        "sending": feedback_send_in_progress(),
        **counts,
        "rows": payload,
    }


def build_context(captain, ratings, year, subject):
    context_labels = dict(CaptainRating.Context.choices)
    stars = [r.rating for r in ratings if r.rating is not None]

    average_display = None
    if len(stars) >= MIN_STARS_FOR_AVERAGE:
        average_display = f"{sum(stars) / len(stars):.2f}"

    entries = [
        {
            "rating_display": _fmt_rating(r.rating),
            "context": context_labels.get(r.context, "") if r.context else "",
            "rater_name": r.rater.get_name() if r.share_name else "",
            "comments": r.comments,
        }
        for r in ratings
    ]
    random.shuffle(entries)

    return {
        "recipient_name": captain.first_name,
        "year": year,
        "email_title": subject,
        "logo_url": ticket_logo_url_for_send(),
        "login_url": ticket_login_url(),
        "feedback_count": len(ratings),
        "star_count": len(stars),
        "min_stars": MIN_STARS_FOR_AVERAGE,
        "average_display": average_display,
        "entries": entries,
    }


def _send_one(row, year):
    """Returns "sent", "skipped" (someone else already claimed it) or "failed"."""
    captain = row["captain"]
    claim, created = CaptainFeedbackEmail.objects.get_or_create(
        year=year, captain=captain, defaults={"rating_count": len(row["ratings"])}
    )
    if not created:
        return "skipped"

    try:
        subject = f"Your crew feedback — Mubadala DC Open Ballcrew {year}"
        html = render_to_string(
            "email/tickets/captain_feedback.html",
            build_context(captain, row["ratings"], year, subject),
        )
        _deliver_html_email(row["email"], subject, html, strip_tags(html))
        return "sent"
    except Exception:
        claim.delete()  # undo the claim so a later run can retry
        logger.exception("Could not email crew feedback to captain %s", captain.id)
        return "failed"


def send_feedback_emails(year):
    """
    Emails everyone who is ready. Returns {"sent": n, "failed": n}, or None if
    another run is already in progress on this machine.
    """
    if not _send_lock.acquire(blocking=False):
        return None
    try:
        sent = failed = 0
        for row in collect_feedback(year):
            if row["status"] != "ready":
                continue
            outcome = _send_one(row, year)
            if outcome == "sent":
                sent += 1
            elif outcome == "failed":
                failed += 1
        logger.info("Crew feedback emails for %s: %s sent, %s failed", year, sent, failed)
        return {"sent": sent, "failed": failed}
    finally:
        _send_lock.release()


def _run_in_thread(year):
    try:
        send_feedback_emails(year)
    except Exception:
        logger.exception("Crew feedback email run failed")
    finally:
        close_old_connections()


def send_feedback_emails_async(year):
    threading.Thread(target=_run_in_thread, args=(year,), daemon=True).start()
