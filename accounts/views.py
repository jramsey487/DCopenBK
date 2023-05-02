from django.shortcuts import render
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth import views as auth_views
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from accounts.serializers import *
from api.permissions import IsChairperson
from api.models.ballkid import Ballkid


class GetTokenView(ObtainAuthToken):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data={
                key: value.lower() if key == "username" else value
                for key, value in request.data.items()
            },
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        ballkid = Ballkid.objects.filter(user=user).first()
        token, created = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "group": user.groups.first().name if user.groups.first() else "",
                "ballkid_id": ballkid.id if ballkid is not None else "",
            },
            status=status.HTTP_200_OK,
        )


class UpdateCaptainStatus(APIView):
    permission_classes = [IsChairperson]
    model = User

    def patch(self, request, format=None):
        first_name = request.data["first_name"]
        last_name = request.data["last_name"]
        ballkid = Ballkid.objects.get(first_name=first_name, last_name=last_name)
        user = User.objects.get(first_name=first_name, last_name=last_name)

        if ballkid.is_chairperson:
            raise Exception("Cannot change captain status of a chairperson")

        # If promoting to captain, then remove ballkid and add captain as a group
        if request.data["is_captain"]:
            user.groups.clear()

            captain_group = Group.objects.get(name="captain")
            user.groups.add(captain_group)

        # If demoting from captain, then add ballkid and remove captain asa group
        else:
            user.groups.clear()

            ballkid_group = Group.objects.get(name="ballkid")
            user.groups.add(ballkid_group)

        user.save()

        return Response(
            f"Successfully updated account group to {user.groups.all()}",
            status=status.HTTP_200_OK,
        )


class RegisterUserView(APIView):
    """
    Registers the user.
    """

    permission_classes = [AllowAny]
    serializer_class = UserSerializer
    model = User

    def post(self, request, format="json"):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            if user:
                token = Token.objects.create(user=user)
                json = serializer.data
                json["token"] = token.key

                return Response(json, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserList(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class UserDetail(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    model = User
    permission_classes = (IsAuthenticated,)

    def get_object(self, queryset=None):
        obj = self.request.user
        return obj

    def update(self, request, *args, **kwargs):
        self.object = self.get_object()
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            # Check old password
            if not self.object.check_password(serializer.data.get("old_password")):
                return Response(
                    {"old_password": ["Wrong password."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # set_password also hashes the password that the user will get
            self.object.set_password(serializer.data.get("new_password"))
            self.object.save()
            response = {
                "status": "success",
                "code": status.HTTP_200_OK,
                "message": "Password updated successfully",
                "data": [],
            }

            return Response(response)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
