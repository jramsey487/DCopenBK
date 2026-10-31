import logging
import time
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.db import IntegrityError, close_old_connections
from django.db.models import F, Q

from api.models.ballkid import Ballkid, TeamHistory
from api.models.notifications import NotificationDelivery
from api.models.schedule import Schedule, Tournament
from api.utils.push_notifications import send_push_to_user, web_push_configured

logger = logging.getLogger("api.notifications")

IDLE_SLEEP_SECONDS = 300
# How long an assignment must stay put before we tell the ballkid.
TEAM_CHANGE_STABLE_MINUTES = 5
# Don't announce assignments that have been in place longer than this.
TEAM_CHANGE_MAX_AGE_MINUTES = 35


def format_time(value):
    """Format a schedule time using the project's existing local-time convention."""
    return value.strftime("%I:%M %p").lstrip("0")


class Command(BaseCommand):
    help = "Send due DCopenBK Web Push notifications (once, or continuously with --loop)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--loop",
            action="store_true",
            help="Keep running and check every --interval seconds.",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=30,
            help="Seconds between checks in --loop mode (default 30).",
        )

    def handle(self, *args, **options):
        if not options["loop"]:
            self.run_once(verbose=True)
            return

        self.stdout.write("Notification loop started.")
        while True:
            active = False
            try:
                active = self.run_once(verbose=False)
            except Exception:
                logger.exception("Notification check failed")
            finally:
                # Long-lived process: don't hold on to stale DB connections.
                close_old_connections()
            time.sleep(options["interval"] if active else IDLE_SLEEP_SECONDS)

    # ------------------------------------------------------------------

    def run_once(self, verbose):
        """Returns True if the tournament is active (i.e. keep polling quickly)."""
        if not web_push_configured():
            if verbose:
                self.stdout.write("Notification check skipped: Web Push is not configured.")
            return False

        # This project has USE_TZ disabled, so use naive local datetimes.
        now = datetime.now()
        tournament = self.active_tournament(now)
        if tournament is None:
            if verbose:
                self.stdout.write("Notification check skipped: tournament is not active.")
            return False

        # Notifications name the team, so never send them while teams are hidden.
        if not tournament.show_teams:
            if verbose:
                self.stdout.write("Notification check skipped: teams are hidden from ballkids.")
            return True

        shift_count = self.send_shift_reminders(now)
        team_count = self.send_team_change_notifications(now)

        if verbose or shift_count or team_count:
            self.stdout.write(
                self.style.SUCCESS(
                    "Notification check complete: "
                    f"{shift_count} shift reminders, {team_count} team changes."
                )
            )
        return True

    def active_tournament(self, now):
        """The current year's tournament if today is within its start/end dates."""
        tournament = Tournament.objects.filter(year=now.year).first()
        if tournament is None or tournament.start_date is None or tournament.end_date is None:
            return None
        if tournament.start_date <= now.date() <= tournament.end_date:
            return tournament
        return None

    # ------------------------------------------------------------------

    def eligible_ballkids(self, pref_field, **filters):
        """Checked-in ballkids with a login, an active device, and the pref not turned off."""
        return (
            Ballkid.objects.filter(
                is_active=True,
                is_cut=False,
                is_checked_in=True,
                user__isnull=False,
                user__push_subscriptions__active=True,
                **filters,
            )
            .exclude(**{f"user__notification_settings__{pref_field}": False})
            .select_related("user")
            .distinct()
        )

    def claim(self, user, notification_type, key):
        """Record the delivery *before* sending so overlapping runs can't double-send."""
        try:
            NotificationDelivery.objects.create(
                user=user, notification_type=notification_type, reference_key=key
            )
            return True
        except IntegrityError:
            return False

    def release(self, user, notification_type, key):
        NotificationDelivery.objects.filter(
            user=user, notification_type=notification_type, reference_key=key
        ).delete()

    def deliver(self, user, notification_type, key, payload):
        if not self.claim(user, notification_type, key):
            return False
        if send_push_to_user(user, payload):
            return True
        self.release(user, notification_type, key)  # allow a retry on the next pass
        return False

    # ------------------------------------------------------------------

    def send_shift_reminders(self, now):
        """Remind checked-in ballkids when their team's shift is about 10 minutes away."""
        upper = now + timedelta(minutes=10, seconds=30)
        schedules = Schedule.objects.filter(start__gt=now, start__lte=upper).exclude(team=0)

        sent = 0
        for schedule in schedules:
            minutes = max(1, round((schedule.start - now).total_seconds() / 60))
            unit = "minute" if minutes == 1 else "minutes"
            court = f" — {schedule.court}" if schedule.court else ""
            payload = {
                "title": f"Your shift starts in {minutes} {unit}",
                "body": (
                    f"Team {schedule.team}{court}. "
                    f"Your shift begins at {format_time(schedule.start)}."
                ),
                "url": "/schedule",
                "tag": f"shift-{schedule.id}",
            }
            for ballkid in self.eligible_ballkids(
                "shift_reminders_enabled", current_team=schedule.team
            ):
                if self.deliver(ballkid.user, "shift_reminder", str(schedule.id), payload):
                    sent += 1
        return sent

    def send_team_change_notifications(self, now):
        """
        Notify a ballkid about a team assignment once it has held for five
        minutes, and only after today's first shift has started (so the
        initial morning assignment stays quiet and only changes are announced).
        """
        today = now.date()
        first_shift = (
            Schedule.objects.filter(start__date=today)
            .exclude(team=0)
            .order_by("start")
            .first()
        )
        if first_shift is None or now < first_shift.start:
            return 0

        earliest = max(
            first_shift.start, now - timedelta(minutes=TEAM_CHANGE_MAX_AGE_MINUTES)
        )
        histories = (
            TeamHistory.objects.filter(
                team__gt=0,
                end__isnull=True,
                start__gte=earliest,
                start__lte=now - timedelta(minutes=TEAM_CHANGE_STABLE_MINUTES),
                ballkid__current_team=F("team"),
                ballkid__is_active=True,
                ballkid__is_cut=False,
                ballkid__is_checked_in=True,
                ballkid__user__isnull=False,
                ballkid__user__push_subscriptions__active=True,
            )
            .exclude(ballkid__user__notification_settings__team_changes_enabled=False)
            .select_related("ballkid", "ballkid__user")
            .distinct()
        )

        sent = 0
        for history in histories:
            ballkid = history.ballkid

            # Prefer a shift in progress for the assigned team...
            schedule = (
                Schedule.objects.filter(team=history.team, start__lte=now)
                .filter(Q(end__isnull=True) | Q(end__gt=now))
                .filter(start__date=today)
                .order_by("-start")
                .first()
            )
            # ...otherwise the next upcoming shift today.
            if schedule is None:
                schedule = (
                    Schedule.objects.filter(
                        team=history.team, start__date=today, start__gte=now
                    )
                    .order_by("start")
                    .first()
                )

            court = f" — {schedule.court}" if schedule and schedule.court else ""
            body = f"You are now on Team {history.team}{court}."
            if schedule is not None:
                body += f" Your current shift starts at {format_time(schedule.start)}."

            payload = {
                "title": "Team Assignment Changed",
                "body": body,
                "url": "/teams",
                "tag": f"team-change-{ballkid.id}",
            }
            if self.deliver(ballkid.user, "team_change", str(history.id), payload):
                sent += 1
        return sent