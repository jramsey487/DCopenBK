"""
Throttled / change-aware wrappers around the expensive recalculations that
the leaderboard views used to run on every GET.

- Check-in / court analytics: recomputed at most every `max_age` seconds, or
  sooner (`min_interval`) once a write has marked them stale.
- Calibration: skipped entirely unless the set of ratings (or the calibration
  settings) changed since the last successful run. It is also refreshed in
  the background shortly after ratings are submitted / excluded / deleted, so
  pages that only *read* calibration results (the Cut page's rank pills,
  finals teams, the leaderboards) never show stale numbers just because
  nobody opened a leaderboard first.

State lives in Django's cache, so it needs a cache shared by all gunicorn
workers (see the CACHES setting). With the default per-process LocMem
cache this still works, but each worker keeps its own state.

Writes that bypass model signals (bulk_create, queryset.update) won't mark
anything stale; the max_age timer still catches them. Calibration itself
changes rating statuses with queryset.update(), which deliberately does not
fire the signals below, so a calibration run can't retrigger itself.
"""

import hashlib
import logging
import threading
import time

from django.core.cache import cache
from django.db import close_old_connections, transaction
from django.db.models import Count, Max, Sum
from django.db.models.signals import post_delete, post_save

logger = logging.getLogger("api.utils")

PREFIX = "analytics"
LOCK_SECONDS = 120

# How long a failed calibration for one exact set of ratings is remembered, so
# a leaderboard that gets opened repeatedly doesn't redo a doomed 10-second
# fit on every request. Any change to the ratings changes the signature and
# clears this automatically.
CALIBRATION_FAIL_TTL = 120

# If ratings change again while calibration is running, run once more (bounded).
MAX_CALIBRATION_PASSES = 3

# Background refresh: wait this long after the first change in a burst, then
# check again once more later in case a change landed while a run was active.
REFRESH_DELAYS = (3, 25)


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
    # cache.add is the atomic lock acquisition. If another worker owns the
    # lock, never recompute here—even when no timestamp exists yet. Otherwise
    # simultaneous first requests can all run the expensive calculation.
    if not owns_lock:
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
    """
    Cheap fingerprint of everything calibration depends on.

    The set of manually excluded ratings is hashed (not just counted): a
    chairperson un-excluding one rating and excluding another leaves the
    count, the newest id and the number of excluded ratings all unchanged, so
    those alone can't tell the two situations apart. The id sum likewise
    catches "one rating removed and another added".
    """
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
    agg = live.aggregate(n=Count("id"), last=Max("id"), total=Sum("id"))
    excluded_ids = sorted(
        live.filter(status=RATING_STATUS.EXCLUDED).values_list("id", flat=True)
    )
    excluded_hash = hashlib.md5(
        ",".join(str(i) for i in excluded_ids).encode("ascii")
    ).hexdigest()
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
    return (
        year,
        agg["n"],
        agg["last"],
        agg["total"],
        len(excluded_ids),
        excluded_hash,
        settings,
        active,
    )


def ensure_calibrated(year, ttl=3600, fail_ttl=CALIBRATION_FAIL_TTL):
    """
    Run calibration only if the ratings changed. Returns True if it ran.

    Never raises: a calibration problem (e.g. no Tournament row for `year`
    yet, or too little data to fit) is logged and the previously saved
    results keep being served, instead of turning every leaderboard / cut
    page load into a 500.
    """
    from api.views.rating import run_calibration_and_save_params

    try:
        signature = calibration_signature(year)
    except Exception:
        logger.exception("[ensure_calibrated] could not fingerprint ratings")
        return False

    sig_key = _k(f"calibration:{year}", "sig")
    fail_key = _k(f"calibration:{year}", "failed")
    if cache.get(sig_key) == signature:
        return False
    if cache.get(fail_key) == signature:
        return False  # this exact data already failed recently

    lock_key = _k(f"calibration:{year}", "lock")
    if not cache.add(lock_key, 1, timeout=LOCK_SECONDS):
        return False  # someone else is already calibrating

    try:
        current = signature
        for _ in range(MAX_CALIBRATION_PASSES):
            try:
                cp = run_calibration_and_save_params(year)[0]
            except Exception:
                logger.exception("[ensure_calibrated] calibration crashed")
                cache.set(fail_key, current, fail_ttl)
                return True

            if cp is None:  # never remember a failed fit as "done"
                cache.set(fail_key, current, fail_ttl)
                return True

            cache.set(sig_key, current, ttl)

            # Ratings may have changed while we were calibrating.
            latest = calibration_signature(year)
            if latest == current:
                break
            current = latest
        return True
    finally:
        cache.delete(lock_key)


def _background_refresh(year):
    try:
        for delay in REFRESH_DELAYS:
            time.sleep(delay)
            if delay == REFRESH_DELAYS[0]:
                cache.delete(_k("calibration:refresh", "pending"))
            ensure_calibrated(year)
    except Exception:
        logger.exception("[calibration refresh] background run failed")
    finally:
        close_old_connections()


def schedule_calibration_refresh(year=None):
    """
    Recalibrate shortly after ratings change, off the request thread.
    A burst of changes (several people submitting ratings at once) shares a
    single pending refresh.
    """
    from api.utils.utils import get_current_year

    if not cache.add(_k("calibration:refresh", "pending"), 1, timeout=60):
        return
    threading.Thread(
        target=_background_refresh,
        args=(year or get_current_year(),),
        daemon=True,
    ).start()


# ------------------------------------------------------------------- signals

_installed = False


def install():
    global _installed
    if _installed:
        return
    _installed = True

    from api.models.ballkid import CheckinHistory, TeamHistory
    from api.models.enums import RATING_STATUS
    from api.models.rating import Rating
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

    # Ratings: refresh calibration in the background after any change that
    # could alter it. Drafts never count toward calibration, and calibration's
    # own status updates use queryset.update(), which skips these signals.
    def rating_changed(sender, instance, **kwargs):
        if getattr(instance, "status", None) == RATING_STATUS.DRAFT:
            return
        try:
            transaction.on_commit(schedule_calibration_refresh)
        except Exception:
            logger.exception("[calibration refresh] could not schedule")

    for signal in (post_save, post_delete):
        signal.connect(
            rating_changed,
            sender=Rating,
            weak=False,
            dispatch_uid=f"calibration_refresh_Rating_{signal.__class__.__name__}",
        )
