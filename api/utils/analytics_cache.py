"""
Throttled / change-aware wrappers around the expensive recalculations that
the leaderboard views used to run on every GET.

- Check-in / court analytics: recomputed at most every `max_age` seconds, or
  sooner (`min_interval`) once a write has marked them stale.
- Calibration: skipped entirely unless the set of ratings (or the calibration
  settings) changed since the last successful run.

State lives in Django's cache, so it needs a cache shared by all gunicorn
workers (see the CACHES setting below). With the default per-process LocMem
cache this still works, but each worker keeps its own state.

Writes that bypass model signals (bulk_create, queryset.update) won't mark
anything stale; the max_age timer still catches them.
"""

import logging
import time

from django.core.cache import cache
from django.db.models import Count, Max, Q
from django.db.models.signals import post_delete, post_save

logger = logging.getLogger("api.utils")

PREFIX = "analytics"
LOCK_SECONDS = 120


def _k(name, field):
    return f"{PREFIX}:{name}:{field}"


def mark_stale(*names):
    for name in names:
        cache.set(_k(name, "dirty"), True, None)


def ensure_fresh(name, recompute, max_age=60, min_interval=5):
    """
    Run `recompute()` unless a recent result exists. Returns True if it ran.

    - never computed             -> compute
    - older than max_age         -> compute
    - marked stale and older
      than min_interval          -> compute
    - another request computing  -> serve the existing data
    """
    now = time.time()
    computed_at = cache.get(_k(name, "at"))
    dirty = cache.get(_k(name, "dirty"), False)

    if computed_at is not None:
        age = now - computed_at
        if age < max_age and not (dirty and age >= min_interval):
            return False

    owns_lock = cache.add(_k(name, "lock"), 1, timeout=LOCK_SECONDS)
    if not owns_lock and computed_at is not None:
        return False

    try:
        # Clear before computing so a write during the run re-marks it stale.
        cache.delete(_k(name, "dirty"))
        recompute()
        cache.set(_k(name, "at"), time.time(), None)
        return True
    except Exception:
        if dirty:
            mark_stale(name)
        raise
    finally:
        if owns_lock:
            cache.delete(_k(name, "lock"))


def refresh_checkin_analytics(**kwargs):
    from api.views.ballkid import recalc_checkin_analytics

    return ensure_fresh("checkin", recalc_checkin_analytics, **kwargs)


def refresh_court_analytics(**kwargs):
    from api.views.ballkid import recalc_court_analytics

    return ensure_fresh("court", recalc_court_analytics, **kwargs)


# --------------------------------------------------------------- calibration


def calibration_signature(year):
    """Cheap fingerprint of everything calibration depends on."""
    from api.models.ballkid import Ballkid
    from api.models.enums import RATING_STATUS
    from api.models.rating import Rating
    from api.models.schedule import Tournament

    live = Rating.objects.filter(
        status__in=[
            RATING_STATUS.COMPLETE,
            RATING_STATUS.AUTO_EXCLUDED,
            RATING_STATUS.EXCLUDED,
        ]
    )
    agg = live.aggregate(
        n=Count("id"),
        last=Max("id"),
        excluded=Count("id", filter=Q(status=RATING_STATUS.EXCLUDED)),
    )
    settings = (
        Tournament.objects.filter(year=year)
        .values_list(
            "rcal_calibration_threshold",
            "rcal_ignore_outliers",
            "rcal_year_threshold",
            "rcal_bucket_size",
        )
        .first()
    )
    active = Ballkid.objects.filter(is_active=True).count()
    return (year, agg["n"], agg["last"], agg["excluded"], settings, active)


def ensure_calibrated(year, ttl=3600):
    """Run calibration only if the ratings changed. Returns True if it ran."""
    from api.views.rating import run_calibration_and_save_params

    signature = calibration_signature(year)
    sig_key = _k(f"calibration:{year}", "sig")
    if cache.get(sig_key) == signature:
        return False

    lock_key = _k(f"calibration:{year}", "lock")
    if not cache.add(lock_key, 1, timeout=LOCK_SECONDS):
        return False  # someone else is already calibrating

    try:
        cp = run_calibration_and_save_params(year)[0]
        if cp is not None:  # never remember a failed run as "done"
            cache.set(sig_key, signature, ttl)
        return True
    finally:
        cache.delete(lock_key)


# ------------------------------------------------------------------- signals

_installed = False


def install():
    global _installed
    if _installed:
        return
    _installed = True

    from api.models.ballkid import CheckinHistory, TeamHistory
    from api.models.schedule import Schedule

    mapping = {
        CheckinHistory: ("checkin",),
        TeamHistory: ("court",),
        Schedule: ("court",),
    }
    for model, names in mapping.items():

        def handler(sender, _names=names, **kwargs):
            mark_stale(*_names)

        for signal in (post_save, post_delete):
            signal.connect(
                handler,
                sender=model,
                weak=False,
                dispatch_uid=f"analytics_stale_{model.__name__}_{signal.__class__.__name__}_{id(signal)}",
            )