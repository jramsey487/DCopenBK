from django.db.models import Value, Avg, F
from django.db.models.functions import Concat
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response

from api.serializers import *
from api.permissions import *
from api.models.ballkid import *
from api.utils import *
from api.consts import *

from datetime import datetime
from rcal import RcalWarning, calibrate_parameters
import networkx as nx
import warnings
import statistics
import logging

logger = logging.getLogger("api.rating")


def queryset_to_rcal(data, min_date, rating_name="overall", returnAveraged=True):
    """
    Converts a Django queryset into the appropriate format for review calibration:
        Queryset of Rating objects => dict of (captain, ballkid, day) : rating

    Returns the minimum date and the averaged rcal dict format

    NOTE THAT RATINGS OF 0 ARE CONSIDERED EMPTY AND ARE NOT INCLUDED
    """

    logger.info(
        f"{datetime.now()} [queryset_to_rcal] data {data} with min_date {min_date} and rating_name {rating_name}"
    )

    # Number of days per date bucketing for calibration. A larger number results in
    # more likely to succeed (but theoretically less accurate) calibration
    days_per_bucket = 4

    rcal_dict = {}
    for rating in data:
        mapped_date = days_per_bucket * ((rating.date - min_date).days // days_per_bucket)
        key = (
            rating.rater.get_name(),
            rating.ratee.get_name()
            if rating.date.year == get_current_year()
            else f"{rating.ratee.get_name()}{rating.date.year}",
            mapped_date,
        )

        if rating_name == "overall":
            rating_val = rating.rating
        elif rating_name == "athleticism":
            rating_val = rating.athleticism_rating
        elif rating_name == "rolling":
            rating_val = rating.rolling_rating
        elif rating_name == "awareness":
            rating_val = rating.awareness_rating
        elif rating_name == "decision":
            rating_val = rating.decision_rating
        elif rating_name == "effort":
            rating_val = rating.effort_rating
        else:
            raise Exception(f"Unrecognized rating name {rating_name}")

        if rating_val:
            rcal_dict.setdefault(key, []).append(float(rating_val))

    logger.info(
        f"{datetime.now()} [queryset_to_rcal] return dict {rcal_dict} with averaging: {returnAveraged}"
    )

    if not returnAveraged:
        return rcal_dict

    return {key: sum(val) / len(val) for key, val in rcal_dict.items()}


def remove_nonoverlapping_reviewers(data):
    """
    Takes in review data. Outputs (new_data, excluded). new_data is the data
    that results in the largest connected graph of reviewers. excluded is the
    set of reviewers removed from the data in order to make new_data connected.
    """
    graph = {}
    for r, p, d in data:
        graph.setdefault(p, set()).add(r)

    g = nx.Graph()
    for v in graph.values():
        for i in v:
            for j in v:
                g.add_edge(i, j)

    # get largest connected component
    con = nx.connected_components(g)
    if not con:
        return {}, {r for (r, p, d) in data}

    con = max(con, key=len)

    new_data = {(r, p, d): y for ((r, p, d), y) in data.items() if r in con}
    excluded = set(g.nodes).difference(con)

    logger.info(
        f"{datetime.now()} [remove_nonoverlapping_reviewers] data {new_data} after exclusion of reviewers {excluded}"
    )

    return new_data, excluded


def calibrate(ratings, rating_name="overall", min_rating=0.5, max_rating=5, stdev=2):
    logger.info(
        f"{datetime.now()} [calibrate] starting calibration for {len(ratings)} ratings and rating_name {rating_name}. First 10: {ratings[:10]}"
    )

    min_date = min([rating.date for rating in ratings])

    train = queryset_to_rcal(ratings, min_date, rating_name, returnAveraged=True)
    test = queryset_to_rcal(ratings, min_date, rating_name, returnAveraged=False)

    train, excluded = remove_nonoverlapping_reviewers(train)
    test, _ = remove_nonoverlapping_reviewers(test)

    cp = calibrate_parameters(train, rating_delta=(max_rating - min_rating))
    cp.rescale_parameters(test, (min_rating, max_rating), ignore_outliers=stdev)

    cp.set_reviewer_offsets({r: 0 for r in excluded})
    cp.set_reviewer_scales({r: 1 for r in excluded})

    logger.info(
        f"{datetime.now()} [calibrate] completed calibration excluding {excluded}"
    )

    return cp, excluded


def save_calibration_parameters(cp, calibrated=None):
    """
    Save calibration params as a CalibrationParams object.

    Arguments:
    cp: rcal cp object to represent calibration
    calibrated: Dict mapping (rating id, ratee name) to calibrated rating. Used
    for saving calibrated parameters
    """
    logger.info(
        f"{datetime.now()} [save_calibration_parameters] saving calibration params"
    )

    if cp is None:
        logger.info(
            f"{datetime.now()} [save_calibration_parameters] cp object is None, returning early without saving"
        )
        return

    current_year = get_current_year()

    improvements = cp.improvement_rates()
    ballkid_offsets = cp.person_offsets()
    scales = cp.reviewer_scales()
    offsets = cp.reviewer_offsets()

    keys = improvements.keys() | scales.keys()
    for name in keys:
        improvement = improvements.get(name)
        ballkid_offset = ballkid_offsets.get(name)
        scale = scales.get(name)
        offset = offsets.get(name)

        try:
            ballkid = Ballkid.objects.get(
                first_name=get_first_name(name), last_name=get_last_name(name)
            )
        except ObjectDoesNotExist:
            logger.warning(
                f"{datetime.now()} [save_calibration_params] Could not find ballkid {name}"
            )
            continue

        num_ratee_ratings = Rating.objects.filter(
            ratee=ballkid, date__year=current_year
        ).count()
        num_rater_ratings = Rating.objects.filter(
            rater=ballkid, date__year=current_year
        ).count()
        num_raters = (
            Rating.objects.filter(ratee=ballkid, date__year=current_year)
            .values_list("rater")
            .distinct()
            .count()
        )

        default_vals = {
            "ratee_improvement": improvement,
            "ratee_offset": ballkid_offset,
            "rater_scale": scale,
            "rater_offset": offset,
            "num_ratee_ratings": num_ratee_ratings,
            "num_rater_ratings": num_rater_ratings,
            "num_raters": num_raters,
        }

        if calibrated:
            ratee_calibrated = [val for key, val in calibrated.items() if key[1] == name]
            calibrated_avg = (
                statistics.mean(ratee_calibrated) if len(ratee_calibrated) > 0 else None
            )
            calibrated_stdev = (
                statistics.stdev(ratee_calibrated) if len(ratee_calibrated) > 1 else None
            )

            cp, created = CalibrationParams.objects.update_or_create(
                ballkid=ballkid,
                defaults={
                    **default_vals,
                    "ratee_calibrated_avg": calibrated_avg,
                    "ratee_calibrated_stdev": calibrated_stdev,
                },
            )
            logger.info(
                f"{datetime.now()} [save_calibration_params] Created {created} calibration params object for ballkid {ballkid} with defaults {default_vals}, ratee calibrated avg {calibrated_avg} ratee calibrated stdev {calibrated_stdev}"
            )

        else:
            cp, created = CalibrationParams.objects.update_or_create(
                ballkid=ballkid, defaults=default_vals
            )
            logger.info(
                f"{datetime.now()} [save_calibration_params] Created {created} calibration params object for ballkid {ballkid} with defaults {default_vals}"
            )

        cp.save()


def get_postprocessed_rating(cp, rating, name):
    if rating is None:
        return None

    if cp is None:
        return float(rating)

    return cp.calibrate_rating(
        name, float(rating), clip_endpoints=(MIN_RATING, MAX_RATING)
    )


class RatingsList(generics.ListAPIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        current_year = self.kwargs.get("year")

        return (
            Rating.objects.filter(date__year=current_year)
            .annotate(
                ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
                rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
                year=F("date__year"),
                month=F("date__month"),
                day=F("date__day"),
            )
            .order_by(
                "ratee__last_name",
                "ratee__first_name",
                "-date",
                "rater__last_name",
                "rater__first_name",
            )
        )


class MyRatings(generics.ListAPIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairpersonOrCaptain]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        current_year = get_current_year()

        return (
            Rating.objects.filter(rater_id=pk, date__year=current_year)
            .annotate(
                ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
                rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
                year=F("date__year"),
                month=F("date__month"),
                day=F("date__day"),
            )
            .order_by("ratee__last_name", "ratee__first_name", "-date")
        )


class CreateRating(APIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairpersonOrCaptain]

    def post(self, request, format=None):
        data = {key: val for key, val in request.data.items() if key != "date"}
        date = datetime.strptime(request.data["date"], SLASH_MONTH_DAY_YEAR_FORMAT_STR)
        data["date"] = datetime.strftime(date, HYPHEN_YEAR_MONTH_DAY_FORMAT_STR)

        serializer = self.serializer_class(data=data)

        if serializer.is_valid():
            rating = Rating.objects.create(
                rater=Ballkid.objects.get(id=serializer.data["rater"]),
                ratee=Ballkid.objects.get(id=serializer.data["ratee"]),
                date=serializer.data["date"],
                rating=serializer.data["rating"],
                athleticism_rating=serializer.data["athleticism_rating"],
                rolling_rating=serializer.data["rolling_rating"],
                awareness_rating=serializer.data["awareness_rating"],
                decision_rating=serializer.data["decision_rating"],
                effort_rating=serializer.data["effort_rating"],
                comments=serializer.data["comments"],
            )

            logger.info(f"{datetime.now()} [CreateRating] Created rating {rating}")

            # Update calibration parameters
            cp, _ = calibrate(Rating.objects.all())
            save_calibration_parameters(cp)

            return Response(RatingSerializer(rating).data)

        logger.warn(
            f"{datetime.now()} [CreateRating] Error creating rating with serializer errors {serializer.errors}"
        )
        return Response(
            {"Invalid serializer": f"Errors: {serializer.errors}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class CalibratedRatings(APIView):
    permission_classes = [IsChairperson]

    def get(self, request, year):
        cp_dict, excluded = {}, {}
        ratings = Rating.objects.all()

        logger.info(
            f"{datetime.now()} [CalibratedRatings] Starting rating calibration for {len(ratings)} ratings"
        )

        # See which rating categories throw Rcal warnings
        all_warnings = set()
        for rating_name in RATING_CATEGORIES:
            with warnings.catch_warnings(record=True) as caught_warnings:
                cp_dict[rating_name], excluded[rating_name] = calibrate(
                    ratings, rating_name, min_rating=MIN_RATING, max_rating=MAX_RATING
                )
            if any((x.category == RcalWarning for x in caught_warnings)):
                all_warnings.add(rating_name)

                # If rcal warning was thrown for rating_name, then clear out cp_dict
                # for that rating name and just return the untransformed rating for
                # the rating category
                cp_dict[rating_name] = None

        logger.warn(
            f"{datetime.now()} [CalibratedRatings] rating categories with warnings {all_warnings}"
        )

        # Get dict of all calibrated overall ratings for saving calibration params
        calibrated = {
            (rating.id, rating.ratee.get_name()): get_postprocessed_rating(
                cp_dict["overall"],
                rating.rating,
                rating.rater.get_name(),
            )
            for rating in ratings
        }
        logger.info(
            f"{datetime.now()} [CalibratedRatings] completed calibration for {len(calibrated)} ratings"
        )

        # Save calibration parameters for overall ratings only
        save_calibration_parameters(cp_dict["overall"], calibrated)

        # Calibrate each rating to put together a list of calibrated ratings
        # to return
        postprocessed = [
            {
                "id": rating.id,
                "rater": rating.rater,
                "ratee": rating.ratee,
                "date": rating.date,
                "rating": calibrated[(rating.id, rating.ratee.get_name())],
                "athleticism_rating": get_postprocessed_rating(
                    cp_dict["athleticism"],
                    rating.athleticism_rating,
                    rating.rater.get_name(),
                ),
                "rolling_rating": get_postprocessed_rating(
                    cp_dict["rolling"],
                    rating.rolling_rating,
                    rating.rater.get_name(),
                ),
                "awareness_rating": get_postprocessed_rating(
                    cp_dict["awareness"],
                    rating.awareness_rating,
                    rating.rater.get_name(),
                ),
                "decision_rating": get_postprocessed_rating(
                    cp_dict["decision"],
                    rating.decision_rating,
                    rating.rater.get_name(),
                ),
                "effort_rating": get_postprocessed_rating(
                    cp_dict["effort"],
                    rating.effort_rating,
                    rating.rater.get_name(),
                ),
                "comments": rating.comments,
                # Annotated values
                "rater_name": rating.rater.get_name(),
                "ratee_name": rating.ratee.get_name(),
                "year": rating.date.year,
                "month": rating.date.month,
                "day": rating.date.day,
            }
            for rating in ratings
            if rating.date.year == year
        ]

        # Chain multiple sorts to allow for one of them to be reversed but not the rest.
        # When chaining multiple sorts, first sort is the least priority sort and last
        # sort is the highest priority sort.
        postprocessed = sorted(
            postprocessed,
            key=lambda k: (
                k["rater_name"].split(" ")[1],
                k["rater_name"].split(" ")[0],
            ),
        )
        postprocessed = sorted(postprocessed, key=lambda k: k["date"], reverse=True)
        postprocessed = sorted(
            postprocessed,
            key=lambda k: (
                k["ratee_name"].split(" ")[1],
                k["ratee_name"].split(" ")[0],
            ),
        )

        # If an rcal warning was thrown for the overall rating category
        if "overall" in all_warnings:
            logger.warn(
                f"{datetime.now()} [CalibratedRatings] overall rating category threw an rcal warning"
            )
            s = status.HTTP_203_NON_AUTHORITATIVE_INFORMATION

        # If a non-zero number of reviewers had no overlap in the overall rating category
        elif excluded["overall"]:
            logger.warn(
                f"{datetime.now()} [CalibratedRatings] overall rating category had excluded reviewers {excluded['overall']}"
            )
            s = status.HTTP_206_PARTIAL_CONTENT

        else:
            s = status.HTTP_200_OK

        logger.info(
            f"{datetime.now()} [CalibratedRatings] post-processed calibrated ratings {postprocessed} "
        )
        print(all_warnings, s)
        return Response(RatingSerializer(postprocessed, many=True).data, status=s)


class GetCalibrationParams(generics.RetrieveAPIView):
    permission_classes = [IsChairperson]
    serializer_class = CalibrationParamsSerializer

    def get_object(self):
        pk = self.kwargs["pk"]
        params, created = CalibrationParams.objects.get_or_create(ballkid_id=pk)
        logger.info(
            f"{datetime.now()} [GetCalibrationParams] params {params} for ballkid_id {pk}"
        )
        return params


class GetAverageCalibrationParams(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        avg_offset = CalibrationParams.objects.aggregate(
            Avg("rater_offset"), Avg("rater_scale")
        )
        logger.info(f"{datetime.now()} [GetAverageCalibrationParams] avg {avg_offset}")
        return Response(avg_offset)


class DeleteRating(APIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairperson]

    def delete(self, request, pk, format=None):
        rating = Rating.objects.get(pk=pk)
        logger.info(f"{datetime.now()} [DeleteRating] deleting rating {rating}")
        rating.delete()
        return Response(status=status.HTTP_200_OK)
