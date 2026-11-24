import logging
import time
from datetime import timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core.management.base import BaseCommand
from django.db import close_old_connections
from django.db.models import F, Q
from django.utils import timezone

from api.models.ballkid import Ballkid, TeamHistory
from api.models.notifications import NotificationDelivery
from api.models.schedule import Schedule, Tournament
from api.utils.notification_outbox import process_notification_outbox
from api.utils.push_notifications import deliver_push, web_push_configured

logger = logging.getLogger("api.notifications")

IDLE_SLEEP_SECONDS = 30
# How long an assignment must stay put before we tell the ballkid.
TEAM_CHANGE_STABLE_MINUTES = 5
# Don't announce assignments that have been in place longer than this.
TEAM_CHANGE_MAX_AGE_MINUTES = 35


def format_time(value):
    """Format an aware schedule timestamp in the configured local timezone."""
    return timezone.localtime(value).strftime("%I:%M %p").lstrip("0")


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
        """Queue due tournament notices and drain durable notifications."""
        if not web_push_configured():
            if verbose:
                self.stdout.write("Notification check skipped: Web Push is not configured.")
            return False

        now = timezone.now()
        tournament = self.active_tournament(now)
        shift_count = 0
        team_count = 0

        if tournament is not None:
            if tournament.show_teams:
                # Calendar dates and human-readable shift times follow the
                # tournament timezone, not the Fly machine's timezone.
                with timezone.override(tournament.timezone):
                    shift_count = self.send_shift_reminders(now)
                    team_count = self.send_team_change_notifications(now)
            elif verbose:
                self.stdout.write(
                    "Schedule notices skipped: teams are hidden from ballkids."
                )

        # This runs even outside tournament dates: announcements and ticket
        # events must still be delivered, and pending retries must recover.
        delivered_count = process_notification_outbox(limit=100)
        pending = NotificationDelivery.objects.filter(
            status__in=(
                NotificationDelivery.STATUS_PENDING,
                NotificationDelivery.STATUS_PROCESSING,
            )
        ).exists()

        if verbose or shift_count or team_count or delivered_count:
            self.stdout.write(
                self.style.SUCCESS(
                    "Notification check complete: "
                    f"{shift_count} shift reminders queued, "
                    f"{team_count} team changes queued, "
                    f"{delivered_count} notifications delivered."
                )
            )

        # Keep checking at the normal interval while a tournament is active
        # or there is pending work/retry time to wait for.
        return tournament is not None or pending

    def active_tournament(self, now):
        """Find the tournament whose own local calendar date is active."""
        # A timezone far from UTC can be on a different calendar year around
        # New Year's. Check adjacent years rather than assuming the server's
        # configured TIME_ZONE determines the tournament year.
        utc_year = now.year
        default_year = timezone.localtime(now).year
        candidate_years = {utc_year - 1, utc_year, utc_year + 1, default_year}
        tournaments = Tournament.objects.filter(year__in=candidate_years)

        for tournament in tournaments:
            if tournament.start_date is None or tournament.end_date is None:
                continue
            try:
                local_now = timezone.localtime(now, ZoneInfo(tournament.timezone))
            except (ZoneInfoNotFoundError, ValueError):
                continue
            if (
                local_now.year == tournament.year
                and tournament.start_date <= local_now.date() <= tournament.end_date
            ):
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

    # ------------------------------------------------------------------

    def send_shift_reminders(self, now):
        """Remind checked-in ballkids when their team's shift is about 10 minutes away."""
        upper = now + timedelta(minutes=10, seconds=30)
        schedules = list(
            Schedule.objects.filter(start__gt=now, start__lte=upper).exclude(team=0)
        )

        # Load all eligible ballkids once instead of querying once per schedule.
        teams = {schedule.team for schedule in schedules}
        ballkids_by_team = {}
        if teams:
            ballkids = self.eligible_ballkids(
                "shift_reminders_enabled", current_team__in=teams
            )
            for ballkid in ballkids:
                ballkids_by_team.setdefault(ballkid.current_team, []).append(ballkid)

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
            for ballkid in ballkids_by_team.get(schedule.team, []):
                if deliver_push(\n                    ballkid.user,\n                    "shift_reminder",\n                    str(schedule.id),\n                    payload,\n                    pref_field="shift_reminders_enabled",\n                ):
                    sent += 1
        return sent

    def send_team_change_notifications(self, now):
        """
        Notify a ballkid about a team assignment once it has held for five
        minutes, and only after today's first shift has started (so the
        initial morning assignment stays quiet and only changes are announced).
        """
        today = timezone.localdate(now)
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

        # Load today's schedules once and choose the same schedule we previously
        # selected per history: prefer the latest active shift, otherwise the
        # earliest upcoming shift for that team.
        schedules_by_team = {}
        schedules = Schedule.objects.filter(start__date=today).exclude(team=0).order_by("start")
        for schedule in schedules:
            schedules_by_team.setdefault(schedule.team, []).append(schedule)

        schedule_by_team = {}
        for team, team_schedules in schedules_by_team.items():
            active = [
                schedule
                for schedule in team_schedules
                if schedule.start <= now and (schedule.end is None or schedule.end > now)
            ]
            if active:
                schedule_by_team[team] = active[-1]
            else:
                upcoming = [schedule for schedule in team_schedules if schedule.start >= now]
                if upcoming:
                    schedule_by_team[team] = upcoming[0]

        sent = 0
        for history in histories:
            ballkid = history.ballkid
            schedule = schedule_by_team.get(history.team)

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
            if deliver_push(\n                ballkid.user,\n                "team_change",\n                str(history.id),\n                payload,\n                pref_field="team_changes_enabled",\n            ):
                sent += 1
        return sent
