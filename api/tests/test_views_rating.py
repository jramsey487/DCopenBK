from django.test import TestCase
from django.urls import reverse
from datetime import datetime, timedelta, date
from rest_framework.test import APITestCase, APIClient

from api.views.rating import *
from api.models.rating import CalibrationParams, Rating
from api.models.enums import RATING_STATUS
from api.models.ballkid import Ballkid
from api.serializers import BallkidSerializer
from api.utils.utils import *
from api.calibration import CalibrationParameters


class TestViewsRatingHelpers(TestCase):
    def setUp(self):
        self.tournament = Tournament(year=get_current_year())
        self.tournament.save()

        self.ratee1 = Ballkid(first_name="Lacy", last_name="Iosue")
        self.ratee2 = Ballkid(first_name="Andrea", last_name="Iosue")
        self.ratee3 = Ballkid(first_name="Lace", last_name="Iosue")
        self.rater1 = Ballkid(first_name="Captain", last_name="Iosue")
        self.rater2 = Ballkid(first_name="Joe", last_name="Iosue")
        self.rater3 = Ballkid(first_name="Dino", last_name="Iosue")
        self.ratee1.save()
        self.ratee2.save()
        self.ratee3.save()
        self.rater1.save()
        self.rater2.save()
        self.rater3.save()

        self.days_per_bucket = 3

    def test_queryset_to_rcal_empty(self):
        ratings = Rating.objects.annotate(
            ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
            rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
        )
        self.assertEqual({}, queryset_to_rcal(ratings))

    def test_queryset_to_rcal_overall_zero(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=0
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today() - timedelta(days=1),
            rating=0,
        )

        ratings = Rating.objects.annotate(
            ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
            rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
        )
        rcal_dict = {}

        self.assertEqual(rcal_dict, queryset_to_rcal(ratings))

    def test_queryset_to_rcal_single_rating_per_rater_per_ratee(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3.5
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today() - timedelta(days=1),
            rating=5,
        )

        ratings = Rating.objects.annotate(
            ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
            rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
        )
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 3.5,
            ("Joe Iosue", "Andrea Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, queryset_to_rcal(ratings))

    def test_queryset_to_rcal_multiple_ratings_per_rater(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3.5
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater1,
            date=date.today() - timedelta(days=1),
            rating=5,
        )

        ratings = Rating.objects.annotate(
            ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
            rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
        )
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 3.5,
            ("Captain Iosue", "Andrea Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, queryset_to_rcal(ratings))

    def test_queryset_to_rcal_multiple_ratings_per_rater_across_buckets(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3.5
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater1,
            date=date.today() - timedelta(days=5),
            rating=5,
        )

        ratings = Rating.objects.annotate(
            ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
            rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
        )
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", self.days_per_bucket): 3.5,
            ("Captain Iosue", "Andrea Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, queryset_to_rcal(ratings))

    def test_queryset_to_rcal_multiple_ratings_per_ratee(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3.5
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater2,
            date=date.today() - timedelta(days=1),
            rating=5,
        )

        ratings = Rating.objects.annotate(
            ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
            rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
        )
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 3.5,
            ("Joe Iosue", "Lacy Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, queryset_to_rcal(ratings))

    def test_queryset_to_rcal_multiple_ratings_per_rater_per_ratee_averaged(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
        )

        ratings = Rating.objects.annotate(
            ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
            rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
        )
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 4,
        }

        self.assertEqual(rcal_dict, queryset_to_rcal(ratings))

    def test_queryset_to_rcal_multiple_ratings_per_rater_per_ratee_nonaveraged(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
        )

        ratings = Rating.objects.annotate(
            ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
            rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
        )
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): [3, 5],
        }

        self.assertEqual(rcal_dict, queryset_to_rcal(ratings, returnAveraged=False))

    def test_queryset_to_rcal_multiple_ratings_per_rater_per_ratee_nonaveraged_ordered(
        self,
    ):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=5
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
        )

        ratings = Rating.objects.annotate(
            ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
            rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
        )
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): [5, 3],
        }

        self.assertEqual(rcal_dict, queryset_to_rcal(ratings, returnAveraged=False))

    def test_calibrate_passing(self):
        Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            decision_rating=0.5,
        )
        Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today(),
            rating=3,
            decision_rating=2,
        )
        Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater2,
            date=date.today(),
            rating=4,
            decision_rating=2,
        )
        # ratings = Rating.objects.annotate(
        #     ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
        #     rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
        # )
        # year_ratings = ratings.filter(date__year=get_current_year())

        # cp, excluded, error = calibrate(ratings, year_ratings)
        cp, _, _, _ = run_calibration_and_save_params(get_current_year())
        self.assertIsInstance(cp, CalibrationParameters, f"Type: {type(cp)}")

    def test_calibrate_excluded(self):
        Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            decision_rating=0.5,
        )
        Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today(),
            rating=3,
            decision_rating=2,
        )
        Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater2,
            date=date.today(),
            rating=4,
            decision_rating=2,
        )
        Rating.objects.create(
            ratee=self.ratee3,
            rater=self.rater3,
            date=date.today(),
            rating=4,
        )

        cp, excluded, error, year_ratings = run_calibration_and_save_params(
            get_current_year()
        )

        self.assertIsInstance(cp, CalibrationParameters, f"Type: {type(cp)}")

        self.assertEqual(1, len(excluded))
        self.assertEqual(self.rater3.get_name(), excluded.pop())


    def test_autoexclude_ignores_prior_year_calibration(self):
        current_year = get_current_year()
        prior_year = current_year - 1
        rating = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date(current_year, 7, 1),
            rating=4,
        )
        CalibrationParams.objects.create(
            ballkid=self.rater1,
            year=prior_year,
            rater_distance_to_ideal=10,
        )

        current_year_ratings = Rating.objects.filter(date__year=current_year)
        autoexclude(current_year_ratings, 1.0, current_year)

        rating.refresh_from_db()
        self.assertEqual(RATING_STATUS.COMPLETE, rating.status)

    def test_autoexclude_uses_current_year_calibration(self):
        current_year = get_current_year()
        rating = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date(current_year, 7, 1),
            rating=4,
        )
        CalibrationParams.objects.create(
            ballkid=self.rater1,
            year=current_year,
            rater_distance_to_ideal=10,
        )

        current_year_ratings = Rating.objects.filter(date__year=current_year)
        autoexclude(current_year_ratings, 1.0, current_year)

        rating.refresh_from_db()
        self.assertEqual(RATING_STATUS.AUTO_EXCLUDED, rating.status)

    def test_failed_calibration_does_not_apply_stale_auto_exclusions(self):
        current_year = get_current_year()
        ratings = [
            Rating.objects.create(
                ratee=self.ratee1,
                rater=self.rater1,
                date=date.today(),
                rating=5,
            ),
            Rating.objects.create(
                ratee=self.ratee2,
                rater=self.rater2,
                date=date.today(),
                rating=3,
            ),
            Rating.objects.create(
                ratee=self.ratee3,
                rater=self.rater3,
                date=date.today(),
                rating=4,
            ),
        ]
        # Simulate a stale, high bias score left by an earlier successful run.
        CalibrationParams.objects.create(
            ballkid=self.rater1,
            year=current_year,
            rater_distance_to_ideal=100,
        )

        cp, excluded, error, year_ratings = run_calibration_and_save_params(
            current_year
        )

        self.assertIsNone(cp)
        self.assertIsNotNone(error)
        for rating in ratings:
            rating.refresh_from_db()
            self.assertEqual(RATING_STATUS.COMPLETE, rating.status)

        # Failed calibration must not overwrite stale reviewer parameters,
        # but raw ratee statistics must still be refreshed for leaderboards.
        stale_rater_params = CalibrationParams.objects.get(
            ballkid=self.rater1,
            year=current_year,
        )
        self.assertEqual(100, stale_rater_params.rater_distance_to_ideal)

        raw_ratee_params = CalibrationParams.objects.get(
            ballkid=self.ratee1,
            year=current_year,
        )
        self.assertEqual(5, raw_ratee_params.ratee_raw_avg)
        self.assertEqual(1, raw_ratee_params.num_ratee_ratings)
        self.assertIsNone(raw_ratee_params.ratee_calibrated_avg)

    def test_calibrate_fail(self):
        Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            decision_rating=0.5,
        )
        Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today(),
            rating=3,
            decision_rating=2,
        )
        Rating.objects.create(
            ratee=self.ratee3,
            rater=self.rater3,
            date=date.today(),
            rating=4,
        )
        cp, excluded, error, year_ratings = run_calibration_and_save_params(
            get_current_year()
        )

        self.assertIsNone(cp)
        self.assertIsNotNone(error)


