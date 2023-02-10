from django.urls import include, path
from accounts.views import *

urlpatterns = [
    path("", include("rest_framework.urls")),
    # path("", include("django.contrib.auth.urls")),
    path("users", UserList.as_view(), name="user-list"),
    path("users/<int:pk>", UserDetail.as_view(), name="user-detail"),
    path("get-token", GetTokenView.as_view(), name="get-token"),
    path("register", RegisterUserView.as_view(), name="register"),
    path("change-password", ChangePasswordView.as_view(), name="change-password"),
    path(
        "password_reset/",
        include("django_rest_passwordreset.urls", namespace="password_reset"),
    ),
]
