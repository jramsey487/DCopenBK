from datetime import date

from django.core.management.base import BaseCommand, CommandError

from api.models.schedule import Tournament
from api.utils.captain_feedback_emails import (
    feedback_email_status,
    send_feedback_emails,
)
from api.utils.utils import get_current_year


class Command(BaseCommand):
    help = (
        "Email each captain/chairperson the crew feedback about them. Does "
        "nothing until the tournament's end date has passed (use --force to "
        "skip that check). Safe to run repeatedly: nobody is emailed twice."
    )

    def add_arguments(self, parser):
        parser.add_argument("--year", type=int, default=None)
        parser.add_argument(
            "--force",
            action="store_true",
            help="Send even if the tournament hasn't ended yet.",
        )

    def handle(self, *args, **options):
        year = options["year"] or get_current_year()

        if not options["force"]:
            tournament = Tournament.objects.filter(year=year).first()
            end_date = tournament.end_date if tournament else None
            if end_date is None:
                self.stdout.write(
                    f"No tournament end date set for {year}; nothing sent "
                    "(use --force to send anyway)."
                )
                return
            if date.today() <= end_date:
                self.stdout.write(
                    f"Tournament ends {end_date}; nothing sent yet."
                )
                return

        status_before = feedback_email_status(year)
        self.stdout.write(
            f"{status_before['ready']} ready, {status_before['sent']} already "
            f"sent, {status_before['held_back']} held back, "
            f"{status_before['no_email']} without an email."
        )

        result = send_feedback_emails(year)
        if result is None:
            raise CommandError("A send is already in progress.")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Sent {result['sent']}, failed {result['failed']}."
            )
        )
