from rest_framework.permissions import (
    SAFE_METHODS,
    BasePermission,
)
from django.db.models import Q


class IsChairpersonOrAuthenticatedReadOnly(BasePermission):
    def has_permission(self, request, view):
        filtered = request.user.groups.filter(name="chairperson")
        if len(filtered) > 0:
            return True

        if request.method in SAFE_METHODS and request.user.is_authenticated:
            return True

        return False


class IsChairperson(BasePermission):
    def has_permission(self, request, view):
        filtered = request.user.groups.filter(name="chairperson")
        return len(filtered) > 0
        # return request.user.is_staff


class IsChairpersonOrTicketing(BasePermission):
    def has_permission(self, request, view):
        return request.user.groups.filter(
            Q(name="chairperson") | Q(name="ticketing")
        ).exists()


class IsChairpersonOrCaptain(BasePermission):
    def has_permission(self, request, view):
        filtered = request.user.groups.filter(Q(name="chairperson") | Q(name="captain"))
        return len(filtered) > 0


class IsChairpersonOrSelf(BasePermission):
    def has_object_permission(self, request, view, obj):
        filtered = request.user.groups.filter(name="chairperson")
        if len(filtered) > 0:
            return True

        return obj.user == request.user
