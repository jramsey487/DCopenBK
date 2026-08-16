from django.core.management.base import BaseCommand, CommandError

from api.dev_local import DEFAULT_DEV_PASSWORD, create_dev_user, ensure_dev_groups


class Command(BaseCommand):
    help = (
        "Local dev: ensure auth groups exist and create default chairperson "
        f"(local.chair / {DEFAULT_DEV_PASSWORD}) plus ticketing "
        f"(alexis.tickets / {DEFAULT_DEV_PASSWORD})."
    )

    def handle(self, *args, **options):
        try:
            ensure_dev_groups()
            _, user = create_dev_user(
                first_name="Local",
                last_name="Chair",
                role="chairperson",
            )
            create_dev_user(
                first_name="Alexis",
                last_name="Tickets",
                role="ticketing",
            )
        except RuntimeError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Ready. Log in as {user.username} / {DEFAULT_DEV_PASSWORD} "
                f"(or alexis.tickets / {DEFAULT_DEV_PASSWORD} for Ticketing), "
                "then use /debug or create_dev_user for more accounts."
            )
        )
