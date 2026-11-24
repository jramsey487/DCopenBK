import os
import uuid

from django.db import transaction

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.notifications import NotificationSettings, PushSubscription
from api.permissions import IsChairperson
from api.utils.push_notifications import (
    deliver_push,
    is_allowed_push_endpoint,
    push_recipients,
    web_push_configured,
)

PREF_FIELDS = (
    "shift_reminders_enabled",
    "team_changes_enabled",
    "ticket_updates_enabled",
    "announcements_enabled",
)


class NotificationSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings_obj, _ = NotificationSettings.objects.get_or_create(user=request.user)
        subscriptions = PushSubscription.objects.filter(user=request.user, active=True)
        endpoint = request.query_params.get("endpoint", "")
        return Response(
            {
                "configured": web_push_configured(),
                # Any device on this account.
                "subscribed": subscriptions.exists(),
                # The device making the request (identified by its endpoint).
                "device_subscribed": bool(endpoint)
                and subscriptions.filter(endpoint=endpoint).exists(),
                **{field: getattr(settings_obj, field) for field in PREF_FIELDS},
            }
        )

    def patch(self, request):
        settings_obj, _ = NotificationSettings.objects.get_or_create(user=request.user)
        for field in PREF_FIELDS:
            value = request.data.get(field)
            if isinstance(value, bool):
                setattr(settings_obj, field, value)
        settings_obj.save()
        return self.get(request)


class NotificationSubscribeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        configured = web_push_configured()
        return Response(
            {
                "configured": configured,
                "public_key": (
                    os.environ.get("WEB_PUSH_VAPID_PUBLIC_KEY", "") if configured else ""
                ),
            }
        )

    def post(self, request):
        subscription = request.data.get("subscription") or {}
        endpoint = subscription.get("endpoint")
        keys = subscription.get("keys") or {}
        if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
            return Response({"detail": "Invalid push subscription."}, status=400)
        if not is_allowed_push_endpoint(endpoint):
            return Response({"detail": "Unsupported push service."}, status=400)

        PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                "user": request.user,
                "p256dh": keys["p256dh"],
                "auth": keys["auth"],
                "user_agent": request.META.get("HTTP_USER_AGENT", "")[:2000],
                "active": True,
            },
        )
        return Response({"subscribed": True})

    def delete(self, request):
        """Remove one device (when an endpoint is given) or all of the user's devices."""
        endpoint = request.data.get("endpoint")
        subscriptions = PushSubscription.objects.filter(user=request.user)
        if endpoint:
            subscriptions = subscriptions.filter(endpoint=endpoint)
        subscriptions.delete()
        return Response(
            {
                "subscribed": PushSubscription.objects.filter(
                    user=request.user, active=True
                ).exists()
            }
        )


AUDIENCES = ("all", "captains")
MAX_TITLE = 60
MAX_MESSAGE = 300


def _announcement_recipients(audience):
    return push_recipients(
        pref_field="announcements_enabled", captains_only=audience == "captains"
    )


def _send_announcement(audience, title, message, key):
    payload = {
        "title": title,
        "body": message,
        "url": "/",
        "tag": f"announcement-{key[:12]}",
    }
    for ballkid in _announcement_recipients(audience):
        deliver_push(
            ballkid.user,
            "announcement",
            key,
            payload,
            pref_field="announcements_enabled",
        )


class PushAnnouncementView(APIView):
    """
    Chairperson announcements that go out as push notifications to every
    ballkid (or just captains/chairpeople) with notifications enabled.

    GET  -> how many people each audience would reach right now.
    POST -> {"message", "title"?, "audience": "all" | "captains"}
    """

    permission_classes = [IsChairperson]

    def get(self, request):
        return Response(
            {
                "configured": web_push_configured(),
                "all": len(_announcement_recipients("all")),
                "captains": len(_announcement_recipients("captains")),
            }
        )

    def post(self, request):
        if not web_push_configured():
            return Response(
                {"detail": "Push notifications are not configured on the server."},
                status=400,
            )

        message = str(request.data.get("message") or "").strip()
        title = str(request.data.get("title") or "").strip() or "DC Open Ballcrew"
        audience = request.data.get("audience") or "all"

        if audience not in AUDIENCES:
            return Response({"detail": "Unknown audience."}, status=400)
        if not message:
            return Response({"detail": "Write a message first."}, status=400)
        if len(message) > MAX_MESSAGE:
            return Response(
                {"detail": f"Keep the message under {MAX_MESSAGE} characters."},
                status=400,
            )
        if len(title) > MAX_TITLE:
            return Response(
                {"detail": f"Keep the title under {MAX_TITLE} characters."},
                status=400,
            )

        queued = len(_announcement_recipients(audience))
        if queued == 0:
            return Response(
                {"detail": "Nobody in that group has notifications turned on."},
                status=400,
            )

        # Persist each recipient's notification before returning. A worker can
        # deliver the rows after this request or its Fly machine exits.
        with transaction.atomic():
            _send_announcement(audience, title, message, uuid.uuid4().hex)
        return Response({"queued": queued})