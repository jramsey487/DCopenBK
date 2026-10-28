from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django.db.models import Q

from api.models.ballkid import Ballkid, TeamHistory
from api.models.notifications import (
    NotificationDelivery,
    NotificationSettings,
    PushSubscription,
)
from api.models.schedule import Schedule, Tournament
from api.utils.push_notifications import send_push_to_user


def format_time(value):
    """Format a schedule time using the project's existing local-time convention."""
    return value.strftime("%I:%M %p").lstrip("0")


class Command(BaseCommand):
    help = "Send due DCopenBK Web Push notifications."

    def handle(self, *args, **options):
        # This project currently has USE_TZ disabled, so use naive local datetimes.
        now = datetime.now()

        if not self.tournament_is_active(now):
            self.stdout.write(
                "Notification check skipped: tournament is not active."
            )
            return

        shift_count = self.send_shift_reminders(now)
        team_count = self.send_team_change_notifications(now)

        self.stdout.write(
            self.style.SUCCESS(
                "Notification check complete: "
                f"{shift_count} shift reminders, "
                f"{team_count} team changes."
            )
        )

    def tournament_is_active(self, now):
        """
        Return True only when today's date falls within the current year's
        configured tournament start and end dates.
        """
        try:
            tournament = Tournament.objects.get(year=now.year)
        except Tournament.DoesNotExist:
            return False

        if tournament.start_date is None or tournament.end_date is None:
            return False

        today = now.date()

        return tournament.start_date <= today <= tournament.end_date

    def send_shift_reminders(self, now):
        """Notify active ballkids approximately 10 minutes before their shifts."""
        lower = now + timedelta(minutes=9, seconds=30)
        upper = now + timedelta(minutes=10, seconds=30)

        schedules = (
            Schedule.objects.filter(
                start__gte=lower,
                start__lt=upper,
            )
            .exclude(team=0)
        )

        sent_count = 0

        for schedule in schedules:
            ballkids = (
                Ballkid.objects.filter(
                    current_team=schedule.team,
                    is_active=True,
                    user__isnull=False,
                )
                .select_related("user")
            )

            for ballkid in ballkids:
                prefs, _ = NotificationSettings.objects.get_or_create(
                    user=ballkid.user
                )

                if not prefs.shift_reminders_enabled:
                    continue

                has_subscription = PushSubscription.objects.filter(
                    user=ballkid.user,
                    active=True,
                ).exists()

                if not has_subscription:
                    continue

                already_sent = NotificationDelivery.objects.filter(
                    user=ballkid.user,
                    notification_type="shift_reminder",
                    reference_key=str(schedule.id),
                ).exists()

                if already_sent:
                    continue

                court = f" — {schedule.court}" if schedule.court else ""

                payload = {
                    "title": "Your shift starts in 10 minutes",
                    "body": (
                        f"Team {schedule.team}{court}. "
                        f"Your shift begins at {format_time(schedule.start)}."
                    ),
                    "url": "/schedule",
                    "tag": f"shift-{schedule.id}",
                }

                if send_push_to_user(ballkid.user, payload):
                    try:
                        NotificationDelivery.objects.create(
                            user=ballkid.user,
                            notification_type="shift_reminder",
                            reference_key=str(schedule.id),
                        )
                        sent_count += 1
                    except IntegrityError:
                        # A concurrent scheduler run may have recorded it already.
                        pass

        return sent_count

    def send_team_change_notifications(self, now):
        """
        Notify a ballkid about a current team assignment after it has remained
        active for at least five minutes, and only after today's first shift
        has started.
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

        histories = (
            TeamHistory.objects.filter(
                team__gt=0,
                end__isnull=True,
                start__gte=first_shift.start,
                start__lte=now - timedelta(minutes=5),
                ballkid__current_team__gt=0,
                ballkid__user__isnull=False,
            )
            .select_related("ballkid", "ballkid__user")
        )

        sent_count = 0

        for history in histories:
            ballkid = history.ballkid

            # Ignore history records for a team the ballkid no longer belongs to.
            if ballkid.current_team != history.team:
                continue

            prefs, _ = NotificationSettings.objects.get_or_create(
                user=ballkid.user
            )

            if not prefs.team_changes_enabled:
                continue

            has_subscription = PushSubscription.objects.filter(
                user=ballkid.user,
                active=True,
            ).exists()

            if not has_subscription:
                continue

            already_sent = NotificationDelivery.objects.filter(
                user=ballkid.user,
                notification_type="team_change",
                reference_key=str(history.id),
            ).exists()

            if already_sent:
                continue

            # Prefer a shift currently in progress for the assigned team.
            active_schedule = (
                Schedule.objects.filter(
                    team=history.team,
                    start__lte=now,
                )
                .filter(
                    Q(end__isnull=True) | Q(end__gt=now)
                )
                .order_by("-start")
                .first()
            )

            # If there is no active shift, use the next upcoming shift today.
            if active_schedule is None:
                active_schedule = (
                    Schedule.objects.filter(
                        team=history.team,
                        start__date=today,
                        start__gte=now,
                    )
                    .order_by("start")
                    .first()
                )

            court = (
                f" — {active_schedule.court}"
                if active_schedule and active_schedule.court
                else ""
            )

            body = f"You are now on Team {history.team}{court}."

            if active_schedule is not None:
                body += (
                    " Your current shift starts at "
                    f"{format_time(active_schedule.start)}."
                )

            payload = {
                "title": "Team Assignment Changed",
                "body": body,
                "url": "/teams",
                "tag": f"team-change-{ballkid.id}",
            }

            if send_push_to_user(ballkid.user, payload):
                try:
                    NotificationDelivery.objects.create(
                        user=ballkid.user,
                        notification_type="team_change",
                        reference_key=str(history.id),
                    )
                    sent_count += 1
                except IntegrityError:
                    # A concurrent scheduler run may have recorded it already.
                    pass

        return sent_count
