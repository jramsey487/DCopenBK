from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import User, Group
from djoser.conf import settings
from djoser.serializers import TokenCreateSerializer


class UserSerializer(serializers.ModelSerializer):
    MAX_LENGTH = 32

    email = serializers.EmailField(required=True)
    username = serializers.CharField(
        max_length=MAX_LENGTH, validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        min_length=8, max_length=MAX_LENGTH, write_only=True, required=True
    )
    password2 = serializers.CharField(write_only=True, required=True)
    first_name = serializers.CharField(max_length=MAX_LENGTH, default="")
    last_name = serializers.CharField(max_length=MAX_LENGTH, default="")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            validated_data["username"],
            validated_data["email"],
            validated_data["password"],
        )
        user.first_name = validated_data["first_name"]
        user.last_name = validated_data["last_name"]

        for group_name in validated_data.get("groups", []):
            group = Group.objects.get(name=group_name)
            user.groups.add(group)

        user.save()
        return user

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "password",
            "password2",
            "first_name",
            "last_name",
            "groups",
        )


class ChangePasswordSerializer(serializers.Serializer):
    model = User

    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)


User = get_user_model()


class CustomTokenCreateSerializer(TokenCreateSerializer):
    def validate(self, attrs):
        password = attrs.get("password")
        params = {settings.LOGIN_FIELD: attrs.get(settings.LOGIN_FIELD)}
        self.user = authenticate(
            request=self.context.get("request"), **params, password=password
        )
        if not self.user:
            self.user = User.objects.filter(**params).first()
            if self.user and not self.user.check_password(password):
                self.fail("invalid_credentials")
        if self.user:  # and self.user.is_active:
            return attrs
        self.fail("invalid_credentials")
