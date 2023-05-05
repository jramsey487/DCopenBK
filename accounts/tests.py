from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework.authtoken.models import Token
from rest_framework import status
from django.contrib.auth.models import User, Group
from api.models.ballkid import Ballkid


class AccountsTest(APITestCase):
    def setUp(self):
        # We want to go ahead and originally create a user.
        self.test_user = User.objects.create_user(
            "testuser", "test@example.com", "testpassword"
        )

    def test_create_user(self):
        """
        Ensure we can create a new user and a valid token is created with it.
        """
        self.assertEqual(User.objects.count(), 1)

        data = {
            "username": "foobar",
            "email": "foobar@example.com",
            "password": "somepassword",
            "password2": "somepassword",
        }
        response = self.client.post(reverse("register"), data, format="json")
        user = User.objects.latest("id")

        self.assertEqual(User.objects.count(), 2)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["username"], data["username"])
        self.assertEqual(response.data["email"], data["email"])
        self.assertFalse("password" in response.data)

        token = Token.objects.get(user=user)
        self.assertEqual(response.data["token"], token.key)

    def test_create_user_with_short_password(self):
        """
        Ensure user is not created for password lengths less than 8.
        """
        data = {"username": "foobar", "email": "foobarbaz@example.com", "password": "foo"}
        response = self.client.post(reverse("register"), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(len(response.data["password"]), 1)

    def test_create_user_with_no_password(self):
        data = {"username": "foobar", "email": "foobarbaz@example.com", "password": ""}
        response = self.client.post(reverse("register"), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(len(response.data["password"]), 1)

    def test_create_user_with_too_long_username(self):
        data = {
            "username": "foo" * 30,
            "email": "foobarbaz@example.com",
            "password": "foobar",
        }
        response = self.client.post(reverse("register"), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(len(response.data["username"]), 1)

    def test_create_user_with_no_username(self):
        data = {"username": "", "email": "foobarbaz@example.com", "password": "foobar"}
        response = self.client.post(reverse("register"), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(len(response.data["username"]), 1)

    def test_create_user_with_inferred_username(self):
        data = {
            "first_name": "Lacy",
            "last_name": "Iosue",
            "email": "foobarbaz@example.com",
            "password": "foobarfoo",
            "password2": "foobarfoo",
        }
        response = self.client.post(reverse("register"), data, format="json")
        user = User.objects.latest("id")

        self.assertEqual(User.objects.count(), 2)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual("lacy.iosue", user.username)
        self.assertEqual("foobarbaz@example.com", user.email)
        self.assertFalse("password" in response.data)

        token = Token.objects.get(user=user)
        self.assertEqual(response.data["token"], token.key)

    def test_create_user_with_preexisting_username(self):
        data = {
            "username": "testuser",
            "email": "user@example.com",
            "password": "testuser",
        }
        response = self.client.post(reverse("register"), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(len(response.data["username"]), 1)

    def test_create_user_with_invalid_email(self):
        data = {"username": "foobarbaz", "email": "testing", "passsword": "foobarbaz"}
        response = self.client.post(reverse("register"), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(len(response.data["email"]), 1)

    def test_create_user_with_no_email(self):
        data = {"username": "foobar", "email": "", "password": "foobarbaz"}
        response = self.client.post(reverse("register"), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(len(response.data["email"]), 1)

    def test_login_existing_user(self):
        data = {
            "username": "testuser",
            "password": "testpassword",
        }
        response = self.client.post(reverse("get-token"), data, format="json")
        self.assertTrue("token" in response.json())
        self.assertIsNotNone(response.json()["token"])

    def test_login_existing_user_wrong_password(self):
        data = {
            "username": "testuser",
            "password": "password",
        }
        response = self.client.post(reverse("get-token"), data, format="json")
        self.assertFalse("token" in response.json())

    def test_login_existing_user_capitalized_user(self):
        data = {
            "username": "Testuser",
            "password": "testpassword",
        }
        response = self.client.post(reverse("get-token"), data, format="json")
        self.assertTrue("token" in response.json())
        self.assertIsNotNone(response.json()["token"])

    def test_login_existing_user_capitalized_password(self):
        data = {
            "username": "testuser",
            "password": "Testpassword",
        }
        response = self.client.post(reverse("get-token"), data, format="json")
        self.assertFalse("token" in response.json())

    def test_login_user_not_found(self):
        data = {
            "username": "user",
            "password": "testpassword",
        }
        response = self.client.post(reverse("get-token"), data, format="json")
        self.assertFalse("token" in response.json())


class UpdateCaptainStatusTest(APITestCase):
    def setUp(self):
        ballkid_group = Group.objects.create(name="ballkid")
        captain_group = Group.objects.create(name="captain")
        chairperson_group = Group.objects.create(name="chairperson")

        # Create chairperson ballkid and user
        self.chairperson = Ballkid.objects.create(
            first_name="Lacy", last_name="Iosue", is_chairperson=True
        )
        self.chairperson_user = User.objects.create(
            username="chairperson", first_name="Lacy", last_name="Iosue"
        )
        self.chairperson_user.groups.add(chairperson_group)
        self.chairperson_user.save()

        # Create ballkid ballkid and user
        self.ballkid = Ballkid.objects.create(first_name="Andrea", last_name="Iosue")
        self.ballkid_user = User.objects.create(
            username="ballkid", first_name="Andrea", last_name="Iosue"
        )
        self.ballkid_user.groups.add(ballkid_group)
        self.ballkid_user.save()

        # Create captain ballkid and user
        self.captain = Ballkid.objects.create(first_name="Joe", last_name="Iosue")
        self.captain_user = User.objects.create(
            username="captain", first_name="Joe", last_name="Iosue"
        )
        self.captain_user.groups.add(captain_group)
        self.captain_user.save()

        self.url = reverse("update-captain-status")
        self.client = APIClient()
        self.client.force_authenticate(user=self.chairperson_user)

    def test_cannot_modify_chairperson(self):
        self.assertEqual(3, User.objects.count())

        data = {"first_name": "Lacy", "last_name": "Iosue", "is_captain": True}
        with self.assertRaises(Exception):
            self.client.patch(self.url, data, format="json")

        data = {"first_name": "Lacy", "last_name": "Iosue", "is_captain": False}
        with self.assertRaises(Exception):
            self.client.patch(self.url, data, format="json")

    def test_no_change(self):
        self.assertEqual(3, User.objects.count())
        self.assertEqual(1, self.ballkid_user.groups.count())
        self.assertEqual("ballkid", self.ballkid_user.groups.first().name)

        data = {"first_name": "Andrea", "last_name": "Iosue", "is_captain": False}
        response = self.client.patch(self.url, data, format="json")

        self.assertEqual(1, self.ballkid_user.groups.count())
        self.assertEqual("ballkid", self.ballkid_user.groups.first().name)

    def test_promote_to_captain(self):
        self.assertEqual(3, User.objects.count())
        self.assertEqual(1, self.ballkid_user.groups.count())
        self.assertEqual("ballkid", self.ballkid_user.groups.first().name)

        data = {"first_name": "Andrea", "last_name": "Iosue", "is_captain": True}
        response = self.client.patch(self.url, data, format="json")

        self.assertEqual(1, self.ballkid_user.groups.count())
        self.assertEqual("captain", self.ballkid_user.groups.first().name)

    def test_demote_from_captain(self):
        self.assertEqual(3, User.objects.count())
        self.assertEqual(1, self.captain_user.groups.count())
        self.assertEqual("captain", self.captain_user.groups.first().name)

        data = {"first_name": "Joe", "last_name": "Iosue", "is_captain": False}
        response = self.client.patch(self.url, data, format="json")

        self.assertEqual(1, self.captain_user.groups.count())
        self.assertEqual("ballkid", self.captain_user.groups.first().name)


# class PasswordResetTest(APITestCase):

#     # endpoints needed
#     register_url = "/accounts/users/"
#     activate_url = "/accounts/users/activation/"
#     login_url = "/accounts/token/login/"
#     send_reset_password_email_url = "/accounts/users/reset_password/"
#     confirm_reset_password_url = "/accounts/users/reset_password_confirm/"

#     # user infofmation
#     user_data = {
#         "email": "test@example.com",
#         "username": "test_user",
#         "password": "verysecret",
#     }
#     login_data = {"email": "test@example.com", "password": "verysecret"}

#     def test_reset_password(self):
#         # register the new user
#         response = self.client.post(self.register_url, self.user_data, format="json")
#         # expected response
#         self.assertEqual(response.status_code, status.HTTP_201_CREATED)
#         # expected one email to be send
#         self.assertEqual(len(mail.outbox), 1)

#         # parse email to get uid and token
#         email_lines = mail.outbox[0].body.splitlines()
#         activation_link = [l for l in email_lines if "/activate/" in l][0]
#         uid, token = activation_link.split("/")[-2:]

#         # verify email
#         data = {"uid": uid, "token": token}
#         response = self.client.post(self.activate_url, data, format="json")
#         self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

#         # reset password
#         data = {"email": self.user_data["email"]}
#         response = self.client.post(
#             self.send_reset_password_email_url, data, format="json"
#         )
#         self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

#         # parse reset-password email to get uid and token
#         # it is a second email!
#         email_lines = mail.outbox[1].body.splitlines()
#         reset_link = [l for l in email_lines if "/reset_password/" in l][0]
#         uid, token = activation_link.split("/")[-2:]

#         # confirm reset password
#         data = {"uid": uid, "token": token, "new_password": "new_verysecret"}
#         response = self.client.post(self.confirm_reset_password_url, data, format="json")
#         self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

#         # login to get the authentication token with old password
#         response = self.client.post(self.login_url, self.login_data, format="json")
#         self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

#         # login to get the authentication token with new password
#         login_data = dict(self.login_data)
#         login_data["password"] = "new_verysecret"
#         response = self.client.post(self.login_url, login_data, format="json")
#         self.assertEqual(response.status_code, status.HTTP_200_OK)

#     def test_reset_password_inactive_user(self):
#         # register the new user
#         response = self.client.post(self.register_url, self.user_data, format="json")
#         self.assertEqual(response.status_code, status.HTTP_201_CREATED)

#         # reset password for inactive user
#         data = {"email": self.user_data["email"]}
#         response = self.client.post(
#             self.send_reset_password_email_url, data, format="json"
#         )
#         self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
#         # the email wasnt send
#         self.assertEqual(len(mail.outbox), 1)

#     def test_reset_password_wrong_email(self):
#         data = {"email": "wrong@email.com"}
#         response = self.client.post(
#             self.send_reset_password_email_url, data, format="json"
#         )
#         self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
#         # the email wasnt send
#         self.assertEqual(len(mail.outbox), 0)
