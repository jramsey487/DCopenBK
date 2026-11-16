from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        # rating.py contains the public calibration functions used throughout the
        # application. Install the query-optimized implementations after Django has
        # finished loading the app so existing callers keep the same API while the
        # calibration path avoids per-rater/per-ratee ORM queries.
        from api.utils import rating_calibration_optimized
        from api.views import rating
        from api.utils import analytics_cache

        analytics_cache.install()

        rating.get_min_dates = rating_calibration_optimized.get_min_dates
        rating.save_rater_params = rating_calibration_optimized.save_rater_params
        rating.save_ratee_params = rating_calibration_optimized.save_ratee_params

        # Audit log: Ballkid change signals + request/response hooks that
        # record who did what into ActionLog (see api/utils/audit.py).
        from api.utils import audit

        audit.install()

        # Ticket push notifications (round live, lottery results, waitlist
        # spots) hooked in via signals (see api/utils/push_events.py).
        from api.utils import push_events

        push_events.install()