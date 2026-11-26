from django.test import TestCase
from api.models.ballkid import *
from api.models.schedule import *


class TestBallkidModel(TestCase):
    def setUp(self):
        self.ballkid = Ballkid.objects.create(
            first_name="Lacy",
            last_name="Iosue",
            is_checked_in=True,
            current_team=3,
            preferred_position=POSITION.NB,
            position=POSITION.N,
        )
        self.ballkid2 = Ballkid.objects.create(
            first_name="Joe",
            last_name="Iosue",
            is_checked_in=True,
            preferred_position=POSITION.NB,
            position=POSITION.N,
        )
        Tournament.objects.create(year=get_current_year(), show_finals_teams=True)

    def test_get_name(self):
        self.assertEqual(self.ballkid.get_name(), "Lacy Iosue")

    def test_set_field_checkin(self):
        self.ballkid.is_checked_in = False

        self.ballkid.set_field("is_checked_in", True)
        self.assertTrue(self.ballkid.is_checked_in)

    def test_set_field_position(self):
        self.ballkid.position = POSITION.B

        self.ballkid.set_field("position", POSITION.N)
        self.assertEqual(POSITION.N, self.ballkid.position)

    def test_set_field_finals_position(self):
        self.ballkid.finals_position = POSITION.B

        self.ballkid.set_field("finals_position", POSITION.N)
        self.assertEqual(POSITION.N, self.ballkid.finals_position)

    def test_set_field_preferred_position(self):
        self.ballkid.preferred_position = POSITION.NB

        self.ballkid.set_field("preferred_position", POSITION.B)
        self.assertEqual(POSITION.B, self.ballkid.preferred_position)

    def test_set_field_team_assign(self):
        self.ballkid.current_team = 0

        self.ballkid.set_field("current_team", 2)
        self.assertEqual(2, self.ballkid.current_team)

    def test_set_field_team_unassign(self):
        self.ballkid.current_team = 3

        self.ballkid.set_field("current_team", 0)
        self.assertEqual(0, self.ballkid.current_team)

    def test_set_field_team_reassign(self):
        self.ballkid.current_team = 3

        self.ballkid.set_field("current_team", 2)
        self.assertEqual(2, self.ballkid.current_team)

    def test_set_field_finals_team(self):
        self.ballkid.finals_team = MATCH_TYPE.MS

        self.ballkid.set_field("finals_team", MATCH_TYPE.WD)
        self.assertEqual(MATCH_TYPE.WD, self.ballkid.finals_team)

    def test_set_field_is_active(self):
        self.ballkid.is_active = True

        self.ballkid.set_field("is_active", False)
        self.assertEqual(False, self.ballkid.is_active)

    def test_set_field_is_cut_uncut(self):
        self.ballkid.is_cut = True

        self.ballkid.set_field("is_cut", False)
        self.assertEqual(False, self.ballkid.is_cut)

    def test_set_field_is_cut_cut(self):
        self.ballkid.is_cut = False

        self.ballkid.set_field("is_cut", True)
        self.assertEqual(True, self.ballkid.is_cut)

    def test_set_field_cut_status(self):
        self.ballkid.cut_status = CUT_STATUS.DEFINITELY_CUT

        self.ballkid.set_field("cut_status", CUT_STATUS.POSSIBLY_KEEP)
        self.assertEqual(CUT_STATUS.POSSIBLY_KEEP, self.ballkid.cut_status)

    def test_set_field_is_captain(self):
        self.ballkid.is_captain = False

        self.ballkid.set_field("is_captain", True)
        self.assertEqual(True, self.ballkid.is_captain)

    def test_set_field_comments(self):
        self.ballkid.comments = "comments"
        comment = "these are my comments & this ballkid isn't very good!"

        self.ballkid.set_field("comments", comment)
        self.assertEqual(comment, self.ballkid.comments)

    def test_set_field_promote_to_captain_unassigned(self):
        self.ballkid2.set_field("current_team", 3)
        self.assertEqual(0, len(CaptainHistory.objects.all()))

        self.ballkid2.set_field("current_team", 0)
        self.ballkid2.set_field("is_captain", True)
        self.ballkid2.set_field("current_team", 3)
        self.assertEqual(1, len(CaptainHistory.objects.all()))

    def test_set_field_promote_to_captain_assigned(self):
        self.ballkid2.set_field("current_team", 3)
        self.assertEqual(0, len(CaptainHistory.objects.all()))

        self.ballkid2.set_field("is_captain", True)
        self.assertEqual(1, len(CaptainHistory.objects.all()))

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

        self.ballkid2.set_field("current_team", 0)
        self.ballkid2.set_field("is_captain", False)
        self.assertEqual(1, len(CaptainHistory.objects.all()))

    def test_set_field_demote_from_captain_assigned(self):
        self.ballkid2.set_field("is_captain", True)
        self.ballkid2.set_field("current_team", 3)
        self.assertEqual(1, len(CaptainHistory.objects.all()))
        history = CaptainHistory.objects.first()
        self.assertIsNone(history.end)

        self.ballkid2.set_field("is_captain", False)
        self.assertEqual(1, len(CaptainHistory.objects.all()))
        history = CaptainHistory.objects.first()
        self.assertIsNotNone(history.end)

    def test_get_preferred_position_switch(self):
        self.assertEqual(POSITION.N, self.ballkid.get_preferred_position())

    def test_get_preferred_position_nonswitch(self):
        self.ballkid.preferred_position = POSITION.N

        self.assertEqual(POSITION.N, self.ballkid.get_preferred_position())

    def test_get_preferred_position_bn(self):
        self.ballkid.preferred_position = POSITION.BN

        self.assertEqual(POSITION.B, self.ballkid.get_preferred_position())

    def test_validate_no_change(self):
        self.ballkid.validate()

        self.ballkid.refresh_from_db()
        self.assertTrue(self.ballkid.is_checked_in)
        self.assertEqual(3, self.ballkid.current_team)
        self.assertEqual(POSITION.N, self.ballkid.position)
        self.assertEqual(POSITION.NB, self.ballkid.preferred_position)

    def test_validate_unassign_resets_preferred_position(self):
        self.ballkid.position = POSITION.B
        self.ballkid.current_team = 0
        self.assertEqual(POSITION.B, self.ballkid.position)

        self.ballkid.validate()
        self.ballkid.refresh_from_db()
        self.assertTrue(self.ballkid.is_checked_in)
        self.assertEqual(0, self.ballkid.current_team)
        self.assertEqual(POSITION.N, self.ballkid.position)
        self.assertEqual(POSITION.NB, self.ballkid.preferred_position)

    def test_validate_checkout_resets_team_and_preferred_position(self):
        self.ballkid.position = POSITION.B
        self.ballkid.is_checked_in = False
        self.assertEqual(3, self.ballkid.current_team)
        self.assertEqual(POSITION.B, self.ballkid.position)

        self.ballkid.validate()
        self.ballkid.refresh_from_db()
        self.assertFalse(self.ballkid.is_checked_in)
        self.assertEqual(0, self.ballkid.current_team)
        self.assertEqual(POSITION.N, self.ballkid.position)
        self.assertEqual(POSITION.NB, self.ballkid.preferred_position)

    def test_validate_inactive_checked_out(self):
        self.ballkid.position = POSITION.B
        self.ballkid.is_active = False
        self.assertEqual(3, self.ballkid.current_team)
        self.assertEqual(POSITION.B, self.ballkid.position)

        self.ballkid.validate()
        self.ballkid.refresh_from_db()
        self.assertFalse(self.ballkid.is_active)
        self.assertFalse(self.ballkid.is_checked_in)
        self.assertEqual(0, self.ballkid.current_team)
        self.assertEqual(POSITION.N, self.ballkid.position)
        self.assertEqual(POSITION.NB, self.ballkid.preferred_position)

    def test_validate_cut_checked_out(self):
        self.ballkid.position = POSITION.B
        self.ballkid.is_cut = True
        self.assertEqual(3, self.ballkid.current_team)
        self.assertEqual(POSITION.B, self.ballkid.position)

        self.ballkid.validate()
        self.ballkid.refresh_from_db()
        self.assertTrue(self.ballkid.is_cut)
        self.assertFalse(self.ballkid.is_checked_in)
        self.assertEqual(0, self.ballkid.current_team)
        self.assertEqual(POSITION.N, self.ballkid.position)
        self.assertEqual(POSITION.NB, self.ballkid.preferred_position)

    def test_validate_uncut_no_change(self):
        self.ballkid.position = POSITION.B
        self.ballkid.is_cut = True
        self.assertEqual(3, self.ballkid.current_team)
        self.assertEqual(POSITION.B, self.ballkid.position)

        self.ballkid.validate()
        self.ballkid.refresh_from_db()
        self.assertTrue(self.ballkid.is_cut)
        self.assertFalse(self.ballkid.is_checked_in)
        self.assertEqual(0, self.ballkid.current_team)
        self.assertEqual(POSITION.N, self.ballkid.position)
        self.assertEqual(POSITION.NB, self.ballkid.preferred_position)

        self.ballkid.is_cut = False
        self.ballkid.validate()
        self.ballkid.refresh_from_db()
        self.assertFalse(self.ballkid.is_cut)
        self.assertFalse(self.ballkid.is_checked_in)
        self.assertEqual(0, self.ballkid.current_team)
        self.assertEqual(POSITION.N, self.ballkid.position)
        self.assertEqual(POSITION.NB, self.ballkid.preferred_position)

    def test_validate_unassign_finals_team_resets_preferred_position(self):
        self.ballkid.finals_position = POSITION.B
        self.ballkid.finals_team = ""
        self.assertEqual(POSITION.B, self.ballkid.finals_position)

        self.ballkid.validate()
        self.ballkid.refresh_from_db()
        self.assertEqual("", self.ballkid.finals_team)
        self.assertEqual(POSITION.N, self.ballkid.finals_position)
        self.assertEqual(POSITION.NB, self.ballkid.preferred_position)

    def test_checkin_records_yearly_season_participation(self):
        self.ballkid.is_checked_in = False
        self.ballkid.save(update_fields=["is_checked_in"])

        self.ballkid.set_field("is_checked_in", True)

        participation = SeasonParticipation.objects.get(
            ballkid=self.ballkid, year=get_current_year()
        )
        self.assertEqual(
            participation.source, SeasonParticipation.SOURCE_CHECKIN
        )
        self.assertIsNotNone(participation.first_checkin)
        self.assertIsNotNone(participation.last_checkin)

    def test_repeat_checkin_does_not_duplicate_season_participation(self):
        self.ballkid.is_checked_in = False
        self.ballkid.save(update_fields=["is_checked_in"])
        self.ballkid.set_field("is_checked_in", True)

        participation_id = SeasonParticipation.objects.get(
            ballkid=self.ballkid, year=get_current_year()
        ).id

        self.ballkid.set_field("is_checked_in", False)
        self.ballkid.set_field("is_checked_in", True)

        self.assertEqual(
            SeasonParticipation.objects.filter(
                ballkid=self.ballkid, year=get_current_year()
            ).count(),
            1,
        )
        self.assertEqual(
            SeasonParticipation.objects.get(
                ballkid=self.ballkid, year=get_current_year()
            ).id,
            participation_id,
        )

    def test_veterancy_includes_historical_baseline_and_verified_future_years(self):
        self.ballkid.veterancy_baseline_years = 4
        self.ballkid.veterancy_baseline_through_year = 2025
        self.ballkid.save(
            update_fields=[
                "veterancy_baseline_years",
                "veterancy_baseline_through_year",
            ]
        )

        SeasonParticipation.objects.create(
            ballkid=self.ballkid,
            year=2024,
            source=SeasonParticipation.SOURCE_IMPORTED,
        )
        SeasonParticipation.objects.create(
            ballkid=self.ballkid,
            year=2025,
            source=SeasonParticipation.SOURCE_CHECKIN,
        )
        SeasonParticipation.objects.create(
            ballkid=self.ballkid,
            year=2027,
            source=SeasonParticipation.SOURCE_CHECKIN,
        )

        self.assertEqual(self.ballkid.get_veterancy_years(), 6)
        self.assertEqual(self.ballkid.get_verified_veterancy_years(), 2)

    def test_veterancy_does_not_count_seasons_before_baseline_cutoff(self):
        self.ballkid.veterancy_baseline_years = 3
        self.ballkid.veterancy_baseline_through_year = 2026
        self.ballkid.save(
            update_fields=[
                "veterancy_baseline_years",
                "veterancy_baseline_through_year",
            ]
        )

        SeasonParticipation.objects.create(
            ballkid=self.ballkid,
            year=2025,
            source=SeasonParticipation.SOURCE_IMPORTED,
        )
        SeasonParticipation.objects.create(
            ballkid=self.ballkid,
            year=2026,
            source=SeasonParticipation.SOURCE_CHECKIN,
        )

        self.assertEqual(self.ballkid.get_veterancy_years(), 3)
        self.assertEqual(self.ballkid.get_verified_veterancy_years(), 0)
