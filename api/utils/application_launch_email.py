"""Returning-volunteer invitation preview and resumable email delivery."""
import logging
import smtplib
import threading
from datetime import timedelta
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import close_old_connections, transaction
from django.db.models import F
from django.utils import timezone
from django.utils.html import escape
from api.models.application import ApplicationLaunchDecision, ApplicationLaunchEmailLog, ApplicationSettings
from api.models.ballkid import SeasonParticipation
from api.models.schedule import Tournament

logger = logging.getLogger("api.utils.application_launch_email")
_send_lock = threading.Lock()
_STALE_SEND_AFTER = timedelta(minutes=15)
_STALE_SEND_RETRY_NOTE = (
    "A previous email worker stopped before recording completion. "
    "Retrying may send a duplicate if the mail provider accepted the earlier attempt."
)


_MAIL_THROTTLE_MARKERS = (
    "4.7.28", "quota", "rate limit", "rate-limit", "too many messages",
    "daily limit", "sending limit", "temporarily blocked",
)


def _is_mail_provider_throttle(exc):
    """Identify provider quota/throttle responses that should stop a batch."""
    code = getattr(exc, "smtp_code", None)
    detail = " ".join(
        str(value)
        for value in (exc, getattr(exc, "smtp_error", ""))
        if value is not None
    ).lower()
    # SMTP 4xx responses are temporary; continuing to send to the same
    # provider/account is unlikely to help and may worsen its rate limiting.
    return (isinstance(code, int) and 400 <= code < 500) or any(
        marker in detail for marker in _MAIL_THROTTLE_MARKERS
    )


def launch_send_in_progress():
    return _send_lock.locked()


def _content(first_name, decision, year, tournament_dates=None):
    site = settings.SITE_NAME
    apply_url = f"{settings.SITE_BASE_URL}/apply"
    handbook_url = f"{settings.SITE_BASE_URL}/handbook"
    greeting = f"Hi {first_name}," if first_name else "Hello,"
    if decision == ApplicationLaunchDecision.DECISION_INVITE_BACK:
        subject = f"You're invited back to ball crew — {site} {year}"
        paragraphs = [
            f"We'd love to have you back on the {site} ball crew for {year}!",
            "Please submit your application using the link below so we can confirm your availability and collect this season's details.",
        ]
        button = "Apply for the upcoming season"
    elif decision == ApplicationLaunchDecision.DECISION_MUST_TRY_OUT:
        subject = f"Tryout required to apply — {site} {year}"
        paragraphs = [
            f"For the {site} ball crew in {year}, you must attend a tryout before you can be considered for a roster spot.",
            "Please submit an application to be considered. Attending a tryout does not guarantee selection.",
        ]
        button = "Submit application"
    else:
        return None
    if tournament_dates:
        paragraphs.insert(1, f"Tournament dates: {tournament_dates}")
    if decision == ApplicationLaunchDecision.DECISION_INVITE_BACK:
        paragraphs.append("Questions? Reply to this email.")
    text = "\\n\\n".join([
        greeting,
        *paragraphs,
        f"Submit application: {apply_url}",
        f"Read the handbook: {handbook_url}",
        site,
    ])
    html = (
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a2233;max-width:600px">'
        f"<p>{escape(greeting)}</p>"
        + "".join(f"<p>{escape(p).replace(chr(10), '<br>')}</p>" for p in paragraphs)
        + f'<p><a href="{escape(apply_url)}" style="display:inline-block;padding:10px 16px;background:#0b1b3f;color:#fff;text-decoration:none;border-radius:5px">{escape(button)}</a></p>'
        + f'<p><a href="{escape(handbook_url)}">Read the handbook</a></p><p>{escape(site)}</p></div>'
    )
    return subject, text, html


def _tournament_for_year(year):
    """Find the tournament by its start-date year, with legacy key fallback."""
    return (
        Tournament.objects.filter(start_date__year=year).order_by("year").first()
        or Tournament.objects.filter(year=year).first()
    )


