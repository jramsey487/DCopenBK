from email.mime.image import MIMEImage

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from djoser.email import PasswordChangedConfirmationEmail as DjoserPasswordChangedEmail
from djoser.email import PasswordResetEmail as DjoserPasswordResetEmail

from api.utils.ticket_emails import LOGO_CID, ticket_logo_path


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
