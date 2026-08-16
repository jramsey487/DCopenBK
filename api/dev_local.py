"""Create ballkids and login accounts for local development."""

from django.conf import settings
from django.contrib.auth.models import Group, User
from rest_framework.authtoken.models import Token

from api.models.ballkid import Ballkid
from api.utils.consts import DEFAULT_IMAGE_FILE

DEV_ROLES = ("ballkid", "captain", "chairperson", "ticketing")
DEFAULT_DEV_PASSWORD = "password"


def require_debug_mode():
    if not settings.DEBUG:
        raise RuntimeError(
            "Dev-only helpers require DEBUG=True (local settings)."
        )


def ensure_dev_groups():
    for name in DEV_ROLES:
        Group.objects.get_or_create(name=name)


def dev_username(first_name, last_name):
    return f"{first_name.strip().lower()}.{last_name.strip().lower()}"


def create_dev_user(
    *,
    first_name,
    last_name,
    role,
    email=None,
    password=DEFAULT_DEV_PASSWORD,
    preferred_position="Back",
    num_years_experience=0,
    date_of_birth=None,
    with_login=True,
):
    """
    Create or update a local-dev login. Ballkids, captains, and chairpersons
    get a ballkid profile. Ticketing is a login-only staff account (no profile).
    """
    require_debug_mode()
    ensure_dev_groups()

    if role not in DEV_ROLES:
        raise ValueError(f"role must be one of: {', '.join(DEV_ROLES)}")

    first_name = first_name.strip()
    last_name = last_name.strip()

    if role == "ticketing":
        if not with_login:
            raise ValueError("Ticketing accounts need a login user.")
        username = dev_username(first_name, last_name)
        email = email or f"{username}@example.com"
        user, user_created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
            },
        )
        if user_created:
            user.set_password(password)
            user.save()
        else:
            user.first_name = first_name
            user.last_name = last_name
            user.email = email
            user.save(update_fields=["first_name", "last_name", "email"])
        user.groups.set([Group.objects.get(name="ticketing")])
        Token.objects.get_or_create(user=user)
        Ballkid.all_objects.filter(user=user).delete()
        return None, user

    is_captain = role == "captain"
    is_chairperson = role == "chairperson"

    ballkid_defaults = {
        "preferred_position": preferred_position,
        "num_years_experience": num_years_experience,
        "is_captain": is_captain,
        "is_chairperson": is_chairperson,
        "image": DEFAULT_IMAGE_FILE,
    }
    if date_of_birth is not None:
        ballkid_defaults["date_of_birth"] = date_of_birth

    ballkid, created = Ballkid.objects.get_or_create(
        first_name=first_name,
        last_name=last_name,
        defaults=ballkid_defaults,
    )
    if not created:
        ballkid.is_captain = is_captain
        ballkid.is_chairperson = is_chairperson
        ballkid.preferred_position = preferred_position
        ballkid.num_years_experience = num_years_experience
        if date_of_birth is not None:
            ballkid.date_of_birth = date_of_birth

    ballkid.validate()
    ballkid.save()

    user = None
    if with_login:
        username = dev_username(first_name, last_name)
        email = email or f"{username}@example.com"
        user, user_created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
            },
        )
        if user_created:
            user.set_password(password)
            user.save()

        user.groups.set([Group.objects.get(name=role)])
        Token.objects.get_or_create(user=user)

        ballkid.user = user
        ballkid.save()

    return ballkid, user
