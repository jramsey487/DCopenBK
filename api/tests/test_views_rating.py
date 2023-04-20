from django.test import TestCase
from datetime import datetime, timedelta, date
from api.views.rating import *
from api.models.rating import Rating
from api.models.ballkid import Ballkid
from rcal import CalibrationParameters


class TestViewsRating(TestCase):
    def setUp(self):
        self.ratee1 = Ballkid(first_name="Lacy", last_name="Iosue")
        self.ratee2 = Ballkid(first_name="Andrea", last_name="Iosue")
        self.rater1 = Ballkid(first_name="Captain", last_name="Iosue")
        self.rater2 = Ballkid(first_name="Joe", last_name="Iosue")
        self.ratee1.save()
        self.ratee2.save()
        self.rater1.save()
        self.rater2.save()

    def test_dict_to_rcal_empty(self):
        ratings = Rating.objects.all()
        min_date = date.today() - timedelta(days=1)

        self.assertEqual({}, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_overall_zero(self):
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
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {}

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_single_rating_per_rater_per_ratee(self):
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
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): 3.5,
            ("Joe Iosue", "Andrea Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_multiple_ratings_per_rater(self):
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
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): 3.5,
            ("Captain Iosue", "Andrea Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_multiple_ratings_per_ratee(self):
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
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): 3.5,
            ("Joe Iosue", "Lacy Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_multiple_ratings_per_rater_per_ratee(self):
        rating1 = Rating.objects.create(
            ratee=self.ratee1, rater=self.rater1, date=date.today(), rating=3
        )
        rating2 = Rating.objects.create(
            ratee=self.ratee1,
            rater=self.rater1,
            date=date.today() - timedelta(days=1),
            rating=5,
        )

        ratings = Rating.objects.all()
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): 3,
            ("Captain Iosue", "Lacy Iosue", 0): 5,
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_multiple_ratings_per_rater_per_ratee_averaged(self):
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
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): 4,
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date))

    def test_dict_to_rcal_multiple_ratings_per_rater_per_ratee_nonaveraged(self):
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
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): [3, 5],
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date, returnAveraged=False))

    def test_dict_to_rcal_multiple_ratings_per_rater_per_ratee_nonaveraged_ordered(self):
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
        min_date = date.today() - timedelta(days=1)

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 1): [5, 3],
        }

        self.assertEqual(rcal_dict, dict_to_rcal(ratings, min_date, returnAveraged=False))

    def test_dict_to_rcal_athleticism_empty(self):
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
        min_date = date.today()

        rcal_dict = {}

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="athleticism")
        )

    def test_dict_to_rcal_athleticism_zero(self):
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
        min_date = date.today()

        rcal_dict = {}

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="athleticism")
        )

    def test_dict_to_rcal_athleticism_nonzero(self):
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
        min_date = date.today()

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 0.5,
            ("Joe Iosue", "Andrea Iosue", 0): 2,
        }

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="athleticism")
        )

    def test_dict_to_rcal_athleticism_nonzero_averaged(self):
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
        min_date = date.today()

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 1.5,
        }

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="athleticism")
        )

    def test_dict_to_rcal_athleticism_nonzero_nonaveraged(self):
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
        min_date = date.today()

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): [1, 2],
        }

        self.assertEqual(
            rcal_dict,
            dict_to_rcal(
                ratings, min_date, rating_name="athleticism", returnAveraged=False
            ),
        )

    def test_dict_to_rcal_decision_zero(self):
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
        min_date = date.today()

        rcal_dict = {}

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="decision")
        )

    def test_dict_to_rcal_decision_nonzero(self):
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
        min_date = date.today()

        rcal_dict = {
            ("Captain Iosue", "Lacy Iosue", 0): 0.5,
            ("Joe Iosue", "Andrea Iosue", 0): 2,
        }

        self.assertEqual(
            rcal_dict, dict_to_rcal(ratings, min_date, rating_name="decision")
        )

    def test_calibrate(self):
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

        cp = calibrate(ratings)
        self.assertIsInstance(cp, CalibrationParameters, f"Type: {type(cp)}")
