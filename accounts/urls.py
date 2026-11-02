from django.urls import include, path
from accounts.views import *

urlpatterns = [
    path("", include("rest_framework.urls")),
    # path("", include("django.contrib.auth.urls")),
    path("users", UserList.as_view(), name="user-list"),
    path("users/<int:pk>", UserDetail.as_view(), name="user-detail"),
    path("get-token", GetTokenView.as_view(), name="get-token"),
    path("register", RegisterUserView.as_view(), name="register"),
    # path("change-password", ChangePasswordView.as_view(), name="change-password"),
    path(
        "update-captain-status",
        UpdateCaptainStatus.as_view(),
        name="update-captain-status",
    ),
    # Throttled version of Djoser's reset-password. It must come BEFORE the
    # djoser include so it wins the match for this exact URL.
    path(
        "users/reset_password/",
        ThrottledUserViewSet.as_view({"post": "reset_password"}),
        name="throttled-reset-password",
    ),
    path("", include("djoser.urls")),
]