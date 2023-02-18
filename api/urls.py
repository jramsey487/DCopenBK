from django.urls import path, include
from api.views.ballkid import *
from api.views.schedule import *
from api.views.rating import *

# Ballkid URLs
ballkid_urls = [
    path("list", BallkidsList.as_view(), name="list"),
    path("all-list", AllBallkidsList.as_view(), name="all-list"),
    path("sorted-list", BallkidsSortedList.as_view(), name="sorted-list"),
    path("archived-list", BallkidsArchivedList.as_view(), name="archived-list"),
    path("create-ballkid", CreateBallkid.as_view(), name="create-ballkid"),
    path("get-ballkid/<int:pk>", GetBallkid.as_view(), name="get-ballkid"),
    path("update-ballkid", UpdateBallkid.as_view(), name="update-ballkid"),
    path("checkout-all", CheckoutAll.as_view(), name="checkout-all"),
    path("cut-all", CutAll.as_view(), name="cut-all"),
    path("calc-num-teams", CalcNumTeams.as_view(), name="calc-num-teams"),
    path("clear-finals-team", ClearFinalsTeam.as_view(), name="clear-finals-team"),
    path("clear-team", ClearTeam.as_view(), name="clear-team"),
]

# Schedule URLs
schedule_urls = [
    path("get-schedule", GetSchedule.as_view(), name="get-schedule"),
    path("create-schedule", CreateSchedule.as_view(), name="create-schedule"),
    path("add-hour", AddHour.as_view(), name="add-hour"),
    path("update-schedule", UpdateSchedule.as_view(), name="update-schedule"),
]

# Analytics URLs
analytics_urls = [
    path(
        "get-checkin-time/<int:pk>",
        GetCheckinAnalytics.as_view(),
        name="get-checkin-time",
    ),
    path("get-checkins/<int:pk>", GetCheckinHistory.as_view(), name="get-checkins"),
    path("get-past-teams/<int:pk>", GetPastTeams.as_view(), name="get-past-teams"),
    path("get-captains/<int:pk>", GetCaptainAnalytics.as_view(), name="get-captains"),
    path("get-courts/<int:pk>", GetCourtAnalytics.as_view(), name="get-courts"),
    path(
        "get-finals-history/<int:pk>",
        GetFinalsHistory.as_view(),
        name="get-finals-history",
    ),
    path("get-cut-history/<int:pk>", GetCutHistory.as_view(), name="get-cut-history"),
]

# Tournament URLs
tournament_urls = [
    path("show-teams", ShowTeams.as_view(), name="show-teams"),
    path("show-finals-teams", ShowFinalsTeams.as_view(), name="show-finals-teams"),
]

# Rating URLs
rating_urls = [
    path("create-rating", CreateRating.as_view(), name="create-rating"),
    path("ratings", AllRatings.as_view(), name="ratings"),
    path("calibrated-ratings", CalibratedRatings.as_view(), name="calibrated-ratings"),
    path("my-ratings/<int:pk>", MyRatings.as_view(), name="my-ratings"),
    path(
        "calibration-parameters/<int:pk>",
        GetCalibrationParams.as_view(),
        name="calibration-parameters",
    ),
    path(
        "average-calibration-parameters",
        GetAverageCalibrationParams.as_view(),
        name="average-calibration-parameters",
    ),
]


# Debug URLs
debug_urls = [
    path(
        "create-checkin-history",
        CreateCheckinHistory.as_view(),
        name="create-checkin-history",
    ),
    path("create-team-history", CreateTeamHistory.as_view(), name="create-team-history"),
    path(
        "create-captain-history",
        CreateCaptainHistory.as_view(),
        name="create-captain-history",
    ),
    path(
        "create-finals-history",
        CreateFinalsHistory.as_view(),
        name="create-finals-history",
    ),
    path(
        "create-cut-history",
        CreateCutHistory.as_view(),
        name="create-cut-history",
    ),
]

urlpatterns = (
    ballkid_urls
    + schedule_urls
    + analytics_urls
    + tournament_urls
    + rating_urls
    + debug_urls
)
