from django.contrib import admin
from import_export import resources
from import_export.admin import ExportMixin
from .models.ballkid import *
from .models.rating import *
from .models.schedule import *

# Register your models here.


######################
##### RESOURCES ######
######################


class BallkidResource(resources.ModelResource):
    class Meta:
        model = Ballkid


class CalibrationParamsResource(resources.ModelResource):
    class Meta:
        model = CalibrationParams


class CaptainAnalyticsResource(resources.ModelResource):
    class Meta:
        model = CaptainAnalytics


class CaptainHistoryResource(resources.ModelResource):
    class Meta:
        model = CaptainHistory


class CheckinAnalyticsResource(resources.ModelResource):
    class Meta:
        model = CheckinAnalytics


class CheckinHistoryResource(resources.ModelResource):
    class Meta:
        model = CheckinHistory


class CourtAnalyticsResource(resources.ModelResource):
    class Meta:
        model = CourtAnalytics


class CutHistoryResource(resources.ModelResource):
    class Meta:
        model = CutHistory


class FinalsHistoryResource(resources.ModelResource):
    class Meta:
        model = FinalsHistory


class RatingResource(resources.ModelResource):
    class Meta:
        model = Rating


class ScheduleResource(resources.ModelResource):
    class Meta:
        model = Schedule


class CourtNoteResource(resources.ModelResource):
    class Meta:
        model = CourtNote


class TeamHistoryResource(resources.ModelResource):
    class Meta:
        model = TeamHistory


class TournamentResource(resources.ModelResource):
    class Meta:
        model = Tournament


###################
##### ADMINS ######
###################


class BallkidAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [BallkidResource]


class CalibrationParamsAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [CalibrationParamsResource]


class CaptainAnalyticsAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [CaptainAnalyticsResource]


class CaptainHistoryAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [CaptainHistoryResource]


class CheckinAnalyticsAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [CheckinAnalyticsResource]


class CheckinHistoryAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [CheckinHistoryResource]


class CourtAnalyticsAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [CourtAnalyticsResource]


class CutHistoryAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [CutHistoryResource]


class FinalsHistoryAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [FinalsHistoryResource]


class RatingAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [RatingResource]


class ScheduleAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [ScheduleResource]


class CourtNoteAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [CourtNoteResource]
    list_display = ("court", "date", "updated_at", "message")


class TeamHistoryAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [TeamHistoryResource]


class TournamentAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [TournamentResource]


admin.site.register(Ballkid, BallkidAdmin)
admin.site.register(CalibrationParams, CalibrationParamsAdmin)
admin.site.register(CaptainAnalytics, CaptainAnalyticsAdmin)
admin.site.register(CaptainHistory, CaptainHistoryAdmin)
admin.site.register(CheckinAnalytics, CheckinAnalyticsAdmin)
admin.site.register(CheckinHistory, CheckinHistoryAdmin)
admin.site.register(CourtAnalytics, CourtAnalyticsAdmin)
admin.site.register(CutHistory, CutHistoryAdmin)
admin.site.register(FinalsHistory, FinalsHistoryAdmin)
admin.site.register(Rating, RatingAdmin)
admin.site.register(Schedule, ScheduleAdmin)
admin.site.register(CourtNote, CourtNoteAdmin)
admin.site.register(TeamHistory, TeamHistoryAdmin)
admin.site.register(TeamPair)
admin.site.register(Tournament, TournamentAdmin)
