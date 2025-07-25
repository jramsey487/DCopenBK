from django.test import TestCase
from django.urls import reverse
from datetime import datetime, timedelta, date
from rest_framework.test import APITestCase, APIClient

from api.views.rating import *
from api.models.rating import Rating
from api.models.ballkid import Ballkid
from api.serializers import BallkidSerializer
from api.utils.utils import *
from rcal import CalibrationParameters


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
        ratings = Rating.objects.all()
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

        ratings = Rating.objects.all()
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

        ratings = Rating.objects.all()
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

        ratings = Rating.objects.all()
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

        ratings = Rating.objects.all()
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

        ratings = Rating.objects.all()
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

        ratings = Rating.objects.all()
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

        ratings = Rating.objects.all()
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

        ratings = Rating.objects.all()
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): [5, 3],
        }

        self.assertEqual(rcal_dict, queryset_to_rcal(ratings, returnAveraged=False))

    def test_queryset_to_rcal_athleticism_empty(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=5
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
        )

        ratings = Rating.objects.all()
        rcal_dict = {}

        self.assertEqual(
            rcal_dict, queryset_to_rcal(ratings, rating_name="athleticism")
        )

    def test_queryset_to_rcal_athleticism_zero(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            athleticism_rating=0,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
        )

        ratings = Rating.objects.all()
        rcal_dict = {}

        self.assertEqual(
            rcal_dict, queryset_to_rcal(ratings, rating_name="athleticism")
        )

    def test_queryset_to_rcal_athleticism_nonzero(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            athleticism_rating=0.5,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today(),
            rating=3,
            athleticism_rating=2,
        )

        ratings = Rating.objects.all()
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 0.5,
            ("Joe Iosue", "Andrea Iosue", 0): 2,
        }

        self.assertEqual(
            rcal_dict, queryset_to_rcal(ratings, rating_name="athleticism")
        )

    def test_queryset_to_rcal_athleticism_nonzero_averaged(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            athleticism_rating=1,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
            athleticism_rating=2,
        )

        ratings = Rating.objects.all()
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 1.5,
        }

        self.assertEqual(
            rcal_dict, queryset_to_rcal(ratings, rating_name="athleticism")
        )

    def test_queryset_to_rcal_athleticism_nonzero_nonaveraged(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            athleticism_rating=1,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
            athleticism_rating=2,
        )

        ratings = Rating.objects.all()
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): [1, 2],
        }

        self.assertEqual(
            rcal_dict,
            queryset_to_rcal(ratings, rating_name="athleticism", returnAveraged=False),
        )

    def test_queryset_to_rcal_decision_zero(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            decision_rating=0,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=3,
        )

        ratings = Rating.objects.all()
        rcal_dict = {}

        self.assertEqual(rcal_dict, queryset_to_rcal(ratings, rating_name="decision"))

    def test_queryset_to_rcal_decision_nonzero(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today(),
            rating=5,
            decision_rating=0.5,
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee2,
            rater=self.rater2,
            date=date.today(),
            rating=3,
            decision_rating=2,
        )

        ratings = Rating.objects.all()
        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 0.5,
            ("Joe Iosue", "Andrea Iosue", 0): 2,
        }

        self.assertEqual(rcal_dict, queryset_to_rcal(ratings, rating_name="decision"))

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
        ratings = Rating.objects.all()
        year_ratings = ratings.filter(date__year=get_current_year())

        cp, excluded, error = calibrate(ratings, year_ratings)
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
        ratings = Rating.objects.all()
        year_ratings = ratings.filter(date__year=get_current_year())

        cp, excluded, error = calibrate(ratings, year_ratings)
        self.assertIsInstance(cp, CalibrationParameters, f"Type: {type(cp)}")

        self.assertEqual(1, len(excluded))
        self.assertEqual(self.rater3.get_name(), excluded.pop())

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
        ratings = Rating.objects.all()
        year_ratings = ratings.filter(date__year=get_current_year())

        cp, excluded, error = calibrate(ratings, year_ratings)
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

        self.assertEqual(2, params.num_ratee_ratings)
        self.assertEqual(2, params.num_raters)
        self.assertEqual(statistics.mean([1, 1, 5]), params.ratee_raw_avg)
        self.assertGreater(statistics.mean([1, 1, 5]), params.ratee_calibrated_avg)

    def test_calibrationparams_rater(self):
        response = self.client.get(
            reverse("calibrated-ratings", kwargs={"year": self.year})
        )

        params = CalibrationParams.objects.get(ballkid=self.rater1)

        self.assertEqual(3, params.num_rater_ratings)
        self.assertEqual(0, params.num_ratee_ratings)
        self.assertEqual(3, params.rater_raw_avg)
