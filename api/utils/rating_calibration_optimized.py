import logging
import statistics

from django.db.models import Avg, Count, StdDev, Min

from api.models.ballkid import Ballkid, CalibrationParams
from api.utils.consts import RATING_STATUS, MIN_RATING, MAX_RATING

logger = logging.getLogger("api.rating")


def get_min_dates(ratings):
    """Return the earliest rating date for each year with one query."""
    return {
        row["year"]: row["min_date"]
        for row in ratings.values("date__year").annotate(
            year=__import__("django.db.models", fromlist=["F"]).F("date__year"),
            min_date=Min("date"),
        ).values("year", "min_date")
    }


def save_rater_params(cp, year_ratings, year):
    """Save rater parameters without querying the ratings queryset per rater."""
    grouped = list(
        year_ratings.values("rater", "rater_name")
        .annotate(
            num_rater_ratings=Count("id"),
            rater_raw_avg=Avg("rating"),
            rater_raw_stdev=StdDev("rating"),
        )
    )

    scales = cp.reviewer_scales() if cp is not None else {}
    offsets = cp.reviewer_offsets() if cp is not None else {}

    for row in grouped:
        rater_id = row["rater"]
        name = row["rater_name"]
        a = scales.get(name) if cp is not None else None
        b = offsets.get(name) if cp is not None else None

        if a is None or b is None:
            distance = None
        else:
            distance = (1 / 4) * (
                37 * a**2 + a * (22 * b - 74) + 4 * b**2 - 22 * b + 37
            )

        defaults = {
            "num_rater_ratings": row["num_rater_ratings"],
            "rater_raw_avg": row["rater_raw_avg"],
            "rater_raw_stdev": row["rater_raw_stdev"],
            "rater_scale": a,
            "rater_offset": b,
            "rater_distance_to_ideal": distance,
        }
        params, _ = CalibrationParams.objects.update_or_create(
            ballkid_id=rater_id,
            year=year,
            defaults=defaults,
        )
        logger.info(
            f"[save_rater_params] Saved params for {name} with params {params}"
        )


def save_ratee_params(cp, year_ratings_wo_excluded, year):
    """Save ratee parameters after loading all ratings in one query."""
    ballkids = list(
        Ballkid.objects.filter(is_active=True).values_list(
            "id", "first_name", "last_name"
        )
    )

    ratings = list(
        year_ratings_wo_excluded.values(
            "ratee", "rater", "rating", "rater_name"
        )
    )
    ratings_by_ratee = {}
    for rating in ratings:
        ratings_by_ratee.setdefault(rating["ratee"], []).append(rating)

    improvement_rates = cp.improvement_rates() if cp is not None else {}
    person_offsets = cp.person_offsets() if cp is not None else {}

    for ballkid_id, first_name, last_name in ballkids:
        name = f"{first_name} {last_name}"
        ratee_ratings = ratings_by_ratee.get(ballkid_id, [])
        raw_values = [
            float(row["rating"])
            for row in ratee_ratings
            if row["rating"] is not None
        ]
        unexcluded_raters = {row["rater"] for row in ratee_ratings}

        defaults = {
            "num_raters": len(unexcluded_raters),
            "num_ratee_ratings": len(ratee_ratings),
            "ratee_raw_avg": statistics.mean(raw_values) if raw_values else None,
            "ratee_raw_stdev": statistics.stdev(raw_values) if len(raw_values) > 1 else None,
        }

        if cp is not None:
            calibrated = [
                cp.calibrate_rating(
                    name=row["rater_name"],
                    rating=float(row["rating"]),
                    clip_endpoints=(MIN_RATING, MAX_RATING),
                )
                for row in ratee_ratings
                if row["rating"] is not None
            ]
            defaults.update(
                {
                    "ratee_calibrated_avg": (
                        statistics.mean(calibrated) if calibrated else None
                    ),
                    "ratee_calibrated_stdev": (
                        statistics.stdev(calibrated) if len(calibrated) > 1 else None
                    ),
                    "ratee_improvement": improvement_rates.get(name),
                    "ratee_offset": person_offsets.get(name),
                }
            )

        params, _ = CalibrationParams.objects.update_or_create(
            ballkid_id=ballkid_id,
            year=year,
            defaults=defaults,
        )
        logger.info(
            f"[save_ratee_params] Saved params for {name} with params {params}"
        )
