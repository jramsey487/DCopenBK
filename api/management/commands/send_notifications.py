from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django.db.models import Q

from api.models.ballkid import Ballkid, TeamHistory
from api.models.notifications import NotificationDelivery, NotificationSettings, PushSubscription
from api.models.schedule import Schedule
from api.utils.push_notifications import send_push_to_user


def format_time(value):
    return value.strftime("%I:%M %p").lstrip("0")


class Command(BaseCommand):
    help = "Send due DCopenBK Web Push notifications."

    def handle(self, *args, **options):
        now = datetime.now()
        shifts = self.send_shift_reminders(now)
        teams = self.send_team_change_notifications(now)
        self.stdout.write(f"Notification check complete: {shifts} shift reminders, {teams} team changes.")

    def send_shift_reminders(self, now):
        lower = now + timedelta(minutes=9, seconds=30)
        upper = now + timedelta(minutes=10, seconds=30)
        schedules = Schedule.objects.filter(start__gte=lower, start__lt=upper).exclude(team=0)
        sent_count = 0

        for schedule in schedules:
            ballkids = Ballkid.objects.filter(
                current_team=schedule.team,
                is_active=True,
                user__isnull=False,
            ).select_related("user")
            for ballkid in ballkids:
                prefs, _ = NotificationSettings.objects.get_or_create(user=ballkid.user)
                if not prefs.shift_reminders_enabled:
                    continue
                if not PushSubscription.objects.filter(user=ballkid.user, active=True).exists():
                    continue
                if NotificationDelivery.objects.filter(
                    user=ballkid.user,
                    notification_type="shift_reminder",
                    reference_key=str(schedule.id),
                ).exists():
                    continue

                court = f" — {schedule.court}" if schedule.court else ""
                payload = {
                    "title": "Your shift starts in 10 minutes",
                    "body": f"Team {schedule.team}{court}. Your shift begins at {format_time(schedule.start)}.",
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
                        pass
        return sent_count

    def send_team_change_notifications(self, now):
        # The first scheduled shift of the current day is the hard gate for team-change pushes.
        first_shift = (
            Schedule.objects.filter(start__date=now.date())
            .exclude(team=0)
            .order_by("start")
            .first()
        )
        if not first_shift or now < first_shift.start:
            return 0

        # A team change must occur after matches begin and remain current for 5 full minutes.
        histories = TeamHistory.objects.filter(
            team__gt=0,
            end__isnull=True,
            start__gte=first_shift.start,
            start__lte=now - timedelta(minutes=5),
            ballkid__current_team__gt=0,
            ballkid__user__isnull=False,
        ).select_related("ballkid", "ballkid__user")
        sent_count = 0

        for history in histories:
            ballkid = history.ballkid
            if ballkid.current_team != history.team:
                continue

            prefs, _ = NotificationSettings.objects.get_or_create(user=ballkid.user)
            if not prefs.team_changes_enabled:
                continue
            if not PushSubscription.objects.filter(user=ballkid.user, active=True).exists():
                continue
            if NotificationDelivery.objects.filter(
                user=ballkid.user,
                notification_type="team_change",
                reference_key=str(history.id),
            ).exists():
                continue

            active_schedule = (
                Schedule.objects.filter(team=history.team, start__lte=now)
                .filter(Q(end__isnull=True) | Q(end__gt=now))
                .order_by("-start")
                .first()
            )
            if not active_schedule:
                active_schedule = (
                    Schedule.objects.filter(team=history.team, start__date=now.date(), start__gte=now)
                    .order_by("start")
                    .first()
                )

            court = f" — {active_schedule.court}" if active_schedule and active_schedule.court else ""
            body = f"You are now on Team {history.team}{court}."
            if active_schedule:
                body += f" Your current shift starts at {format_time(active_schedule.start)}."

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
                    pass

        return sent_count
