"""Throttles for the login and password-reset endpoints.

Rates are set on the classes (not settings.py) so this feature is self-contained.

Two layers on login: a generous per-IP limit (the whole ballcrew can be on the
same venue wifi, so one IP must be able to log in many people) and a strict
per-username limit that actually stops password guessing.

Note: DRF's default cache is per-process, so with 2 gunicorn workers the
effective limits are up to 2x these numbers.
"""

import hashlib

from rest_framework.throttling import SimpleRateThrottle


def client_ip(request):
    # Fly's proxy sets Fly-Client-IP itself, so unlike X-Forwarded-For a caller
    # can't spoof it. REMOTE_ADDR covers local dev.
    return request.META.get("HTTP_FLY_CLIENT_IP") or request.META.get(
        "REMOTE_ADDR", ""
    )


def _body_value(request, key):
    data = request.data
    if not hasattr(data, "get"):
        return ""
    value = data.get(key, "")
    return str(value).strip().lower() if value else ""


class _KeyedThrottle(SimpleRateThrottle):
    def key_value(self, request):
        raise NotImplementedError

    def get_cache_key(self, request, view):
        value = self.key_value(request)
        if not value:
            return None  # nothing to key on; the other throttle still applies
        ident = hashlib.sha256(value.encode("utf-8")).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LoginIPThrottle(_KeyedThrottle):
    scope = "login-ip"
    rate = "100/min"

    def key_value(self, request):
        return client_ip(request)


class LoginUsernameThrottle(_KeyedThrottle):
    scope = "login-user"
    rate = "20/hour"

    def key_value(self, request):
        return _body_value(request, "username")


class PasswordResetIPThrottle(_KeyedThrottle):
    scope = "reset-ip"
    rate = "20/hour"

    def key_value(self, request):
        return client_ip(request)


class PasswordResetEmailThrottle(_KeyedThrottle):
    # Stops someone email-bombing a victim's inbox with reset links.
    scope = "reset-email"
    rate = "5/hour"

    def key_value(self, request):
        return _body_value(request, "email")