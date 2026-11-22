from datetime import date
from unittest.mock import patch

from django.test import TestCase

from api.models.application import BallcrewApplication
from api.models.ballkid import Ballkid
from api.models.enums import POSITION
from api.utils.teams_generator import TeamsGenerator


class TestTeamsGeneratorFemaleCoverage(TestCase):
    def setUp(self):
        self._application_number = 0

    def make_ballkid(
        self,
        first_name,
        *,
        gender=None,
        position=POSITION.B,
        is_captain=False,
        years_experience=0,
    ):
        ballkid = Ballkid.objects.create(
            first_name=first_name,
            last_name="Test",
            position=position,
            preferred_position=position,
            is_checked_in=True,
            is_captain=is_captain,
            num_years_experience=years_experience,
        )

        if gender:
            self._application_number += 1
            application = BallcrewApplication.objects.create(
                email=f"applicant{self._application_number}@example.com",
                first_name=first_name,
                last_name="Test",
                gender=gender,
                date_of_birth=date(2000, 1, 1),
                state="DC",
                phone="2025550100",
                emergency_contact_name="Emergency Contact",
                emergency_contact_phone="2025550101",
                tshirt_size="M",
                shorts_size="M",
                shoe_size="9",
                motivation="I enjoy tennis.",
                is_vegetarian=False,
                is_veteran=True,
                waiver_signature_name=f"{first_name} Test",
            )
            application.promoted_ballkid = ballkid
            application.save(update_fields=["promoted_ballkid"])

        return ballkid

    def generate(self, num_teams, *, shift_groups=None):
        generator = TeamsGenerator(num_teams)
        with (
            patch(
                "api.utils.teams_generator.get_previous_captains",
                return_value={},
            ),
            patch(
                "api.utils.teams_generator.get_previous_teammates",
                return_value={},
            ),
        ):
            return generator.create_teams(shift_groups=shift_groups)

    def team_for(self, teams, ballkid_id):
        return next(
            team for team in teams if ballkid_id in team.member_ids
        )

    def test_flexible_girls_fill_teams_without_splitting_shift_group(self):
        grouped_girl = self.make_ballkid(
            "GroupedGirl", gender="F", position=POSITION.N
        )
        grouped_boy = self.make_ballkid("GroupedBoy", position=POSITION.B)
        flexible_girl = self.make_ballkid(
            "FlexibleGirl", gender="F", position=POSITION.B
        )

        teams = self.generate(
            2, shift_groups=[[grouped_girl.id, grouped_boy.id]]
        )

        grouped_team = self.team_for(teams, grouped_girl.id)
        self.assertIn(grouped_boy.id, grouped_team.member_ids)

        flexible_girl_team = self.team_for(teams, flexible_girl.id)
        self.assertNotEqual(grouped_team.number, flexible_girl_team.number)
        self.assertTrue(all(team.has_female() for team in teams))

    def test_female_captain_counts_and_other_girl_fills_remaining_team(self):
        female_captain = self.make_ballkid(
            "FemaleCaptain",
            gender="F",
            position=POSITION.N,
            is_captain=True,
        )
        male_captain = self.make_ballkid(
            "MaleCaptain",
            position=POSITION.B,
            is_captain=True,
        )
        flexible_girl = self.make_ballkid(
            "FlexibleGirl", gender="F", position=POSITION.B
        )

        teams = self.generate(2)

        female_captain_team = self.team_for(teams, female_captain.id)
        male_captain_team = self.team_for(teams, male_captain.id)
        flexible_girl_team = self.team_for(teams, flexible_girl.id)

        self.assertNotEqual(female_captain_team.number, male_captain_team.number)
        self.assertEqual(male_captain_team.number, flexible_girl_team.number)
        self.assertTrue(all(team.has_female() for team in teams))

    def test_existing_group_assignment_is_kept_when_female_pool_is_too_small(self):
        grouped_girl = self.make_ballkid(
            "OnlyGirl", gender="F", position=POSITION.N
        )
        grouped_boy = self.make_ballkid("GroupedBoy", position=POSITION.B)
        self.make_ballkid("OtherBoy", position=POSITION.N)

        teams = self.generate(
            2, shift_groups=[[grouped_girl.id, grouped_boy.id]]
        )

        grouped_team = self.team_for(teams, grouped_girl.id)
        self.assertIn(grouped_boy.id, grouped_team.member_ids)
        self.assertEqual(1, sum(team.has_female() for team in teams))
