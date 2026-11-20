from unittest.mock import patch

from django.core.cache import cache
from django.test import SimpleTestCase, override_settings

from api.utils import analytics_cache


@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class AnalyticsCacheTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_ensure_fresh_runs_when_no_cached_timestamp_exists(self):
        ran = []
        with patch("api.utils.analytics_cache.time.time", return_value=100):
            self.assertTrue(
                analytics_cache.ensure_fresh("checkin", lambda: ran.append(True))
            )
        self.assertEqual(ran, [True])
        self.assertEqual(cache.get(analytics_cache._k("checkin", "at")), 100)

    def test_recent_result_is_reused(self):
        cache.set(analytics_cache._k("court", "at"), 100, None)
        with patch("api.utils.analytics_cache.time.time", return_value=110):
            self.assertFalse(
                analytics_cache.ensure_fresh(
                    "court", lambda: self.fail("unexpected"), max_age=60
                )
            )

    def test_old_result_is_recomputed(self):
        cache.set(analytics_cache._k("court", "at"), 100, None)
        ran = []
        with patch("api.utils.analytics_cache.time.time", return_value=200):
            self.assertTrue(
                analytics_cache.ensure_fresh(
                    "court", lambda: ran.append(True), max_age=60
                )
            )
        self.assertEqual(ran, [True])

    def test_dirty_result_waits_for_minimum_interval(self):
        cache.set(analytics_cache._k("checkin", "at"), 100, None)
        analytics_cache.mark_stale("checkin")
        with patch("api.utils.analytics_cache.time.time", return_value=103):
            self.assertFalse(
                analytics_cache.ensure_fresh(
                    "checkin", lambda: self.fail("too soon"),
                    max_age=600, min_interval=5
                )
            )
        with patch("api.utils.analytics_cache.time.time", return_value=106):
            self.assertTrue(
                analytics_cache.ensure_fresh(
                    "checkin", lambda: None, max_age=600, min_interval=5
                )
            )
        self.assertFalse(cache.get(analytics_cache._k("checkin", "dirty"), False))

    def test_existing_lock_prevents_duplicate_recompute(self):
        cache.set(analytics_cache._k("court", "at"), 100, None)
        cache.add(analytics_cache._k("court", "lock"), 1, timeout=120)
        with patch("api.utils.analytics_cache.time.time", return_value=200):
            self.assertFalse(
                analytics_cache.ensure_fresh(
                    "court", lambda: self.fail("lock was ignored"), max_age=10
                )
            )

    def test_failed_recompute_does_not_advance_timestamp_and_preserves_dirty_flag(self):
        cache.set(analytics_cache._k("checkin", "at"), 100, None)
        analytics_cache.mark_stale("checkin")
        with patch("api.utils.analytics_cache.time.time", return_value=200):
            with self.assertRaisesRegex(RuntimeError, "recompute failed"):
                analytics_cache.ensure_fresh(
                    "checkin",
                    lambda: (_ for _ in ()).throw(RuntimeError("recompute failed")),
                    max_age=10,
                )
        self.assertEqual(cache.get(analytics_cache._k("checkin", "at")), 100)
        self.assertTrue(cache.get(analytics_cache._k("checkin", "dirty")))

    def test_mark_stale_sets_dirty_flag(self):
        analytics_cache.mark_stale("checkin", "court")
        self.assertTrue(cache.get(analytics_cache._k("checkin", "dirty")))
        self.assertTrue(cache.get(analytics_cache._k("court", "dirty")))


@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class CalibrationCacheTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    @patch("api.views.rating.run_calibration_and_save_params")
    @patch("api.utils.analytics_cache.calibration_signature")
    def test_calibration_is_skipped_when_signature_is_unchanged(
        self, signature, calibrate
    ):
        signature.return_value = ("same",)
        calibrate.return_value = (object(), None, None)

        self.assertTrue(analytics_cache.ensure_calibrated(2026))
        self.assertFalse(analytics_cache.ensure_calibrated(2026))
        calibrate.assert_called_once_with(2026)

    @patch("api.views.rating.run_calibration_and_save_params")
    @patch("api.utils.analytics_cache.calibration_signature")
    def test_changed_signature_triggers_calibration(self, signature, calibrate):
        signature.side_effect = [("first",), ("second",), ("second",), ("second",)]
        calibrate.return_value = (object(), None, None)

        self.assertTrue(analytics_cache.ensure_calibrated(2026))
        self.assertFalse(analytics_cache.ensure_calibrated(2026))
        self.assertEqual(calibrate.call_count, 2)

    @patch("api.views.rating.run_calibration_and_save_params")
    @patch("api.utils.analytics_cache.calibration_signature")
    def test_failed_calibration_is_not_cached_as_complete(self, signature, calibrate):
        signature.return_value = ("unchanged",)
        calibrate.return_value = (None, None, RuntimeError("no calibration"))

        self.assertTrue(analytics_cache.ensure_calibrated(2026))
        # A failed fit is throttled for the same input signature. It is not
        # cached as a successful calibration, and changed inputs can retry.
        self.assertFalse(analytics_cache.ensure_calibrated(2026))
        self.assertEqual(calibrate.call_count, 1)
        self.assertIsNone(cache.get(analytics_cache._k("calibration:2026", "sig")))
        self.assertEqual(
            cache.get(analytics_cache._k("calibration:2026", "failed")),
            ("unchanged",),
        )

        signature.return_value = ("changed",)
        self.assertTrue(analytics_cache.ensure_calibrated(2026))
        self.assertEqual(calibrate.call_count, 2)
