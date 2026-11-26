"""Returning-volunteer invitation preview and resumable email delivery."""
import logging
import threading
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import close_old_connections, transaction
from django.db.models import F
from django.utils import timezone
from django.utils.html import escape
from api.models.application import ApplicationLaunchDecision, ApplicationLaunchEmailLog, ApplicationSettings
from api.models.ballkid import SeasonParticipation
from api.serializers_application import get_tryout_slot_info

logger = logging.getLogger("api.utils.application_launch_email")
_send_lock = threading.Lock()


def launch_send_in_progress():
    return _send_lock.locked()


def _content(first_name, decision, year, slots):
    site = settings.SITE_NAME
    apply_url = f"{settings.SITE_BASE_URL}/apply"
    handbook_url = f"{settings.SITE_BASE_URL}/handbook"
    greeting = f"Hi {first_name}," if first_name else "Hello,"
    tryouts = []
    for slot in slots:
        detail = " — ".join(x for x in (slot.get("date"), slot.get("location")) if x)
        tryouts.append(f"{slot.get('label', 'Tryout')}{': ' + detail if detail else ''}")
    if decision == ApplicationLaunchDecision.DECISION_INVITE_BACK:
        subject = f"You're invited back to ball crew — {site} {year}"
        paragraphs = [
            f"We'd love to have you back on the {site} ball crew for {year}.",
            "Please submit your application using the link below so we can confirm your availability and collect this season's details.",
        ]
        button = "Apply for the upcoming season"
    elif decision == ApplicationLaunchDecision.DECISION_MUST_TRY_OUT:
        subject = f"Returning ball crew invitation and tryout — {site} {year}"
        paragraphs = [
            f"We'd love for you to be considered for the {site} ball crew in {year}. For this season, we need you to attend a tryout before your spot can be confirmed.",
            "Please submit your application and select a tryout date. This is not a rejection; the tryout is the next step.",
        ]
        button = "Apply and choose a tryout"
    else:
        return None
    if tryouts:
        paragraphs.append("Tryout information:\n" + "\n".join(tryouts))
    paragraphs.extend([f"Ball crew handbook: {handbook_url}", f"Applications: {apply_url}", "Questions? Reply to this email."])
    text = "\n\n".join([greeting, *paragraphs, site])
    html = (
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#1a2233;max-width:600px">'
        f"<p>{escape(greeting)}</p>"
        + "".join(f"<p>{escape(p).replace(chr(10), '<br>')}</p>" for p in paragraphs)
        + f'<p><a href="{escape(apply_url)}" style="display:inline-block;padding:10px 16px;background:#0b1b3f;color:#fff;text-decoration:none;border-radius:5px">{escape(button)}</a></p>'
        + f'<p><a href="{escape(handbook_url)}">Read the handbook</a></p><p>{escape(site)}</p></div>'
    )
    return subject, text, html


def build_launch_preview(source_year):
    year = source_year + 1
    slots = get_tryout_slot_info()
    roster = list(SeasonParticipation.objects.filter(year=source_year).select_related("ballkid", "ballkid__user").order_by("ballkid__last_name", "ballkid__first_name"))
    decisions = {d.ballkid_id: d for d in ApplicationLaunchDecision.objects.filter(year=year, source_year=source_year)}
    logs = {l.ballkid_id: l for l in ApplicationLaunchEmailLog.objects.filter(year=year, source_year=source_year, kind="returning_invitation")}
    results, undecided, missing = [], [], []
    for row in roster:
        kid = row.ballkid
        decision_row = decisions.get(kid.id)
        decision = decision_row.decision if decision_row else "undecided"
        email = (kid.user.email or "").strip() if kid.user_id else ""
        message = _content(kid.first_name, decision, year, slots)
        log = logs.get(kid.id)
        if decision == "undecided":
            undecided.append(kid.get_name())
        if decision in ("invite_back", "must_try_out") and not email:
            missing.append(kid.get_name())
        results.append({
            "ballkid_id": kid.id, "name": kid.get_name(), "email": email,
            "decision": decision, "subject": message[0] if message else "",
            "text": message[1] if message else "",
            "status": log.status if log else "not_sent",
            "sent_at": log.sent_at.isoformat() if log and log.sent_at else None,
            "last_error": log.last_error if log else "",
        })
    sendable = sum(1 for r in results if r["decision"] in ("invite_back", "must_try_out") and r["email"] and r["status"] in ("not_sent", "failed"))
    return {
        "source_year": source_year, "year": year, "count": len(results),
        "sendable": sendable, "undecided": undecided, "missing_email": missing,
        "applications_open": ApplicationSettings.get_solo().is_open,
        "sending": launch_send_in_progress(), "results": results,
    }


def _send_one(kid, source_year, year, slots):
    content = _content(kid.first_name, kid.decision, year, slots)
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
                if log.status in ("sent", "sending"):
                    return "skipped"
                claimed = ApplicationLaunchEmailLog.objects.filter(pk=log.pk, status="failed").update(
                    status="sending", attempts=F("attempts") + 1, last_error="",
                    recipient_email=kid.user.email, subject=subject,
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
        return "failed"


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
        slots = get_tryout_slot_info()
        for row in roster:
            kid = row.ballkid
            kid.decision = decisions.get(kid.id, "undecided")
            if kid.decision not in ("invite_back", "must_try_out") or not (kid.user_id and kid.user.email):
                counts["skipped"] += 1
                continue
            result = _send_one(kid, source_year, year, slots)
            counts[result] = counts.get(result, 0) + 1
        return counts
    except Exception:
        logger.exception("Launch email batch failed")
        return {"sent": 0, "failed": 0, "skipped": 0, "error": "send_failed"}
    finally:
        _send_lock.release()


def _send_launch_thread(source_year):
    try:
        send_launch_notifications(source_year)
    finally:
        # Only the worker thread should close its own database connection.
        close_old_connections()


def send_launch_notifications_async(source_year):
    threading.Thread(target=_send_launch_thread, args=(source_year,), daemon=True).start()
