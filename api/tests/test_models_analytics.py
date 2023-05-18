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

        histories = CheckinHistory.objects.all().order_by("checkin")
        self.assertEqual(2, len(histories))
        history1 = histories.first()
        history2 = histories.last()
        self.assertEqual(timedelta(hours=8, minutes=15), history1.duration)
        self.assertEqual(timedelta(hours=3, minutes=1), history2.duration)

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

    def test_recalc_checkin_analytics_doesnt_exist(self):
        self.assertEqual(0, len(CheckinAnalytics.objects.all()))

        history1 = CheckinHistory.objects.create(
            ballkid=self.ballkid,
            checkin=datetime(2022, 1, 1, 10, 30),
            checkout=datetime(2022, 1, 1, 14, 29),
        )
        self.ballkid.recalc_checkin_analytics()

        analytics = CheckinAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        self.assertEqual(timedelta(hours=3, minutes=59), analytics.first().duration)

    def test_recalc_checkin_analytics_exists(self):
        self.assertEqual(0, len(CheckinAnalytics.objects.all()))

        history1 = CheckinHistory.objects.create(
            ballkid=self.ballkid,
            checkin=datetime(2022, 1, 1, 10, 30),
            checkout=datetime(2022, 1, 1, 14, 29),
        )
        CheckinAnalytics.objects.create(ballkid=self.ballkid, duration=timedelta())
        self.ballkid.recalc_checkin_analytics()

        analytics = CheckinAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        self.assertEqual(timedelta(hours=3, minutes=59), analytics.first().duration)

    def test_recalc_checkin_analytics_one_history(self):
        history1 = CheckinHistory.objects.create(
            ballkid=self.ballkid,
            checkin=datetime(2022, 1, 1, 16, 30),
            checkout=datetime(2022, 1, 2, 0, 30),
        )
        self.ballkid.recalc_checkin_analytics()

        analytics = CheckinAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        self.assertEqual(timedelta(hours=8), analytics.first().duration)

    def test_recalc_checkin_analytics_mult_histories(self):
        history1 = CheckinHistory.objects.create(
            ballkid=self.ballkid,
            checkin=datetime(2022, 1, 1, 16, 30),
            checkout=datetime(2022, 1, 2, 0, 30),
        )
        history2 = CheckinHistory.objects.create(
            ballkid=self.ballkid,
            checkin=datetime(2022, 1, 2, 8, 15),
            checkout=datetime(2022, 1, 2, 18, 30),
        )
        self.ballkid.recalc_checkin_analytics()

        analytics = CheckinAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        self.assertEqual(timedelta(hours=18, minutes=15), analytics.first().duration)

    def test_recalc_checkin_analytics_mult_ballkids(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid,
            checkin=datetime(2022, 1, 1, 16, 30),
            checkout=datetime(2022, 1, 2, 0, 30),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid,
            checkin=datetime(2022, 1, 2, 8, 15),
            checkout=datetime(2022, 1, 2, 18, 30),
        )
        CheckinHistory.objects.create(
            ballkid=self.ballkid2,
            checkin=datetime(2022, 1, 2, 8, 15),
            checkout=datetime(2022, 1, 2, 18, 30),
        )
        self.ballkid.recalc_checkin_analytics()
        self.ballkid2.recalc_checkin_analytics()

        analytics = CheckinAnalytics.objects.all()
        self.assertEqual(2, len(analytics))
        analytic = analytics.filter(ballkid=self.ballkid).first()
        self.assertEqual(timedelta(hours=18, minutes=15), analytic.duration)

    def test_recalc_checkin_analytics_milliseconds(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid,
            checkin=datetime(2022, 1, 1, 16, 30, 2, 10),
            checkout=datetime(2022, 1, 2, 0, 30, 3, 11),
        )
        self.ballkid.recalc_checkin_analytics()

        analytics = CheckinAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(timedelta(hours=8, seconds=1, microseconds=1), analytic.duration)

    def test_recalc_checkin_analytics_empty_end(self):
        CheckinHistory.objects.create(
            ballkid=self.ballkid, checkin=datetime(2022, 1, 1, 16, 30, 2)
        )
        self.ballkid.recalc_checkin_analytics(now=datetime(2022, 1, 2, 0, 30, 3))

        analytics = CheckinAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(timedelta(hours=8, seconds=1), analytic.duration)

    def test_recalc_captain_analytics_milliseconds(self):
        start = datetime(2022, 1, 1, 10, 30)
        end = datetime(2022, 1, 1, 14, 29, 1, 10)
        Schedule.objects.create(team=1, court=COURT.STADIUM, start=start, end=end)

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=start,
            end=end,
            team=1,
        )
        self.ballkid.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(self.captain, analytic.captain)
        self.assertEqual(1, analytic.count)
        self.assertEqual(
            timedelta(hours=3, minutes=59, seconds=1, microseconds=10), analytic.duration
        )

    def test_recalc_captain_analytics_doesnt_exist(self):
        start = datetime(2022, 1, 1, 10, 30)
        end = datetime(2022, 1, 1, 14, 29)
        Schedule.objects.create(team=1, court=COURT.STADIUM, start=start, end=end)

        self.assertEqual(0, len(CaptainAnalytics.objects.all()))
        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=start,
            end=end,
            team=1,
        )
        self.ballkid.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(self.captain, analytic.captain)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=3, minutes=59), analytic.duration)

    def test_recalc_captain_analytics_self_not_included(self):
        start = datetime(2022, 1, 1, 10, 30)
        end = datetime(2022, 1, 1, 14, 29)
        Schedule.objects.create(team=1, court=COURT.STADIUM, start=start, end=end)

        CaptainHistory.objects.create(
            ballkid=self.captain,
            captain=self.captain2,
            start=start,
            end=end,
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.captain2,
            captain=self.captain,
            start=start,
            end=end,
            team=1,
        )
        self.captain.recalc_captain_analytics()
        self.captain2.recalc_captain_analytics()

        self.assertFalse(
            CaptainAnalytics.objects.all().filter(
                ballkid_id=self.captain.id, captain_id=self.captain.id
            )
        )
        self.assertFalse(
            CaptainAnalytics.objects.all().filter(
                ballkid_id=self.captain2.id, captain_id=self.captain2.id
            )
        )
        self.assertTrue(
            CaptainAnalytics.objects.all().filter(
                ballkid_id=self.captain.id, captain_id=self.captain2.id
            )
        )
        self.assertTrue(
            CaptainAnalytics.objects.all().filter(
                ballkid_id=self.captain2.id, captain_id=self.captain.id
            )
        )

    def test_recalc_captain_analytics_ballkid_exists(self):
        start = datetime(2022, 1, 1, 10, 30)
        end = datetime(2022, 1, 1, 14, 29)
        Schedule.objects.create(team=1, court=COURT.STADIUM, start=start, end=end)

        analytic = CaptainAnalytics.objects.create(
            ballkid=self.ballkid, captain=self.captain
        )
        self.assertEqual(1, len(CaptainAnalytics.objects.all()))

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=start,
            end=end,
            team=1,
        )
        self.ballkid.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(self.captain, analytic.captain)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=3, minutes=59), analytic.duration)

    def test_recalc_captain_analytics_captain_exists(self):
        start = datetime(2022, 1, 1, 10, 30)
        end = datetime(2022, 1, 1, 14, 29)

        CaptainAnalytics.objects.create(ballkid=self.captain, captain=self.captain2)
        CaptainAnalytics.objects.create(ballkid=self.captain2, captain=self.captain)
        self.assertEqual(2, len(CaptainAnalytics.objects.all()))

        CaptainHistory.objects.create(
            ballkid=self.captain2,
            captain=self.captain,
            start=start,
            end=end,
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.captain,
            captain=self.captain2,
            start=start,
            end=end,
            team=1,
        )
        Schedule.objects.create(team=1, court=COURT.STADIUM, start=start, end=end)

        self.captain.recalc_captain_analytics()
        self.captain2.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all().order_by("ballkid_id")
        self.assertEqual(2, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.captain, analytic.ballkid)
        self.assertEqual(self.captain2, analytic.captain)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=3, minutes=59), analytic.duration)

    def test_recalc_captain_analytics_one_history_one_captain(self):
        start = datetime(2022, 1, 1, 10, 30)
        end = datetime(2022, 1, 1, 14, 29)
        Schedule.objects.create(team=1, court=COURT.STADIUM, start=start, end=end)

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=start,
            end=end,
            team=1,
        )
        self.ballkid.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(self.captain, analytic.captain)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=3, minutes=59), analytic.duration)

    def test_recalc_captain_analytics_mult_histories_one_captain(self):
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 2, 14, 45),
        )

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 14, 29),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 2, 13, 00),
            end=datetime(2022, 1, 2, 14, 45),
            team=1,
        )
        self.ballkid.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(self.captain, analytic.captain)
        self.assertEqual(2, analytic.count)
        self.assertEqual(timedelta(hours=5, minutes=44), analytic.duration)

    def test_recalc_captain_analytics_one_history_mult_captains(self):
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 2, 14, 45),
        )

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 14, 29),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain2,
            start=datetime(2022, 1, 2, 13, 00),
            end=datetime(2022, 1, 2, 14, 45),
            team=1,
        )
        self.ballkid.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all().order_by("captain_id")
        self.assertEqual(2, len(analytics))
        analytic1 = analytics.first()
        self.assertEqual(self.ballkid, analytic1.ballkid)
        self.assertEqual(self.captain, analytic1.captain)
        self.assertEqual(1, analytic1.count)
        self.assertEqual(timedelta(hours=3, minutes=59), analytic1.duration)

        analytic2 = analytics[1]
        self.assertEqual(self.ballkid, analytic2.ballkid)
        self.assertEqual(self.captain2, analytic2.captain)
        self.assertEqual(1, analytic2.count)
        self.assertEqual(timedelta(hours=1, minutes=45), analytic2.duration)

    def test_recalc_captain_analytics_mult_histories_mult_captains(self):
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 4, 19, 0),
        )

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 14, 29),
            team=1,
        )  # overlapping time is 3:59
        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 2, 13, 00),
            end=datetime(2022, 1, 2, 14, 45),
            team=1,
        )  # overlapping time is 01:45

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain2,
            start=datetime(2022, 1, 3, 15, 30),
            end=datetime(2022, 1, 3, 15, 39),
            team=1,
        )  # overlapping time is 00:09
        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain2,
            start=datetime(2022, 1, 4, 18, 30),
            end=datetime(2022, 1, 4, 19, 00),
            team=1,
        )  # overlapping time is 00:30
        self.ballkid.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all().order_by("captain_id")
        self.assertEqual(2, len(analytics))
        analytic1 = analytics.first()
        self.assertEqual(self.ballkid, analytic1.ballkid)
        self.assertEqual(self.captain, analytic1.captain)
        self.assertEqual(2, analytic1.count)
        self.assertEqual(timedelta(hours=5, minutes=44), analytic1.duration)

        analytic2 = analytics[1]
        self.assertEqual(self.ballkid, analytic2.ballkid)
        self.assertEqual(self.captain2, analytic2.captain)
        self.assertEqual(2, analytic2.count)
        self.assertEqual(timedelta(minutes=39), analytic2.duration)

    def test_recalc_captain_analytics_many_hours(self):
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2022, 1, 1, 5, 30),
            end=datetime(2022, 1, 2, 18, 30),
        )

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 1, 5, 30),
            end=datetime(2022, 1, 1, 23, 30),
            team=1,
        )  # overlapping time is 18:00
        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 2, 8, 00),
            end=datetime(2022, 1, 2, 18, 30),
            team=1,
        )  # overlapping time is 10:30
        self.ballkid.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(self.captain, analytic.captain)
        self.assertEqual(2, analytic.count)
        self.assertEqual(timedelta(hours=28, minutes=30), analytic.duration)

    def test_recalc_captain_analytics_past_midnight(self):
        start = datetime(2022, 1, 1, 20, 30)
        end = datetime(2022, 1, 2, 2, 30)
        Schedule.objects.create(team=1, court=COURT.STADIUM, start=start, end=end)

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=start,
            end=end,
            team=1,
        )
        self.ballkid.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(self.captain, analytic.captain)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=6), analytic.duration)

    def test_recalc_captain_analytics_reciprocal_ballkid_captain(self):
        start = datetime(2022, 1, 1, 10, 30)
        end = datetime(2022, 1, 1, 14, 29)
        Schedule.objects.create(team=1, court=COURT.STADIUM, start=start, end=end)

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=start,
            end=end,
            team=1,
        )
        self.captain.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(self.captain, analytic.captain)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=3, minutes=59), analytic.duration)

    def test_recalc_captain_analytics_reciprocal_two_captains(self):
        start = datetime(2022, 1, 1, 10, 30)
        end = datetime(2022, 1, 1, 14, 29)
        Schedule.objects.create(team=1, court=COURT.STADIUM, start=start, end=end)

        CaptainHistory.objects.create(
            ballkid=self.captain2,
            captain=self.captain,
            start=start,
            end=end,
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.captain,
            captain=self.captain2,
            start=start,
            end=end,
            team=1,
        )
        self.captain2.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all().order_by("ballkid_id")
        self.assertEqual(2, len(analytics))

        analytic1 = analytics.first()
        self.assertEqual(self.captain, analytic1.ballkid)
        self.assertEqual(self.captain2, analytic1.captain)
        self.assertEqual(1, analytic1.count)
        self.assertEqual(timedelta(hours=3, minutes=59), analytic1.duration)

        analytic2 = analytics[1]
        self.assertEqual(self.captain2, analytic2.ballkid)
        self.assertEqual(self.captain, analytic2.captain)
        self.assertEqual(1, analytic2.count)
        self.assertEqual(timedelta(hours=3, minutes=59), analytic2.duration)

    def test_recalc_captain_analytics_reciprocal_ballkid_captain_mult_histories(self):
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 2, 12, 31),
        )

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 14, 29),
            team=1,
        )
        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 2, 11, 30),
            end=datetime(2022, 1, 2, 12, 31),
            team=1,
        )
        self.captain.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(self.captain, analytic.captain)
        self.assertEqual(2, analytic.count)
        self.assertEqual(timedelta(hours=5), analytic.duration)

    def test_recalc_captain_analytics_one_history_one_captain_mult_shifts(self):
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 11, 30),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2022, 1, 1, 12, 30),
            end=datetime(2022, 1, 1, 13, 30),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2022, 1, 1, 14, 30),
            end=datetime(2022, 1, 1, 15, 30),
        )

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 14, 29),
            team=1,
        )
        self.ballkid.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(self.captain, analytic.captain)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=2), analytic.duration)

    def test_recalc_captain_analytics_no_overlap(self):
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2022, 1, 4, 10, 30),
            end=datetime(2022, 1, 4, 11, 30),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.HARRIS,
            start=datetime(2022, 1, 4, 12, 30),
            end=datetime(2022, 1, 4, 13, 30),
        )

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 14, 29),
            team=1,
        )
        self.ballkid.recalc_captain_analytics()

        self.assertEqual(0, len(CaptainAnalytics.objects.all()))

    def test_recalc_captain_analytics_mult_shifts_mult_courts(self):
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 11, 30),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.HARRIS,
            start=datetime(2022, 1, 1, 12, 30),
            end=datetime(2022, 1, 1, 13, 30),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.GRANDSTAND,
            start=datetime(2022, 1, 1, 14, 30),
            end=datetime(2022, 1, 1, 15, 30),
        )

        CaptainHistory.objects.create(
            ballkid=self.ballkid,
            captain=self.captain,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 14, 29),
            team=1,
        )
        self.ballkid.recalc_captain_analytics()

        analytics = CaptainAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(self.captain, analytic.captain)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=2), analytic.duration)

    def test_recalc_court_analytics_one_team_one_shift(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid,
            team=1,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 14, 29),
        )
        Schedule.objects.create(
            team=1, court=COURT.STADIUM, start=datetime(2022, 1, 1, 10, 00)
        )
        self.ballkid.recalc_court_analytics()

        analytics = CourtAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(1, analytic.count)
        self.assertEqual(COURT.STADIUM, analytic.court)
        self.assertEqual(timedelta(minutes=30), analytic.duration)

    def test_recalc_court_analytics_one_team_one_shift_empty_end(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid,
            team=1,
            start=datetime(2022, 1, 1, 10, 30),
        )
        Schedule.objects.create(
            team=1, court=COURT.STADIUM, start=datetime(2022, 1, 1, 10, 00)
        )
        self.ballkid.recalc_court_analytics(now=datetime(2022, 1, 1, 15, 00))

        analytics = CourtAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(1, analytic.count)
        self.assertEqual(COURT.STADIUM, analytic.court)
        self.assertEqual(timedelta(minutes=30), analytic.duration)

    def test_recalc_court_analytics_one_team_mult_shifts(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid,
            team=1,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 15, 30),
        )
        Schedule.objects.create(
            team=1, court=COURT.STADIUM, start=datetime(2022, 1, 1, 10, 00)
        )
        Schedule.objects.create(
            team=1, court=COURT.HARRIS, start=datetime(2022, 1, 1, 12, 00)
        )
        Schedule.objects.create(
            team=2, court=COURT.GRANDSTAND, start=datetime(2022, 1, 1, 11, 00)
        )
        self.ballkid.recalc_court_analytics()

        analytics = CourtAnalytics.objects.all()
        self.assertEqual(2, len(analytics))
        analytic, created = analytics.get_or_create(court=COURT.STADIUM)
        self.assertFalse(created)
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(minutes=30), analytic.duration)

        analytic, created = analytics.get_or_create(court=COURT.HARRIS)
        self.assertFalse(created)
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(minutes=60), analytic.duration)

    def test_recalc_court_analytics_one_team_mult_count(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid,
            team=1,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 15, 30),
        )
        Schedule.objects.create(
            team=1, court=COURT.STADIUM, start=datetime(2022, 1, 1, 10, 00)
        )
        Schedule.objects.create(
            team=1, court=COURT.STADIUM, start=datetime(2022, 1, 1, 15, 00)
        )
        self.ballkid.recalc_court_analytics()

        analytics = CourtAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic, created = analytics.get_or_create(court=COURT.STADIUM)
        self.assertFalse(created)
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(2, analytic.count)
        self.assertEqual(timedelta(hours=1), analytic.duration)

    def test_recalc_court_analytics_mult_team_mult_courts(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid,
            team=1,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 15, 30),
        )
        TeamHistory.objects.create(
            ballkid=self.ballkid,
            team=2,
            start=datetime(2022, 1, 1, 15, 30),
            end=datetime(2022, 1, 1, 20, 00),
        )
        Schedule.objects.create(
            team=1, court=COURT.STADIUM, start=datetime(2022, 1, 1, 10, 00)
        )
        Schedule.objects.create(
            team=1, court=COURT.HARRIS, start=datetime(2022, 1, 1, 15, 00)
        )
        Schedule.objects.create(
            team=1, court=COURT.GRANDSTAND, start=datetime(2022, 1, 1, 18, 00)
        )
        Schedule.objects.create(
            team=2, court=COURT.FOUR, start=datetime(2022, 1, 1, 15, 00)
        )
        Schedule.objects.create(
            team=2, court=COURT.FIVE, start=datetime(2022, 1, 1, 19, 00)
        )
        self.ballkid.recalc_court_analytics()

        analytics = CourtAnalytics.objects.all()
        self.assertEqual(4, len(analytics))

        analytic, created = analytics.get_or_create(court=COURT.STADIUM)
        self.assertFalse(created)
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(minutes=30), analytic.duration)

        analytic, created = analytics.get_or_create(court=COURT.HARRIS)
        self.assertFalse(created)
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(minutes=30), analytic.duration)

        analytic, created = analytics.get_or_create(court=COURT.FOUR)
        self.assertFalse(created)
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(minutes=30), analytic.duration)

        analytic, created = analytics.get_or_create(court=COURT.FIVE)
        self.assertFalse(created)
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(1, analytic.count)
        self.assertEqual(timedelta(hours=1), analytic.duration)

    def test_recalc_court_analytics_one_team_one_shift_not_yet_occurred(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid,
            team=1,
            start=datetime(2022, 1, 1, 8, 30),
            end=datetime(2022, 1, 1, 9, 30),
        )
        Schedule.objects.create(
            team=1, court=COURT.STADIUM, start=datetime(2022, 1, 1, 10, 00)
        )
        self.ballkid.recalc_court_analytics()

        analytics = CourtAnalytics.objects.all()
        self.assertEqual(0, len(analytics))

    def test_recalc_court_analytics_one_team_one_shift_not_yet_occurred_empty_end(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid,
            team=1,
            start=datetime(2022, 1, 1, 8, 30),
        )
        Schedule.objects.create(
            team=1, court=COURT.STADIUM, start=datetime(2022, 1, 1, 10, 00)
        )
        self.ballkid.recalc_court_analytics(now=datetime(2022, 1, 1, 9, 30))

        analytics = CourtAnalytics.objects.all()
        self.assertEqual(0, len(analytics))

    def test_recalc_court_analytics_one_team_one_shift_short_shifted(self):
        TeamHistory.objects.create(
            ballkid=self.ballkid,
            team=1,
            start=datetime(2022, 1, 1, 10, 30),
            end=datetime(2022, 1, 1, 14, 29),
        )
        Schedule.objects.create(
            team=1,
            court=COURT.STADIUM,
            start=datetime(2022, 1, 1, 10, 00),
            end=datetime(2022, 1, 1, 10, 45),
        )
        self.ballkid.recalc_court_analytics()

        analytics = CourtAnalytics.objects.all()
        self.assertEqual(1, len(analytics))
        analytic = analytics.first()
        self.assertEqual(self.ballkid, analytic.ballkid)
        self.assertEqual(1, analytic.count)
        self.assertEqual(COURT.STADIUM, analytic.court)
        self.assertEqual(timedelta(minutes=15), analytic.duration)
