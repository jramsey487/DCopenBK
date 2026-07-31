from django.core.management.base import BaseCommand, CommandError

from api.dev_local import DEFAULT_DEV_PASSWORD, DEV_ROLES, create_dev_user


class Command(BaseCommand):
    help = (
        "Local dev: create a ballkid profile and login (ballkid, captain, or chairperson)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--first", required=True, help="First name")
        parser.add_argument("--last", required=True, help="Last name")
        parser.add_argument(
            "--role",
            required=True,
            choices=DEV_ROLES,
            help="Django group and ballkid flags",
        )
        parser.add_argument("--email", help="Default: first.last@example.com")
        parser.add_argument(
            "--password",
            default=DEFAULT_DEV_PASSWORD,
            help=f"Login password (default: {DEFAULT_DEV_PASSWORD})",
        )
        parser.add_argument(
            "--position",
            default="Back",
            choices=["Back", "Net", "Back/Net", "Net/Back"],
        )
        parser.add_argument("--yoe", type=int, default=0, help="Years of experience")
        parser.add_argument("--dob", help="Date of birth (YYYY-MM-DD)")
        parser.add_argument(
            "--profile-only",
            action="store_true",
            help="Create ballkid record only (no Django user)",
        )

    def handle(self, *args, **options):
        dob = None
        if options["dob"]:
            from datetime import datetime

            dob = datetime.strptime(options["dob"], "%Y-%m-%d").date()

        try:
            ballkid, user = create_dev_user(
                first_name=options["first"],
                last_name=options["last"],
                role=options["role"],
                email=options.get("email"),
                password=options["password"],
                preferred_position=options["position"],
                num_years_experience=options["yoe"],
                date_of_birth=dob,
                with_login=not options["profile_only"],
            )
        except (RuntimeError, ValueError) as exc:
            raise CommandError(str(exc)) from exc

        name = f"{ballkid.first_name} {ballkid.last_name}"
        if user:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {name} ({options['role']}): "
                    f"username {user.username} / {options['password']}"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Created ballkid profile only: {name}")
            )
