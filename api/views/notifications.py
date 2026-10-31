from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.notifications import NotificationSettings, PushSubscription
from api.utils.push_notifications import is_allowed_push_endpoint, web_push_configured

import os


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
                "shift_reminders_enabled": settings_obj.shift_reminders_enabled,
                "team_changes_enabled": settings_obj.team_changes_enabled,
            }
        )

    def patch(self, request):
        settings_obj, _ = NotificationSettings.objects.get_or_create(user=request.user)
        for field in ("shift_reminders_enabled", "team_changes_enabled"):
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