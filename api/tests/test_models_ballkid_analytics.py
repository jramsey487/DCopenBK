from django.test import TestCase
from api.models.ballkid import *
from api.models.schedule import *
from datetime import datetime, timedelta


class TestBallkidModelAnalytics(TestCase):
    def setUp(self):
        self.ballkid = Ballkid.objects.create(first_name="Lacy", last_name="Iosue")
        self.ballkid2 = Ballkid.objects.create(first_name="Joe", last_name="Iosue")
        self.captain = Ballkid.objects.create(
            first_name="Andrea", last_name="Iosue", is_captain=True
        )
        self.captain2 = Ballkid.objects.create(
            first_name="Bird", last_name="Iosue", is_captain=True
        )

    def test_handle_checkin_history_new_row_checking_in(self):
        self.assertEqual(0, len(CheckinHistory.objects.all()))

        self.ballkid.handle_checkin_history(True)
        self.ballkid.is_checked_in = True
        self.assertEqual(1, len(CheckinHistory.objects.all()))
        self.assertEqual(1, len(CheckinHistory.objects.filter(ballkid=self.ballkid)))

    def test_handle_checkin_history_no_existing_row_check_out(self):
        self.assertEqual(0, len(CheckinHistory.objects.all()))

        self.ballkid.handle_checkin_history(False)
        self.ballkid.is_checked_in = False
        self.assertEqual(0, len(CheckinHistory.objects.all()))

    def test_handle_checkin_history_existing_row_check_out(self):
        self.assertEqual(0, len(CheckinHistory.objects.all()))

        self.ballkid.handle_checkin_history(True, now=datetime(2022, 1, 1, 10, 30))
        self.ballkid.is_checked_in = True

        self.ballkid.handle_checkin_history(False, now=datetime(2022, 1, 1, 11, 30))
        self.ballkid.is_checked_in = False
        self.assertEqual(1, len(CheckinHistory.objects.filter(ballkid=self.ballkid)))

        history = CheckinHistory.objects.first()
        self.assertEqual(timedelta(hours=1), history.duration)

    def test_handle_checkin_history_many_hours_check_out(self):
        self.assertEqual(0, len(CheckinHistory.objects.all()))

        self.ballkid.handle_checkin_history(True, now=datetime(2022, 1, 1, 10, 30))
        self.ballkid.is_checked_in = True

        self.ballkid.handle_checkin_history(False, now=datetime(2022, 1, 1, 18, 45))
        self.ballkid.is_checked_in = False

        self.assertEqual(1, len(CheckinHistory.objects.filter(ballkid=self.ballkid)))

        history = CheckinHistory.objects.first()
        self.assertEqual(timedelta(hours=8, minutes=15), history.duration)

    def test_handle_checkin_history_mult_histories(self):
        self.assertEqual(0, len(CheckinHistory.objects.all()))

        self.ballkid.handle_checkin_history(True, now=datetime(2022, 1, 1, 10, 30))
        self.ballkid.is_checked_in = True
        self.ballkid.handle_checkin_history(False, now=datetime(2022, 1, 1, 18, 45))
        self.ballkid.is_checked_in = False
        self.assertEqual(1, len(CheckinHistory.objects.filter(ballkid=self.ballkid)))

        self.ballkid.handle_checkin_history(True, now=datetime(2022, 1, 2, 15, 30))
        self.ballkid.is_checked_in = True
        self.ballkid.handle_checkin_history(False, now=datetime(2022, 1, 2, 18, 31))
        self.ballkid.is_checked_in = False
        self.assertEqual(2, len(CheckinHistory.objects.filter(ballkid=self.ballkid)))

        histories = CheckinHistory.objects.all().order_by("start")
        self.assertEqual(2, len(histories))
        history1 = histories.first()
        history2 = histories.last()
        self.assertEqual(timedelta(hours=8, minutes=15), history1.duration)
        self.assertEqual(timedelta(hours=3, minutes=1), history2.duration)

    def test_handle_checkin_history_mult_histories_is_first_checkin(self):
        self.assertEqual(0, len(CheckinHistory.objects.all()))

        self.ballkid.handle_checkin_history(True, now=datetime(2022, 1, 1, 10, 30))
        self.ballkid.is_checked_in = True
        self.ballkid.handle_checkin_history(False, now=datetime(2022, 1, 1, 18, 45))
        self.ballkid.is_checked_in = False
        self.assertEqual(1, len(CheckinHistory.objects.filter(ballkid=self.ballkid)))

        self.ballkid.handle_checkin_history(True, now=datetime(2022, 1, 1, 20, 30))
        self.ballkid.is_checked_in = True
        self.ballkid.handle_checkin_history(False, now=datetime(2022, 1, 1, 23, 31))
        self.ballkid.is_checked_in = False
        self.assertEqual(2, len(CheckinHistory.objects.filter(ballkid=self.ballkid)))

        histories = CheckinHistory.objects.all().order_by("start")
        self.assertEqual(2, len(histories))
        history1 = histories.first()
        history2 = histories.last()
        self.assertEqual(timedelta(hours=8, minutes=15), history1.duration)
        self.assertTrue(history1.is_first_checkin)
        self.assertEqual(timedelta(hours=3, minutes=1), history2.duration)
        self.assertFalse(history2.is_first_checkin)

    def test_handle_checkin_history_checkout_before_checkin(self):
        self.ballkid.handle_checkin_history(True, now=datetime(2022, 1, 1, 10, 30))
        self.ballkid.is_checked_in = True
        with self.assertRaises(Exception):
            self.ballkid.handle_checkin_history(False, now=datetime(2022, 1, 1, 8, 45)),
            self.ballkid.is_checked_in = False

    def test_handle_checkin_history_mult_ballkids(self):
        self.assertEqual(0, len(CheckinHistory.objects.all()))

        self.ballkid.handle_checkin_history(True, now=datetime(2022, 1, 1, 10, 30))
        self.ballkid.is_checked_in = True
        self.ballkid.handle_checkin_history(False, now=datetime(2022, 1, 1, 18, 45))
        self.ballkid.is_checked_in = False
        self.assertEqual(1, len(CheckinHistory.objects.filter(ballkid=self.ballkid)))

        self.ballkid2.handle_checkin_history(True, now=datetime(2022, 1, 2, 15, 30))
        self.ballkid.is_checked_in = True
        self.ballkid2.handle_checkin_history(False, now=datetime(2022, 1, 2, 18, 31))
        self.ballkid.is_checked_in = False
        self.assertEqual(1, len(CheckinHistory.objects.filter(ballkid=self.ballkid)))

    def test_handle_checkin_history_same_value(self):
        self.ballkid.is_checked_in = True
        self.ballkid.handle_checkin_history(True, now=datetime(2022, 1, 1, 10, 30))
        self.ballkid.is_checked_in = True
        self.assertEqual(0, len(CheckinHistory.objects.filter(ballkid=self.ballkid)))

    def test_handle_team_history_unassigned_to_team(self):
        start = datetime(2022, 1, 1, 10, 30)
        self.ballkid.handle_team_history(3, now=start)
        self.ballkid.current_team = 3
        self.assertEqual(1, len(TeamHistory.objects.filter(ballkid=self.ballkid)))

        history = TeamHistory.objects.first()
        self.assertEqual(start, history.start)
        self.assertIsNone(history.end)
        self.assertEqual(timedelta(), history.duration)

    def test_handle_team_history_team_to_team(self):
        time1 = datetime(2022, 1, 1, 10, 30)
        time2 = datetime(2022, 1, 1, 11, 30)
        self.ballkid.handle_team_history(3, now=time1)
        self.ballkid.current_team = 3

        self.ballkid.handle_team_history(5, now=time2)
        self.ballkid.current_team = 5
        self.assertEqual(2, len(TeamHistory.objects.filter(ballkid=self.ballkid)))

        histories = TeamHistory.objects.all().order_by("team")
        history1 = histories.first()
        history2 = histories.last()
        self.assertEqual(time1, history1.start)
        self.assertEqual(time2, history1.end)
        self.assertEqual(timedelta(hours=1), history1.duration)

        self.assertEqual(time2, history2.start)
        self.assertIsNone(history2.end)
        self.assertEqual(timedelta(), history2.duration)

    def test_handle_team_history_team_to_unassigned(self):
        time1 = datetime(2022, 1, 1, 10, 30)
        time2 = datetime(2022, 1, 1, 11, 30)
        self.ballkid.handle_team_history(3, now=time1)
        self.ballkid.current_team = 3

        self.ballkid.handle_team_history(0, now=time2)
        self.ballkid.current_team = 0
        self.assertEqual(1, len(TeamHistory.objects.filter(ballkid=self.ballkid)))

        history = TeamHistory.objects.first()
        self.assertEqual(time1, history.start)
        self.assertEqual(time2, history.end)
        self.assertEqual(timedelta(hours=1), history.duration)

    def test_handle_team_history_end_after_start(self):
        time1 = datetime(2022, 1, 1, 10, 30)
        time2 = datetime(2022, 1, 1, 8, 30)
        self.ballkid.handle_team_history(3, now=time1)
        self.ballkid.current_team = 3

        with self.assertRaises(Exception):
            self.ballkid.handle_team_history(0, now=time2)
            self.ballkid.current_team = 0

        histories = TeamHistory.objects.filter(ballkid=self.ballkid)
        self.assertEqual(1, len(histories))
        history = histories.first()
        self.assertEqual(time1, history.start)
        self.assertIsNone(history.end)
        self.assertEqual(timedelta(), history.duration)

    def test_handle_team_history_same_value(self):
        time1 = datetime(2022, 1, 1, 10, 30)
        time2 = datetime(2022, 1, 1, 12, 30)
        self.ballkid.handle_team_history(3, now=time1)
        self.ballkid.current_team = 3

        self.ballkid.handle_team_history(3, now=time2)
        self.ballkid.current_team = 3

        histories = TeamHistory.objects.filter(ballkid=self.ballkid)
        self.assertEqual(1, len(histories))

        history = histories.first()
        self.assertEqual(time1, history.start)
        self.assertIsNone(history.end)
        self.assertEqual(timedelta(), history.duration)

    def test_handle_captain_history_team_same_value(self):
        self.ballkid.current_team = 2
        self.ballkid.handle_captain_history_team(2, now=datetime(2023, 1, 1, 10, 30))
        self.assertEqual(0, len(CaptainHistory.objects.all()))

    def test_handle_captain_history_team_assign_ballkid_no_captains(self):
        self.ballkid.handle_captain_history_team(2, now=datetime(2023, 1, 1, 10, 30))
        self.assertEqual(0, len(CaptainHistory.objects.filter(ballkid=self.ballkid)))

    def test_handle_captain_history_team_assign_ballkid_nonzero_captains(self):
        start = datetime(2023, 1, 1, 10, 30, 10)
        self.ballkid.current_team = 0
        self.captain.current_team = 1
        self.captain2.current_team = 1
        self.captain.save()
        self.captain2.save()

        self.ballkid.handle_captain_history_team(1, now=start)
        self.assertEqual(2, len(CaptainHistory.objects.all()))

        history1 = CaptainHistory.objects.get(ballkid=self.ballkid, captain=self.captain)
        history2 = CaptainHistory.objects.get(ballkid=self.ballkid, captain=self.captain2)

        self.assertEqual(start, history1.start)
        self.assertEqual(start, history2.start)
        self.assertIsNone(history1.end)
        self.assertIsNone(history2.end)

    def test_handle_captain_history_team_assign_captain_no_ballkids(self):
        start = datetime(2023, 1, 1, 10, 30, 10)
        self.captain.handle_captain_history_team(1, now=start)
        self.assertEqual(0, len(CaptainHistory.objects.all()))

    def test_handle_captain_history_team_assign_captain_nonzero_ballkids(self):
        start = datetime(2023, 1, 1, 10, 30, 10)
        self.captain.current_team = 0
        self.ballkid.current_team = 1
        self.ballkid2.current_team = 1
        self.ballkid.save()
        self.ballkid2.save()

        self.captain.handle_captain_history_team(1, now=start)
        self.assertEqual(2, len(CaptainHistory.objects.all()))

        history1 = CaptainHistory.objects.get(ballkid=self.ballkid, captain=self.captain)
        history2 = CaptainHistory.objects.get(ballkid=self.ballkid2, captain=self.captain)

        self.assertEqual(start, history1.start)
        self.assertEqual(start, history2.start)
        self.assertIsNone(history1.end)
        self.assertIsNone(history2.end)

    def test_handle_captain_history_team_diff_teams(self):
        self.captain.current_team = 0
        self.ballkid.current_team = 2
        self.ballkid2.current_team = 2
        self.ballkid.save()
        self.ballkid2.save()

        self.captain.handle_captain_history_team(1)
        self.assertEqual(0, len(CaptainHistory.objects.all()))

    def test_handle_captain_history_team_missing_history(self):
        """
        Even if CaptainHistory item is missing for whatever reason, handle_captain_history
        should not fail / raise an Exception
        """
        self.ballkid.current_team = 2
        self.captain.current_team = 2
        self.ballkid.save()
        self.captain.save()
        self.captain2.handle_captain_history_team(2, now=datetime(2023, 1, 1, 10, 30))
        self.assertEqual(3, len(CaptainHistory.objects.all()))

        self.ballkid.handle_captain_history_team(3, now=datetime(2023, 1, 1, 10, 30))
        self.assertEqual(3, len(CaptainHistory.objects.all()))

    def test_handle_captain_history_team_reassign_ballkid(self):
        start = datetime(2023, 1, 1, 10, 30, 10)
        end = datetime(2023, 1, 1, 20, 30, 0)

        self.captain.set_field("current_team", 1)
        self.captain2.set_field("current_team", 2)

        self.ballkid.handle_captain_history_team(1, now=start)
        self.ballkid.current_team = 1
        self.ballkid.save()
        self.assertEqual(1, len(CaptainHistory.objects.all()))

        self.ballkid.handle_captain_history_team(2, now=end)
        self.ballkid.current_team = 2
        self.ballkid.save()
        self.assertEqual(2, len(CaptainHistory.objects.all()))

        history1 = CaptainHistory.objects.get(ballkid=self.ballkid, captain=self.captain)
        history2 = CaptainHistory.objects.get(ballkid=self.ballkid, captain=self.captain2)

        self.assertEqual(start, history1.start)
        self.assertEqual(end, history1.end)
        self.assertEqual(end, history2.start)
        self.assertIsNone(history2.end)

    def test_handle_captain_history_team_reassign_captain(self):
        start = datetime(2023, 1, 1, 10, 30, 10)

        self.ballkid.current_team = 1
        self.captain.current_team = 1
        self.captain2.current_team = 2
        self.ballkid.save()
        self.captain.save()
        self.captain2.save()

        self.captain.handle_captain_history_team(2, now=start)
        self.captain.current_team = 2
        self.captain.save()
        self.assertEqual(2, len(CaptainHistory.objects.all()))

        history1 = CaptainHistory.objects.get(ballkid=self.captain2, captain=self.captain)
        history2 = CaptainHistory.objects.get(ballkid=self.captain, captain=self.captain2)

        self.assertEqual(start, history1.start)
        self.assertEqual(start, history2.start)
        self.assertIsNone(history1.end)
        self.assertIsNone(history2.end)

    def test_handle_captain_history_team_unassign_ballkid(self):
        start = datetime(2023, 1, 1, 8, 30, 10)
        end = datetime(2023, 1, 1, 10, 30, 10)

        self.captain.current_team = 1
        self.captain.save()

        self.ballkid.handle_captain_history_team(1, now=start)
        self.ballkid.current_team = 1
        self.ballkid.save()

        self.ballkid.handle_captain_history_team(0, now=end)
        self.ballkid.current_team = 0
        self.ballkid.save()
        self.assertEqual(1, len(CaptainHistory.objects.all()))

        history = CaptainHistory.objects.get(ballkid=self.ballkid, captain=self.captain)

        self.assertEqual(start, history.start)
        self.assertEqual(end, history.end)

    def test_handle_captain_history_team_unassign_captain(self):
        start = datetime(2023, 1, 1, 8, 30, 10)
        end = datetime(2023, 1, 1, 10, 30, 10)

        self.captain.current_team = 1
        self.captain.save()

        self.ballkid.handle_captain_history_team(1, now=start)
        self.ballkid.current_team = 1
        self.ballkid.save()

        self.captain.handle_captain_history_team(0, now=end)
        self.captain.current_team = 0
        self.captain.save()
        self.assertEqual(1, len(CaptainHistory.objects.all()))

        history = CaptainHistory.objects.get(ballkid=self.ballkid, captain=self.captain)

        self.assertEqual(start, history.start)
        self.assertEqual(end, history.end)

    def test_handle_captain_history_captain_promote_to_captain(self):
        self.ballkid.set_field("current_team", 1)
        self.captain.set_field("current_team", 1)

        self.assertEqual(1, len(CaptainHistory.objects.all()))
        history = CaptainHistory.objects.first()
        self.assertIsNone(history.end)

        self.ballkid.handle_captain_history_captain(
            True, now=datetime(2023, 1, 1, 10, 30)
        )
        self.assertEqual(2, len(CaptainHistory.objects.all()))

    def test_handle_captain_history_captain_promote_to_captain_mult_ballkids(self):
        self.ballkid.set_field("current_team", 1)
        self.ballkid2.set_field("current_team", 1)
        self.captain.set_field("current_team", 1)

        self.assertEqual(2, len(CaptainHistory.objects.all()))
        history1 = CaptainHistory.objects.first()
        history2 = CaptainHistory.objects.all()[1]
        self.assertIsNone(history1.end)
        self.assertIsNone(history2.end)

        self.ballkid.handle_captain_history_captain(
            True, now=datetime(2023, 1, 1, 10, 30)
        )
        self.assertEqual(4, len(CaptainHistory.objects.all()))
        self.assertEqual(2, len(CaptainHistory.objects.filter(captain=self.ballkid)))

    def test_handle_captain_history_captain_demote_from_captain(self):
        self.ballkid.set_field("current_team", 1)
        self.captain.set_field("current_team", 1)

        self.assertEqual(1, len(CaptainHistory.objects.all()))
        history = CaptainHistory.objects.first()
        self.assertIsNone(history.end)

        self.captain.handle_captain_history_captain(
            False, now=datetime(2023, 1, 1, 10, 30)
        )
        self.assertEqual(1, len(CaptainHistory.objects.all()))
        history = CaptainHistory.objects.first()
        self.assertIsNotNone(history.end)

    def test_handle_captain_history_captain_demote_from_captain_mult_ballkids(self):
        now = datetime(2023, 1, 1, 10, 30)

        self.ballkid.set_field("current_team", 1)
        self.ballkid2.set_field("current_team", 1)
        self.captain.set_field("current_team", 1)

        self.assertEqual(2, len(CaptainHistory.objects.all()))
        history1 = CaptainHistory.objects.first()
        history2 = CaptainHistory.objects.all()[1]
        self.assertIsNone(history1.end)
        self.assertIsNone(history2.end)

        self.captain.handle_captain_history_captain(False, now=now)
        self.assertEqual(2, len(CaptainHistory.objects.all()))
        history1 = CaptainHistory.objects.first()
        history2 = CaptainHistory.objects.all()[1]
        self.assertEqual(now, history1.end)
        self.assertEqual(now, history2.end)

    def test_handle_captain_history_captain_demote_from_captain_mult_shifts(self):
        now = datetime(2023, 1, 1, 10, 30)

        self.ballkid.set_field("current_team", 1)
        self.captain.set_field("current_team", 1)
        self.captain.set_field("current_team", 0)
        self.captain.set_field("current_team", 1)

        self.assertEqual(2, len(CaptainHistory.objects.all()))
        history1 = CaptainHistory.objects.order_by("start").first()
        history2 = CaptainHistory.objects.order_by("start").last()
        self.assertIsNotNone(history1.end)
        self.assertIsNone(history2.end)

        self.captain.handle_captain_history_captain(False, now=now)
        self.assertEqual(2, len(CaptainHistory.objects.all()))
        history1 = CaptainHistory.objects.order_by("start").first()
        history2 = CaptainHistory.objects.order_by("start").last()
        self.assertIsNotNone(history1.end)
        self.assertEqual(now, history2.end)

    def test_handle_captain_history_captain_no_change(self):
        self.ballkid.set_field("current_team", 1)
        self.captain.set_field("current_team", 1)

        self.assertEqual(1, len(CaptainHistory.objects.all()))
        history = CaptainHistory.objects.first()
        self.assertIsNone(history.end)

        self.captain.handle_captain_history_captain(
            True, now=datetime(2023, 1, 1, 10, 30)
        )
        self.assertEqual(1, len(CaptainHistory.objects.all()))
        history = CaptainHistory.objects.first()
        self.assertIsNone(history.end)

    def test_handle_captain_history_captain_unassigned(self):
        self.captain.set_field("current_team", 2)

        self.ballkid.handle_captain_history_captain(
            True, now=datetime(2023, 1, 1, 10, 30)
        )
        self.assertEqual(0, len(CaptainHistory.objects.all()))
