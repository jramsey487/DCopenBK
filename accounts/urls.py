from django.urls import include, path
from rest_framework.authtoken.views import ObtainAuthToken
from accounts.views import *

urlpatterns = [
    path("", include("rest_framework.urls")),
    path("users/", UserList.as_view(), name="user-list"),
    path("users/<int:pk>/", UserDetail.as_view(), name="user-detail"),
    path("get-token/", GetTokenView.as_view(), name="get-token"),
    path("register/", RegisterUserView.as_view(), name="register"),
]
