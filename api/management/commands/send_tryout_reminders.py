from django.core.management.base import BaseCommand, CommandError

from api.utils.application_decision_email import (
    applicant_emails_enabled,
    send_tryout_reminders,
    tryout_reminder_candidates,
)


class Command(BaseCommand):
    help = (
        "Email a tryout reminder to first-time applicants whose tryout is "
        "within the next few days. Safe to run repeatedly (and daily): "
        "anyone already reminded is skipped. Respects the applicant-emails "
        "toggle on the review page."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--days-ahead",
            type=int,
            default=2,
            help="Remind people whose tryout is within this many days (default 2).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List who would be emailed without sending anything.",
        )

    def handle(self, *args, **options):
        days = options["days_ahead"]

        if not applicant_emails_enabled():
            self.stdout.write("Applicant emails are switched off; nothing sent.")
            return

        candidates = tryout_reminder_candidates(days)
        self.stdout.write(f"{len(candidates)} reminder(s) due.")

        if options["dry_run"]:
            for application in candidates:
                self.stdout.write(
                    f"  {application.full_name} <{application.email}> "
                    f"({application.tryout_date})"
                )
            return

        result = send_tryout_reminders(days)
        if result is None:
            raise CommandError("A reminder run is already in progress.")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Sent {result['sent']}, failed {result['failed']}, "
                f"skipped {result['skipped']}."
            )
        )
