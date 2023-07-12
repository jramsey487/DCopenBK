from django.db.models import Value, Avg, F, StdDev
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
from rcal import calibrate_parameters

from rcal import RcalException, calibrate_parameters
import networkx as nx
import statistics
import logging

logger = logging.getLogger("api.rating")


def get_min_dates(ratings):
    """
    For a queryset ratings, returns a dict mapping year to min_date in that year
    """
    years = ratings.values_list("date__year", flat=True).distinct()
    return {
        year: min([rating.date for rating in ratings.filter(date__year=year)])
        for year in years
    }


def queryset_to_rcal(ratings, rating_name="overall", returnAveraged=True):
    """
    Converts a Django queryset into the appropriate format for review calibration:
        Queryset of Rating objects => dict of (captain, ballkid, day) : rating

    Returns the minimum date and the averaged rcal dict format

    NOTE THAT RATINGS OF 0 ARE CONSIDERED EMPTY AND ARE NOT INCLUDED
    """
    logger.info(
        f"{datetime.now()} [queryset_to_rcal] ratings {ratings} with rating_name {rating_name}"
    )

    if len(ratings) == 0:
        logger.info(
            f"{datetime.now()} [queryset_to_rcal] empty ratings returning empty rcal dict"
        )
        return {}

    rcal_dict = {}
    min_dates = get_min_dates(ratings)
    logger.info(
        f"{datetime.now()} [queryset_to_rcal] ratings {ratings} have min_dates {min_dates}"
    )

    for rating in ratings:
        mapped_date = DAYS_PER_BUCKET * (
            (rating.date - min_dates[rating.date.year]).days // DAYS_PER_BUCKET
        )

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


def calibrate(ratings, rating_name="overall", year=get_current_year()):
    logger.info(
        f"{datetime.now()} [calibrate] starting calibration for {len(ratings)} ratings and rating_name {rating_name}. First 10: {ratings[:10]}"
    )
    year_ratings = ratings.filter(date__year=year)

    train = queryset_to_rcal(ratings, rating_name, returnAveraged=True)
    test = queryset_to_rcal(year_ratings, rating_name, returnAveraged=False)

    train, excluded = remove_nonoverlapping_reviewers(train)

    # test is a subset of train. If a reviewer is in excluded,
    # then we should ignore them when rescaling parameters.
    # After rescaling parameters for the reviewers not in excluded,
    # we manually give the trivial parameters to the excluded reveiwers.
    test = {k: v for k, v in test.items() if k[0] not in excluded}

    try:
        cp = calibrate_parameters(train, rating_delta=(MAX_RATING - MIN_RATING))
        cp.rescale_parameters(
            test, (MIN_RATING, MAX_RATING), ignore_outliers=CALIBRATE_STDEV
        )
        cp.set_reviewer_scales({r: 1 for r in excluded})
        cp.set_reviewer_offsets({r: 0 for r in excluded})

    except RcalException as e:
        return None, excluded, e

    logger.info(
        f"{datetime.now()} [calibrate] completed calibration excluding {excluded}"
    )
    return cp, excluded, None


