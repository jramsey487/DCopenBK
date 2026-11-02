from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from rest_framework.authtoken.models import Token

from accounts.emails import send_set_password_emails

KNOWN_DEFAULT_PASSWORD = "password"


class Command(BaseCommand):
    help = (
        "Find active accounts still using a known default password (the old "
        "'password'), lock them, sign out their existing sessions, and email "
        "each a link to choose a new one. Dry run unless --apply is given."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually lock the accounts and send emails (default: just list them).",
        )
        parser.add_argument(
            "--password",
            action="append",
            dest="passwords",
            help="A known default password to look for (repeatable). Default: 'password'.",
        )
        parser.add_argument(
            "--no-email",
            action="store_true",
            help="Lock the accounts but don't send emails (people use 'Forgot password?').",
        )

    def handle(self, *args, **options):
        passwords = options["passwords"] or [KNOWN_DEFAULT_PASSWORD]

        self.stdout.write(
            "Checking passwords (this takes a few seconds per hundred accounts)..."
        )
        candidates = (
            User.objects.filter(is_active=True)
            .exclude(password__startswith=UNUSABLE_PASSWORD_PREFIX)
            .order_by("username")
        )
        matches = [
            user
            for user in candidates
            if any(user.check_password(p) for p in passwords)
        ]

        if not matches:
            self.stdout.write(
                self.style.SUCCESS("No active accounts are using a default password.")
            )
            return

        lockable = [u for u in matches if u.email]
        no_email = [u for u in matches if not u.email]

        self.stdout.write(f"\n{len(matches)} account(s) use a default password:")
        for user in matches:
            groups = ", ".join(g.name for g in user.groups.all()) or "no group"
            flags = " superuser" if user.is_superuser else ""
            self.stdout.write(
                f"  {user.username:<28} {user.email or '(NO EMAIL)':<36} [{groups}]{flags}"
            )

        if no_email:
            self.stdout.write(
                self.style.WARNING(
                    f"\n{len(no_email)} account(s) have no email, so they can't "
                    "receive a link. They will be left alone (still on the "
                    "default password). Add an email in Django admin and re-run."
                )
            )

        if not options["apply"]:
            self.stdout.write(
                "\nDry run: nothing changed. Re-run with --apply to lock "
                f"{len(lockable)} account(s)"
                + ("." if options["no_email"] else " and email them a link.")
            )
            return

        # Lock first, THEN email: the reset link is tied to the current
        # password hash, so it has to be generated after the change.
        with transaction.atomic():
            for user in lockable:
                user.set_unusable_password()
                user.save(update_fields=["password"])
                # Sign out any existing sessions for these accounts.
                Token.objects.filter(user=user).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"\nLocked {len(lockable)} account(s) and signed out their sessions."
            )
        )

        if options["no_email"]:
            self.stdout.write(
                "No emails sent (--no-email). Those people can use "
                "'Forgot password?' on the login page."
            )
            return

        sent, failed = send_set_password_emails(
            [u.id for u in lockable], existing_account=True
        )
        self.stdout.write(self.style.SUCCESS(f"Emailed {sent} set-password link(s)."))
        if failed:
            self.stdout.write(
                self.style.WARNING(
                    f"{failed} email(s) failed (see logs). Those people can use "
                    "'Forgot password?' on the login page."
                )
            )