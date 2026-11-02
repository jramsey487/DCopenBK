import logging
import threading
from email.mime.image import MIMEImage

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db import close_old_connections
from djoser.email import PasswordChangedConfirmationEmail as DjoserPasswordChangedEmail
from djoser.email import PasswordResetEmail as DjoserPasswordResetEmail

from api.utils.ticket_emails import LOGO_CID, ticket_logo_path

logger = logging.getLogger("accounts")


class CrestBrandedEmailMixin:
    def get_context_data(self):
        context = super().get_context_data()
        domain = context.get("domain") or getattr(settings, "DOMAIN", "dcopenbk.fly.dev")
        protocol = "https"
        context["domain"] = domain
        context["protocol"] = protocol
        context["logo_url"] = f"cid:{LOGO_CID}"
        context["login_url"] = f"{protocol}://{domain}/"
        return context

    def send(self, to, *args, **kwargs):
        self.render()
        self.mixed_subtype = "related"
        logo_path = ticket_logo_path()
        if logo_path.is_file():
            with logo_path.open("rb") as logo_file:
                image = MIMEImage(logo_file.read(), _subtype="png")
            image.add_header("Content-ID", f"<{LOGO_CID}>")
            image.add_header(
                "Content-Disposition", "inline", filename="mubadala-dc-open-crest.png"
            )
            self.attach(image)

        self.to = to
        self.cc = kwargs.pop("cc", [])
        self.bcc = kwargs.pop("bcc", [])
        self.reply_to = kwargs.pop("reply_to", [])
        self.from_email = kwargs.pop(
            "from_email", settings.DEFAULT_FROM_EMAIL
        )
        EmailMultiAlternatives.send(self, *args, **kwargs)


class PasswordResetEmail(CrestBrandedEmailMixin, DjoserPasswordResetEmail):
    template_name = "email/auth/password_reset.html"


class PasswordChangedConfirmationEmail(
    CrestBrandedEmailMixin, DjoserPasswordChangedEmail
):
    template_name = "email/auth/password_changed_confirmation.html"


class WelcomeSetPasswordEmail(CrestBrandedEmailMixin, DjoserPasswordResetEmail):
    """
    "Welcome, set your password" email. Uses Djoser's reset-password token and
    URL, so the link lands on the normal reset-password page.

    Pass context {"existing_account": True} for the wording used when an
    existing account's default password is retired.
    """

    template_name = "email/auth/welcome_set_password.html"


def send_set_password_emails(user_ids, existing_account=False):
    """
    Email each user a set-your-password link, over one SMTP connection.
    Users without an email address are skipped. Synchronous.

    The reset token is built from the user's current password hash, so call
    this AFTER any password change/lock, or the link won't work.

    Returns (sent, failed).
    """
    users = list(User.objects.filter(id__in=list(user_ids)).exclude(email=""))
    sent = 0
    connection = None
    try:
        connection = get_connection(fail_silently=False)
        connection.open()
        for user in users:
            try:
                WelcomeSetPasswordEmail(
                    None,
                    {"user": user, "existing_account": existing_account},
                    connection=connection,
                ).send([user.email])
                sent += 1
            except Exception:
                logger.exception(
                    "Could not send set-password email to user %s", user.pk
                )
    except Exception:
        logger.exception("Set-password email run failed")
    finally:
        if connection is not None:
            try:
                connection.close()
            except Exception:
                pass
    return sent, len(users) - sent


def _run_async(user_ids, existing_account):
    try:
        send_set_password_emails(user_ids, existing_account=existing_account)
    finally:
        # This runs in its own thread; don't leave its DB connection open.
        close_old_connections()


def send_set_password_emails_async(user_ids, existing_account=False):
    """Send in the background so a request (e.g. a bulk upload) doesn't hit the
    server's request timeout."""
    user_ids = list(user_ids)
    if not user_ids:
        return
    threading.Thread(
        target=_run_async, args=(user_ids, existing_account), daemon=True
    ).start()