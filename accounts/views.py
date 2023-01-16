from logging import raiseExceptions
from django.shortcuts import render
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from accounts.serializers import UserSerializer
from api.models.ballkid import Ballkid


class GetTokenView(ObtainAuthToken):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        ballkid = Ballkid.objects.filter(user=user).first()
        token, created = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "group": user.groups.all()[0].name,
                "ballkid_id": ballkid.id if ballkid is not None else "",
            },
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