class TestCalibratedRatingsView(APITestCase):
    def setUp(self):
        self.client = setup_testing_client()
        self.year = get_current_year()

        self.tournament = Tournament(year=self.year)
        self.tournament.save()

        self.ratee1 = Ballkid(first_name="Ballkid", last_name="Iosue")
        self.ratee2 = Ballkid(first_name="Andrea", last_name="Iosue")
        self.ratee3 = Ballkid(first_name="Lacy", last_name="Iosue")
        self.rater1 = Ballkid(first_name="Captain", last_name="Iosue")
        self.rater2 = Ballkid(first_name="Joe", last_name="Iosue")
        self.rater3 = Ballkid(first_name="Ridiculous", last_name="Iosue")
        self.ratee1.save()
        self.ratee2.save()
        self.ratee3.save()
        self.rater1.save()
        self.rater2.save()
        self.rater3.save()

        # Rater 1 uses the full spectrum
        Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=1,
        )
        Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater1,
            date=date.today(),
            rating=3,
        )
        Rating.objects.create(
            ratee=self.ratee3,
            rater=self.rater1,
            date=date.today(),
            rating=5,
        )
        # Rater 2 uses the full spectrum
        Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater2,
            date=date.today(),
            rating=1,
        )
        Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today(),
            rating=3,
        )
        Rating.objects.create(
            ratee=self.ratee3,
            rater=self.rater2,
            date=date.today(),
            rating=5,
        )
        # Rater 3 is ridiculous
        Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater3,
            date=date.today(),
            rating=5,
        )
        Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater3,
            date=date.today(),
            rating=5,
        )
        Rating.objects.create(
            ratee=self.ratee3,
            rater=self.rater3,
            date=date.today(),
            rating=5,
        )

    def test_num_calibrated_ratings(self):
        response = self.client.get(
            reverse("calibrated-ratings", kwargs={"year": self.year})
        )

        self.assertEqual(status.HTTP_200_OK, response.status_code)
        self.assertEqual(9, len(response.data))

    def test_calibrated_ratee_avg(self):
        response = self.client.get(
            reverse("calibrated-ratings", kwargs={"year": self.year})
        )

        ratee_params1 = CalibrationParams.objects.get(ballkid=self.ratee1)
        ratee_params2 = CalibrationParams.objects.get(ballkid=self.ratee2)
        ratee_params3 = CalibrationParams.objects.get(ballkid=self.ratee3)

        self.assertLess(
            ratee_params1.ratee_calibrated_avg, ratee_params2.ratee_calibrated_avg
        )
        self.assertLess(
            ratee_params2.ratee_calibrated_avg, ratee_params3.ratee_calibrated_avg
        )

    def test_calibrated_rater_distance_to_ideal(self):
        response = self.client.get(
            reverse("calibrated-ratings", kwargs={"year": self.year})
        )

        params1 = CalibrationParams.objects.get(ballkid=self.rater1)
        params2 = CalibrationParams.objects.get(ballkid=self.rater2)
        params3 = CalibrationParams.objects.get(ballkid=self.rater3)

        self.assertLess(
            params1.rater_distance_to_ideal, params3.rater_distance_to_ideal
        )
        self.assertLess(
            params2.rater_distance_to_ideal, params3.rater_distance_to_ideal
        )
        self.assertLess(1, params3.rater_distance_to_ideal)

    def test_calibrated_rater_distance_to_ideal(self):
        self.client.get(reverse("calibrated-ratings", kwargs={"year": self.year}))
        excluding_avg = CalibrationParams.objects.get(
            ballkid=self.ratee3
        ).ratee_calibrated_avg

        self.tournament.rcal_calibration_threshold = float("inf")
        self.tournament.save()

        self.client.get(reverse("calibrated-ratings", kwargs={"year": self.year}))
        including_avg = CalibrationParams.objects.get(
            ballkid=self.ratee3
        ).ratee_calibrated_avg

        self.assertGreater(excluding_avg, including_avg)

    def test_calibrationparams_ratee(self):
        response = self.client.get(
            reverse("calibrated-ratings", kwargs={"year": self.year})
        )

        params = CalibrationParams.objects.get(ballkid=self.ratee1)

        self.assertEqual(1, params.ratee_raw_avg)
        self.assertGreater(1, params.ratee_calibrated_avg)
        self.assertEqual(2, params.num_ratee_ratings)
        self.assertEqual(2, params.num_raters)

    def test_calibrationparams_rater(self):
        response = self.client.get(
            reverse("calibrated-ratings", kwargs={"year": self.year})
        )

        params = CalibrationParams.objects.get(ballkid=self.rater1)

        self.assertEqual(3, params.num_rater_ratings)
        self.assertEqual(0, params.num_ratee_ratings)
        self.assertEqual(3, params.rater_raw_avg)
