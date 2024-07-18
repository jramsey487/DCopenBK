from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token

from django.contrib.auth.models import User

from accounts.serializers import *
from api.permissions import IsChairperson
from api.models.ballkid import Ballkid

import logging

logger = logging.getLogger("accounts")


class GetTokenView(ObtainAuthToken):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        logger.info(f"[GetTokenView] request data: {request.data}")

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
        logger.info(f"[UpdateCaptainStatus] request data: {request.data}")

        first_name = request.data["first_name"]
        last_name = request.data["last_name"]
        ballkid = Ballkid.objects.get(first_name=first_name, last_name=last_name)
        user = User.objects.get(first_name=first_name, last_name=last_name)

        logger.info(f"[UpdateCaptainStatus] ballkid {ballkid}; user {user}")

        if ballkid.is_chairperson:
            raise Exception("Cannot change captain status of a chairperson")

        # If promoting to captain, then remove ballkid and add captain as a group
        if request.data["is_captain"]:
            logger.info(f"[UpdateCaptainStatus] Promoting ballkid {ballkid} to captain")
            user.groups.clear()

            captain_group = Group.objects.get(name="captain")
            user.groups.add(captain_group)

        # If demoting from captain, then add ballkid and remove captain asa group
        else:
            logger.info(
                f"[UpdateCaptainStatus] Demoting captain {ballkid} from captain"
            )
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

    # TODO: Consider opening this up to anyone
    permission_classes = [IsChairperson]
    serializer_class = UserSerializer
    model = User

    def post(self, request, format="json"):
        logger.info(f"[RegisterUserView] request data: {request.data}")

        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")
        if first_name != "" and last_name != "":
            request.data["username"] = f"{first_name.lower()}.{last_name.lower()}"

        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            if user:
                group_name = request.data.get("group", None)
                if group_name:
                    logger.info(
                        f"[RegisterUserView] Assigning group {group_name} to user {user}"
                    )
                    group = Group.objects.get(name=group_name)
                    user.groups.add(group)

                ballkid = Ballkid.objects.filter(
                    is_active=True, first_name=first_name, last_name=last_name
                ).first()
                if ballkid:
                    logger.info(
                        f"[RegisterUserView] Assigning user {user} to ballkid {ballkid}"
                    )
                    ballkid.user = user
                    ballkid.save()

                token = Token.objects.create(user=user)
                json = serializer.data
                json["token"] = token.key

                return Response(json, status=status.HTTP_201_CREATED)

        logger.warn(f"[RegisterUser] serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserList(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class UserDetail(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