def build_launch_preview(source_year):
    year = source_year + 1
    tournament = _tournament_for_year(year)
    tournament_dates = (
        f"{tournament.start_date.strftime('%B %d, %Y').replace(' 0', ' ')} – "
        f"{tournament.end_date.strftime('%B %d, %Y').replace(' 0', ' ')}"
        if tournament and tournament.start_date and tournament.end_date
        else None
    )
    roster = list(SeasonParticipation.objects.filter(year=source_year).select_related("ballkid", "ballkid__user").order_by("ballkid__last_name", "ballkid__first_name"))
    decisions = {d.ballkid_id: d for d in ApplicationLaunchDecision.objects.filter(year=year, source_year=source_year)}
    logs = {l.ballkid_id: l for l in ApplicationLaunchEmailLog.objects.filter(year=year, source_year=source_year, kind="returning_invitation")}
    results, undecided, missing = [], [], []
    for row in roster:
        kid = row.ballkid
        decision_row = decisions.get(kid.id)
        decision = decision_row.decision if decision_row else "undecided"
        email = (kid.user.email or "").strip() if kid.user_id else ""
        message = _content(kid.first_name, decision, year, tournament_dates)
        log = logs.get(kid.id)
        status_value = log.status if log else "not_sent"
        last_error = log.last_error if log else ""
        if (
            log
            and log.status == "sending"
            and log.updated_at <= timezone.now() - _STALE_SEND_AFTER
        ):
            # A process restart can strand a durable row in "sending".
            # Surface it as retryable without silently resending during preview.
            status_value = "failed"
            last_error = _STALE_SEND_RETRY_NOTE
        if decision == "undecided":
            undecided.append(kid.get_name())
        if decision in ("invite_back", "must_try_out") and not email:
            missing.append(kid.get_name())
        results.append({
            "ballkid_id": kid.id, "name": kid.get_name(), "email": email,
            "decision": decision, "subject": message[0] if message else "",
            "text": message[1] if message else "",
            "status": status_value,
            "sent_at": log.sent_at.isoformat() if log and log.sent_at else None,
            "last_error": last_error,
        })
    sendable = sum(1 for r in results if r["decision"] in ("invite_back", "must_try_out") and r["email"] and r["status"] in ("not_sent", "failed"))
    eligible = [r for r in results if r["decision"] in ("invite_back", "must_try_out") and r["email"]]
    sent_count = sum(1 for r in eligible if r["status"] == "sent")
    failed_count = sum(1 for r in eligible if r["status"] == "failed")
    remaining_count = sum(1 for r in eligible if r["status"] != "sent")
    return {
        "source_year": source_year, "year": year, "count": len(results),
        "sendable": sendable, "sent": sent_count, "failed": failed_count, "remaining": remaining_count, "undecided": undecided, "missing_email": missing,
        "applications_open": ApplicationSettings.get_solo().is_open,
        "tournament_dates": tournament_dates,
        "tournament_configured": tournament_dates is not None,
        "sending": launch_send_in_progress(), "results": results,
    }


def _send_one(kid, source_year, year, tournament_dates):
    content = _content(kid.first_name, kid.decision, year, tournament_dates)
    if not content:
        return "skipped"
    subject, body, html = content
    try:
        with transaction.atomic():
            log, created = ApplicationLaunchEmailLog.objects.get_or_create(
                ballkid_id=kid.id, year=year, kind="returning_invitation",
                defaults={
                    "source_year": source_year, "recipient_email": kid.user.email,
                    "subject": subject, "status": "sending", "attempts": 1,
                },
            )
            if not created:
                if log.status == "sent":
                    return "skipped"
                now = timezone.now()
                if log.status == "sending":
                    stale_before = now - _STALE_SEND_AFTER
                    claimed = ApplicationLaunchEmailLog.objects.filter(
                        pk=log.pk,
                        status="sending",
                        updated_at__lte=stale_before,
                    ).update(
                        attempts=F("attempts") + 1,
                        updated_at=now,
                        last_error=_STALE_SEND_RETRY_NOTE,
                        recipient_email=kid.user.email,
                        subject=subject,
                    )
                else:
                    claimed = ApplicationLaunchEmailLog.objects.filter(
                        pk=log.pk, status="failed"
                    ).update(
                        status="sending",
                        attempts=F("attempts") + 1,
                        updated_at=now,
                        last_error="",
                        recipient_email=kid.user.email,
                        subject=subject,
                    )
                if not claimed:
                    return "skipped"
        msg = EmailMultiAlternatives(subject, body, to=[kid.user.email], reply_to=[settings.SUPPORT_EMAIL])
        msg.attach_alternative(html, "text/html")
        msg.send(fail_silently=False)
        ApplicationLaunchEmailLog.objects.filter(ballkid_id=kid.id, year=year, kind="returning_invitation").update(
            status="sent", sent_at=timezone.now(), last_error=""
        )
        return "sent"
    except Exception as exc:
        ApplicationLaunchEmailLog.objects.filter(ballkid_id=kid.id, year=year, kind="returning_invitation").update(
            status="failed", last_error=str(exc)[:2000]
        )
        logger.exception("Launch email failed for Ballkid %s", kid.id)
        return "halt" if _is_mail_provider_throttle(exc) else "failed"


