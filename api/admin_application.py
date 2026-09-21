"""
Admin registration for the ballcrew application feature.

Merge this into your existing api/admin.py (don't overwrite it -- I don't
have your current admin.py, so these are meant to be added alongside
whatever's already registered there, e.g. Ballkid, Rating, etc.)
"""

from django.contrib import admin

from api.models.application import ApplicationSettings, BallcrewApplication, TryoutReview


class TryoutReviewInline(admin.TabularInline):
    model = TryoutReview
    extra = 0
    readonly_fields = ["reviewer", "submitted_at"]


@admin.register(ApplicationSettings)
class ApplicationSettingsAdmin(admin.ModelAdmin):
    list_display = ["is_open"]

    def has_add_permission(self, request):
        # Singleton row -- created automatically by get_solo(), never add more.
        return not ApplicationSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(BallcrewApplication)
class BallcrewApplicationAdmin(admin.ModelAdmin):
    list_display = [
        "full_name",
        "email",
        "is_veteran",
        "status",
        "submitted_at",
    ]
    list_filter = ["status", "is_veteran", "submitted_at"]
    search_fields = ["first_name", "last_name", "email"]
    readonly_fields = ["submitted_at", "reviewed_by", "reviewed_at"]
    inlines = [TryoutReviewInline]
    # Default admin already supports selecting rows + "Delete selected"
    # from the actions dropdown -- no extra code needed for bulk delete.


@admin.register(TryoutReview)
class TryoutReviewAdmin(admin.ModelAdmin):
    list_display = ["application", "reviewer", "tryout_date", "recommendation"]
    list_filter = ["recommendation", "tryout_date"]
    readonly_fields = ["submitted_at"]
