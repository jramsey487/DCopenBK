import os

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.notifications import NotificationSettings, PushSubscription


class NotificationSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings_obj, _ = NotificationSettings.objects.get_or_create(user=request.user)
        return Response(
            {
                "configured": bool(os.environ.get("WEB_PUSH_VAPID_PUBLIC_KEY")),
                "subscribed": PushSubscription.objects.filter(user=request.user, active=True).exists(),
                "shift_reminders_enabled": settings_obj.shift_reminders_enabled,
                "team_changes_enabled": settings_obj.team_changes_enabled,
            }
        )

    def patch(self, request):
        settings_obj, _ = NotificationSettings.objects.get_or_create(user=request.user)
        if "shift_reminders_enabled" in request.data:
            settings_obj.shift_reminders_enabled = bool(request.data["shift_reminders_enabled"])
        if "team_changes_enabled" in request.data:
            settings_obj.team_changes_enabled = bool(request.data["team_changes_enabled"])
        settings_obj.save()
        return self.get(request)


class NotificationSubscribeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "configured": bool(os.environ.get("WEB_PUSH_VAPID_PUBLIC_KEY")),
                "public_key": os.environ.get("WEB_PUSH_VAPID_PUBLIC_KEY", ""),
            }
        )

    def post(self, request):
        subscription = request.data.get("subscription") or {}
        endpoint = subscription.get("endpoint")
        keys = subscription.get("keys") or {}
        if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
            return Response({"detail": "Invalid push subscription."}, status=400)

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
        PushSubscription.objects.filter(user=request.user).delete()
        return Response({"subscribed": False})
