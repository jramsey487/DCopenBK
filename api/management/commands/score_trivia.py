from django.core.management.base import BaseCommand, CommandError

from api.utils.trivia import ScoringError, pending_applications, score_pending
from api.utils.utils import get_current_year


class Command(BaseCommand):
    help = (
        "Score this season's application fun facts (interest 1-10 and "
        "safe-to-announce) with Claude. Needs ANTHROPIC_API_KEY."
    )

    def handle(self, *args, **options):
        year = get_current_year()
        total = len(pending_applications(year))
        self.stdout.write(f"{total} fact(s) need scoring.")

        scored_total = 0
        while True:
            try:
                scored, pending = score_pending(year)
            except ScoringError as exc:
                raise CommandError(str(exc)) from exc
            scored_total += scored
            self.stdout.write(f"Scored {scored}; {pending} still pending.")
            if scored == 0 or pending == 0:
                break

        self.stdout.write(self.style.SUCCESS(f"Done. Scored {scored_total} fact(s)."))