def send_launch_notifications(source_year):
    if not _send_lock.acquire(blocking=False):
        return {"busy": True, "sent": 0, "failed": 0, "skipped": 0}
    try:
        if not ApplicationSettings.get_solo().is_open:
            return {"sent": 0, "failed": 0, "skipped": 0, "blocked": True}
        preview = build_launch_preview(source_year)
        if preview["undecided"] or preview["missing_email"]:
            return {"blocked": True, "sent": 0, "failed": 0, "skipped": 0}
        year = source_year + 1
        decisions = {d.ballkid_id: d.decision for d in ApplicationLaunchDecision.objects.filter(year=year, source_year=source_year)}
        roster = SeasonParticipation.objects.filter(year=source_year).select_related("ballkid", "ballkid__user").order_by("ballkid_id")
        counts = {"sent": 0, "failed": 0, "skipped": 0}
        tournament = _tournament_for_year(year)
        tournament_dates = (
            f"{tournament.start_date.strftime('%B %d, %Y').replace(' 0', ' ')} – "
            f"{tournament.end_date.strftime('%B %d, %Y').replace(' 0', ' ')}"
            if tournament and tournament.start_date and tournament.end_date
            else None
        )
        if not tournament_dates:
            return {"blocked": True, "sent": 0, "failed": 0, "skipped": 0}
        for row in roster:
            kid = row.ballkid
            kid.decision = decisions.get(kid.id, "undecided")
            if kid.decision not in ("invite_back", "must_try_out") or not (kid.user_id and kid.user.email):
                counts["skipped"] += 1
                continue
            result = _send_one(kid, source_year, year, tournament_dates)
            if result == "halt":
                # The recipient failure is logged; leave all remaining rows
                # untouched so the chairperson can retry after the provider cools down.
                counts["failed"] += 1
                break
            counts[result] = counts.get(result, 0) + 1
        return counts
    except Exception:
        logger.exception("Launch email batch failed")
        return {"sent": 0, "failed": 0, "skipped": 0, "error": "send_failed"}
    finally:
        _send_lock.release()



def send_launch_test_email(first_name, decision, year, tournament_dates, destination):
    """Send one explicitly requested preview to the authenticated chairperson."""
    content = _content(first_name, decision, year, tournament_dates)
    if not content:
        raise ValueError("Choose invite back or must try out before sending.")
    subject, body, html = content
    subject = f"[TEST EMAIL] {subject}"
    body = (
        "TEST EMAIL — sent only to the chairperson who requested this preview. "
        "This was not sent to the volunteer.\\n\\n" + body
    )
    banner = (
        '<p style="padding:10px;background:#fff3cd;color:#664d03;border:1px solid #ffecb5">'
        '<strong>TEST EMAIL</strong> — sent only to the chairperson who requested this preview. '
        "This was not sent to the volunteer.</p>"
    )
    html = html.replace("</div>", banner + "</div>", 1)
    message = EmailMultiAlternatives(
        subject, body, to=[destination], reply_to=[settings.SUPPORT_EMAIL]
    )
    message.attach_alternative(html, "text/html")
    message.send(fail_silently=False)
    return subject


def _send_launch_thread(source_year):
    try:
        send_launch_notifications(source_year)
    finally:
        # Only the worker thread should close its own database connection.
        close_old_connections()


def send_launch_notifications_async(source_year):
    threading.Thread(target=_send_launch_thread, args=(source_year,), daemon=True).start()
