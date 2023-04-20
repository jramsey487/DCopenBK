from django.test import TestCase
from api.models.ballkid import *
from api.models.schedule import *
from datetime import datetime, timedelta


class TestBallkidModel(TestCase):
    def setUp(self):
        self.ballkid = Ballkid.objects.create(
            first_name="Lacy",
            last_name="Iosue",
            is_checked_in=True,
            current_team=3,
            preferred_position=Position.NB,
            position=Position.N,
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Joe",
            last_name="Iosue",
            is_checked_in=True,
            preferred_position=Position.NB,
            position=Position.N,
        )

    def test_get_name(self):
        self.assertEqual(self.ballkid.get_name(), "Lacy Iosue")

    def test_set_field_checkin(self):
        self.ballkid.is_checked_in = False

        self.ballkid.set_field("is_checked_in", True)
        self.assertTrue(self.ballkid.is_checked_in)

    def test_set_field_position(self):
        self.ballkid.position = Position.B

        self.ballkid.set_field("position", Position.N)
        self.assertEqual(Position.N, self.ballkid.position)

    def test_set_field_preferred_position(self):
        self.ballkid.preferred_position = Position.NB

        self.ballkid.set_field("preferred_position", Position.B)
        self.assertEqual(Position.B, self.ballkid.preferred_position)

    def test_set_field_team(self):
        self.ballkid.current_team = 3

        self.ballkid.set_field("current_team", 2)
        self.assertEqual(2, self.ballkid.current_team)

    def test_set_field_promote_to_captain_unassigned(self):
        self.ballkid2.set_field("current_team", 3)
        self.assertEqual(0, len(CaptainHistory.objects.all()))
        self.assertEqual(0, len(CaptainAnalytics.objects.all()))

        self.ballkid2.set_field("current_team", 0)
        self.ballkid2.set_field("is_captain", True)
        self.ballkid2.set_field("current_team", 3)
        self.assertEqual(1, len(CaptainHistory.objects.all()))
        self.assertEqual(1, len(CaptainAnalytics.objects.all()))

    def test_set_field_promote_to_captain_assigned(self):
        self.ballkid2.set_field("current_team", 3)
        self.assertEqual(0, len(CaptainHistory.objects.all()))
        self.assertEqual(0, len(CaptainAnalytics.objects.all()))

        self.ballkid2.set_field("is_captain", True)
        self.assertEqual(1, len(CaptainHistory.objects.all()))
        self.assertEqual(1, len(CaptainAnalytics.objects.all()))

    def test_set_field_demote_from_captain_unassigned_none(self):
        self.ballkid2.set_field("current_team", 3)
        self.assertEqual(0, len(CaptainHistory.objects.all()))
        self.assertEqual(0, len(CaptainAnalytics.objects.all()))

        self.ballkid2.set_field("current_team", 0)
        self.ballkid2.set_field("is_captain", True)
        self.ballkid2.set_field("is_captain", False)
        self.ballkid2.set_field("current_team", 3)
        self.assertEqual(0, len(CaptainHistory.objects.all()))
        self.assertEqual(0, len(CaptainAnalytics.objects.all()))

    def test_set_field_demote_from_captain_unassigned_one(self):
        self.ballkid2.set_field("current_team", 3)
        self.ballkid2.set_field("is_captain", True)
        self.assertEqual(1, len(CaptainHistory.objects.all()))
        self.assertEqual(1, len(CaptainAnalytics.objects.all()))

        self.ballkid2.set_field("current_team", 0)
        self.ballkid2.set_field("is_captain", False)
        self.assertEqual(1, len(CaptainHistory.objects.all()))
        self.assertEqual(1, len(CaptainAnalytics.objects.all()))

    def test_set_field_demote_from_captain_assigned(self):
        self.ballkid2.set_field("is_captain", True)
        self.ballkid2.set_field("current_team", 3)
        self.assertEqual(1, len(CaptainHistory.objects.all()))
        history = CaptainHistory.objects.first()
        self.assertIsNone(history.end)
        self.assertEqual(1, len(CaptainAnalytics.objects.all()))

        self.ballkid2.set_field("is_captain", False)
        self.assertEqual(1, len(CaptainHistory.objects.all()))
        history = CaptainHistory.objects.first()
        self.assertIsNotNone(history.end)
        self.assertEqual(1, len(CaptainAnalytics.objects.all()))

    def test_get_preferred_position_switch(self):
        self.assertEqual(Position.N, self.ballkid.get_preferred_position())

    def test_get_preferred_position_nonswitch(self):
        self.ballkid.preferred_position = Position.N

        self.assertEqual(Position.N, self.ballkid.get_preferred_position())

    def test_get_preferred_position_bn(self):
        self.ballkid.preferred_position = Position.BN

        self.assertEqual(Position.B, self.ballkid.get_preferred_position())

    def test_validate_no_change(self):
        self.ballkid.validate()

        self.ballkid.refresh_from_db()
        self.assertTrue(self.ballkid.is_checked_in)
        self.assertEqual(3, self.ballkid.current_team)
        self.assertEqual(Position.N, self.ballkid.position)
        self.assertEqual(Position.NB, self.ballkid.preferred_position)

    def test_validate_unassign(self):
        self.ballkid.position = Position.B
        self.ballkid.current_team = 0
        self.assertEqual(Position.B, self.ballkid.position)

        self.ballkid.validate()
        self.ballkid.refresh_from_db()
        self.assertTrue(self.ballkid.is_checked_in)
        self.assertEqual(0, self.ballkid.current_team)
        self.assertEqual(Position.N, self.ballkid.position)
        self.assertEqual(Position.NB, self.ballkid.preferred_position)

    def test_validate_checkout(self):
        self.ballkid.position = Position.B
        self.ballkid.is_checked_in = False
        self.assertEqual(3, self.ballkid.current_team)
        self.assertEqual(Position.B, self.ballkid.position)

        self.ballkid.validate()
        self.ballkid.refresh_from_db()
        self.assertFalse(self.ballkid.is_checked_in)
        self.assertEqual(0, self.ballkid.current_team)
        self.assertEqual(Position.N, self.ballkid.position)
        self.assertEqual(Position.NB, self.ballkid.preferred_position)
