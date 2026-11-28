"""Resolve the tournament's public ballcrew contact address."""

from django.conf import settings
from django.utils import timezone

from api.models.schedule import Tournament


def get_contact_tournament():
    """Return the currently active tournament, else the next upcoming one."""
    today = timezone.localdate()
    return (
        Tournament.objects.filter(start_date__lte=today, end_date__gte=today)
        .order_by("-start_date", "year")
        .first()
        or Tournament.objects.filter(start_date__gte=today)
        .order_by("start_date", "year")
        .first()
        or Tournament.objects.filter(year=today.year).first()
    )


def get_tournament_contact_email():
    """Public contact address, falling back to the configured support mailbox."""
    tournament = get_contact_tournament()
    configured = (getattr(tournament, "contact_email", "") or "").strip()
    return configured or (getattr(settings, "SUPPORT_EMAIL", "") or getattr(settings, "EMAIL_HOST_USER", "")).strip()