def save_calibration_parameters(cp, calibrated=None, year=get_current_year()):
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

    # Update all non-calibration related parameters
    year_ratings = Rating.objects.filter(date__year=year)

    raters = year_ratings.values_list("rater", flat=True).distinct()
    ratees = year_ratings.values_list("ratee", flat=True).distinct()
    keys = raters.union(ratees)

    logger.info(
        f"{datetime.now()} [save_calibration_parameters] union of raters {raters} and ratees {ratees}: {keys}"
    )

    for ballkid_id in keys:
        try:
            ballkid = Ballkid.objects.get(id=ballkid_id)
            name = ballkid.get_name()
        except ObjectDoesNotExist:
            logger.warning(
                f"{datetime.now()} [save_calibration_params] Could not find ballkid {name}"
            )
            continue

        ratee_ratings = year_ratings.filter(ratee=ballkid)
        rater_ratings = year_ratings.filter(rater=ballkid)

        num_ratee_ratings = ratee_ratings.filter(date__year=year).count()
        num_rater_ratings = rater_ratings.filter(date__year=year).count()
        num_raters = (
            ratee_ratings.filter(date__year=year).values_list("rater").distinct().count()
        )
        ratee_raw_avg = ratee_ratings.aggregate(val=Avg("rating"))["val"]
        ratee_raw_stdev = ratee_ratings.aggregate(val=StdDev("rating"))["val"]
        rater_raw_avg = rater_ratings.aggregate(val=Avg("rating"))["val"]
        rater_raw_stdev = rater_ratings.aggregate(val=StdDev("rating"))["val"]

        params, _ = CalibrationParams.objects.update_or_create(
            ballkid=ballkid,
            defaults={
                "num_ratee_ratings": num_ratee_ratings,
                "num_rater_ratings": num_rater_ratings,
                "num_raters": num_raters,
                "ratee_raw_avg": ratee_raw_avg,
                "ratee_raw_stdev": ratee_raw_stdev,
                "rater_raw_avg": rater_raw_avg,
                "rater_raw_stdev": rater_raw_stdev,
            },
        )
        logger.info(
            f"{datetime.now()} [save_calibration_parameters] params for ballkid {ballkid} updated with raw metrics: {params}"
        )

        if calibrated:
            ratee_calibrated = [val for key, val in calibrated.items() if key[1] == name]
            calibrated_avg = (
                statistics.mean(ratee_calibrated) if len(ratee_calibrated) > 0 else None
            )
            calibrated_stdev = (
                statistics.stdev(ratee_calibrated) if len(ratee_calibrated) > 1 else None
            )

            params, _ = CalibrationParams.objects.update_or_create(
                ballkid=ballkid,
                defaults={
                    "ratee_calibrated_avg": calibrated_avg,
                    "ratee_calibrated_stdev": calibrated_stdev,
                },
            )
            logger.info(
                f"{datetime.now()} [save_calibration_parameters] params for ballkid {ballkid} updated with calibrated metrics: {params}"
            )

        if cp is not None:
            params, _ = CalibrationParams.objects.update_or_create(
                ballkid=ballkid,
                defaults={
                    "ratee_improvement": cp.improvement_rates().get(name),
                    "ratee_offset": cp.person_offsets().get(name),
                    "rater_scale": cp.reviewer_scales().get(name),
                    "rater_offset": cp.reviewer_offsets().get(name),
                },
            )
            logger.info(
                f"{datetime.now()} [save_calibration_parameters] params for ballkid {ballkid} updated with rcal metrics: {params}"
            )


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
        year = self.kwargs.get("year")

        return (
            Rating.objects.filter(date__year=year)
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
        year = get_current_year()

        return (
            Rating.objects.filter(rater_id=pk, date__year=year)
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
            cp, _, _ = calibrate(Rating.objects.all())
            save_calibration_parameters(cp)

            return Response(RatingSerializer(rating).data)

        logger.warning(
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
        year_ratings = ratings.filter(date__year=year)

        logger.info(
            f"{datetime.now()} [CalibratedRatings] Starting rating calibration for {len(ratings)} ratings"
        )

        # Keep track of which rating categories throw Rcal exceptions
        failed_categories = {}

        # Try calibration for all rating categories
        for rating_name in RATING_CATEGORIES:
            (
                cp_dict[rating_name],
                excluded[rating_name],
                failed_categories[rating_name],
            ) = calibrate(ratings, rating_name, year=year)

        logger.warning(
            f"{datetime.now()} [CalibratedRatings] rating categories with failed rating categories {failed_categories}"
        )

        # Get dict of all calibrated overall ratings for saving calibration params
        calibrated = {
            (rating.id, rating.ratee.get_name()): get_postprocessed_rating(
                cp_dict["overall"],
                rating.rating,
                rating.rater.get_name(),
            )
            for rating in year_ratings
        }
        logger.info(
            f"{datetime.now()} [CalibratedRatings] completed calibration for {len(calibrated)} ratings"
        )

        # Save calibration parameters for overall ratings only
        save_calibration_parameters(cp_dict["overall"], calibrated, year)

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
            for rating in year_ratings
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
        if "overall" in failed_categories and failed_categories["overall"] is not None:
            logger.warning(
                f"{datetime.now()} [CalibratedRatings] overall rating category threw an rcal warning"
            )
            s = status.HTTP_203_NON_AUTHORITATIVE_INFORMATION

        # If a non-zero number of reviewers had no overlap in the overall rating category
        elif excluded["overall"]:
            logger.warning(
                f"{datetime.now()} [CalibratedRatings] overall rating category had excluded reviewers {excluded['overall']}"
            )
            s = status.HTTP_206_PARTIAL_CONTENT

        else:
            s = status.HTTP_200_OK

        logger.info(
            f"{datetime.now()} [CalibratedRatings] post-processed calibrated ratings {postprocessed} "
        )
        return Response(RatingSerializer(postprocessed, many=True).data, status=s)


class GetCalibrationParams(generics.RetrieveAPIView):
    permission_classes = [IsChairpersonOrSelf]
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
        avgs = CalibrationParams.objects.aggregate(
            Avg("rater_offset"), Avg("rater_scale")
        )
        logger.info(f"{datetime.now()} [GetAverageCalibrationParams] avg {avgs}")
        return Response(avgs)


class DeleteRating(APIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairperson]

    def delete(self, request, pk, format=None):
        rating = Rating.objects.get(pk=pk)
        logger.info(f"{datetime.now()} [DeleteRating] deleting rating {rating}")
        rating.delete()

        # Update calibration parameters
        cp, _, _ = calibrate(Rating.objects.all())
        save_calibration_parameters(cp)

        return Response(status=status.HTTP_200_OK)
