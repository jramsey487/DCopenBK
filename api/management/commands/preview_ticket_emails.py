from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from accounts.emails import PasswordChangedConfirmationEmail, PasswordResetEmail
from api.utils.ticket_emails import (
    render_ticket_email,
    sample_contexts,
    send_test_ticket_email,
    ticket_logo_url,
)

SEND_TEMPLATES = (
    "round_live",
    "round_live_multi",
    "lottery_results",
    "lottery_results_mixed",
    "lottery_results_waitlist",
    "confirmed_waitlist",
    "confirmed_partial",
    "denied",
    "denied_digest",
)

AUTH_TEMPLATES = ("password_reset", "password_changed")


class Command(BaseCommand):
    help = (
        "Preview ticket / auth emails as HTML, or send samples with --send-to."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            default="exports/email-previews",
            help="Directory for preview HTML files (default: exports/email-previews)",
        )
        parser.add_argument(
            "--open",
            action="store_true",
            help="Print file paths when done (open manually in a browser).",
        )
        parser.add_argument(
            "--send-to",
            metavar="EMAIL",
            help="Send sample email(s) to this address via SMTP (uses settings.py).",
        )
        parser.add_argument(
            "--template",
            default="all",
            choices=["all", *SEND_TEMPLATES, *AUTH_TEMPLATES],
            help="Which sample to send with --send-to (default: all ticket emails).",
        )

    def handle(self, *args, **options):
        if options["send_to"]:
            self._send_samples(options["send_to"], options["template"])
            return

        out_dir = Path(options["output"])
        out_dir.mkdir(parents=True, exist_ok=True)

        samples = sample_contexts()
        crest = settings.BASE_DIR / "api/static/email/mubadala-dc-open-crest.png"
        logo_url = crest.resolve().as_uri() if crest.exists() else ticket_logo_url()
        for context in samples.values():
            context["logo_url"] = logo_url

        mapping = {
            "round_live.html": ("round_live", samples["round_live"]),
            "round_live_multi.html": ("round_live", samples["round_live_multi"]),
            "lottery_results.html": ("lottery_results", samples["lottery_results"]),
            "lottery_results_mixed.html": (
                "lottery_results",
                samples["lottery_results_mixed"],
            ),
            "lottery_results_waitlist.html": (
                "lottery_results",
                samples["lottery_results_waitlist"],
            ),
            "confirmed_waitlist.html": ("confirmed", samples["confirmed_waitlist"]),
            "confirmed_partial.html": ("confirmed", samples["confirmed_partial"]),
            "denied.html": ("denied", samples["denied"]),
            "denied_digest.html": ("denied", samples["denied_digest"]),
        }

        self.stdout.write(f"Logo used in previews: {logo_url}")

        for filename, (template_name, context) in mapping.items():
            html = render_ticket_email(template_name, context)
            path = out_dir / filename
            path.write_text(html, encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Wrote {path}"))

        for name, email_cls in (
            ("password_reset.html", PasswordResetEmail),
            ("password_changed.html", PasswordChangedConfirmationEmail),
        ):
            html = self._render_auth_preview(email_cls, logo_url)
            path = out_dir / name
            path.write_text(html, encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Wrote {path}"))

        if options["open"]:
            for path in sorted(out_dir.glob("*.html")):
                self.stdout.write(str(path.resolve()))

    def _preview_user(self):
        return User(
            username="andrea.ballkid",
            first_name="Andrea",
            email="andrea@example.com",
            pk=1,
        )

    def _render_auth_preview(self, email_cls, logo_url):
        message = email_cls(context={"user": self._preview_user()})
        message.render()
        html = message.html or ""
        if logo_url and "cid:crest-logo" in html:
            html = html.replace("cid:crest-logo", logo_url)
        return html

    def _send_samples(self, recipient, template_choice):
        if template_choice in AUTH_TEMPLATES:
            self._send_auth(recipient, template_choice)
            return

        templates = (
            SEND_TEMPLATES if template_choice == "all" else [template_choice]
        )
        samples = sample_contexts()
        logo = ticket_logo_url()
        for ctx in samples.values():
            ctx["logo_url"] = logo

        try:
            for template_name in templates:
                subject = send_test_ticket_email(
                    recipient,
                    template_name,
                    context=samples[template_name],
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Sent {template_name!r} → {recipient} ({subject})"
                    )
                )
        except Exception as exc:
            raise CommandError(str(exc)) from exc

    def _send_auth(self, recipient, template_choice):
        email_cls = (
            PasswordResetEmail
            if template_choice == "password_reset"
            else PasswordChangedConfirmationEmail
        )
        try:
            message = email_cls(context={"user": self._preview_user()})
            message.send(to=[recipient])
        except Exception as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(
            self.style.SUCCESS(f"Sent {template_choice!r} → {recipient}")
        )
