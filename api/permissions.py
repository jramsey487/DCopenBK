from rest_framework.permissions import (
    SAFE_METHODS,
    BasePermission,
)
from django.db.models import Q


def is_chairperson_or_superuser(user):
    """
    Superusers sit above the chairperson role.

    A normal chairperson is identified by membership in the
    "chairperson" Django group.

    A superuser does not need to be added to that group; Django's
    is_superuser flag gives them chairperson-level application access.
    """
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return user.groups.filter(name="chairperson").exists()


class IsChairpersonOrAuthenticatedReadOnly(BasePermission):
    def has_permission(self, request, view):
        if is_chairperson_or_superuser(request.user):
            return True

        if request.method in SAFE_METHODS and request.user.is_authenticated:
            return True

        return False


class IsChairperson(BasePermission):
    def has_permission(self, request, view):
        return is_chairperson_or_superuser(request.user)


class IsChairpersonOrTicketing(BasePermission):
    def has_permission(self, request, view):
        if is_chairperson_or_superuser(request.user):
            return True

        return request.user.groups.filter(
            Q(name="ticketing")
        ).exists()


class IsChairpersonOrCaptain(BasePermission):
    def has_permission(self, request, view):
        if is_chairperson_or_superuser(request.user):
            return True

        return request.user.groups.filter(
            Q(name="captain") | Q(name="chairperson")
        ).exists()


class IsChairpersonOrSelf(BasePermission):
    def has_object_permission(self, request, view, obj):
        if is_chairperson_or_superuser(request.user):
            return True

        return obj.user == request.user