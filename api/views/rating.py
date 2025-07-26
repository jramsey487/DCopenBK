from django.db.models import Value, Avg, F, StdDev
from django.db.models.functions import Concat
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response

from api.serializers import *
from api.permissions import *
from api.models.ballkid import *
from api.utils.utils import *
from api.utils.consts import *

from datetime import datetime
from rcal import calibrate_parameters
import networkx as nx
import statistics
import logging

logger = logging.getLogger("api.rating")


def get_min_dates(ratings):
    """
    For a queryset ratings, returns a dict mapping year to min_date in that year
    """
    years = set(ratings.values_list("date__year", flat=True))
    return {
        year: min([rating.date for rating in ratings.filter(date__year=year)])
        for year in years
    }


def queryset_to_rcal(ratings, bucket_size=DAYS_PER_BUCKET, returnAveraged=True):
    """
    Converts a Django queryset into the appropriate format for review calibration:
        Queryset of Rating objects => dict of (captain, ballkid, day) : rating

    Returns the averaged rcal dict format
    """
    logger.info(f"[queryset_to_rcal] ratings {ratings}")

    if len(ratings) == 0:
        logger.info(f"[queryset_to_rcal] empty ratings returning empty rcal dict")
        return {}

    rcal_dict = {}
    current_year = get_current_year()
    min_dates = get_min_dates(ratings)
    logger.info(f"[queryset_to_rcal] ratings {ratings} have min_dates {min_dates}")

    for rating in ratings:
        mapped_date = bucket_size * (
            (rating.date - min_dates[rating.date.year]).days // bucket_size
        )
        key = (
            rating.rater_name,
            (
                rating.ratee_name
                if rating.date.year == current_year
                else f"{rating.ratee_name}_{rating.date.year}"
            ),
            mapped_date,
        )
        rcal_dict.setdefault(key, []).append(float(rating.rating))

    logger.info(
        f"[queryset_to_rcal] return dict {rcal_dict} with averaging: {returnAveraged}"
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

    con = max(con, key=len, default=[])

    new_data = {(r, p, d): y for ((r, p, d), y) in data.items() if r in con}
    excluded = set(g.nodes).difference(con)

    logger.info(
        f"[remove_nonoverlapping_reviewers] data {new_data} after exclusion of reviewers {excluded}"
    )

    return new_data, excluded


def calibrate(ratings, year_ratings):
    tournament = Tournament.objects.get(year=get_current_year())
    ignore_outliers = tournament.rcal_ignore_outliers
    year_threshold = tournament.rcal_year_threshold
    bucket_size = tournament.rcal_bucket_size

    train_ratings = ratings.filter(date__year__gte=year_threshold)

    logger.info(
        f"[calibrate] starting calibration for {len(train_ratings)} ratings and {len(year_ratings)} year_ratings"
    )
    train = queryset_to_rcal(train_ratings, bucket_size, returnAveraged=True)
    test = queryset_to_rcal(year_ratings, bucket_size, returnAveraged=False)

    # test = queryset_to_rcal(year_ratings, rating_name, returnAveraged=False)
    # train = {key: sum(val) / len(val) for key, val in test.items()}

    train, excluded = remove_nonoverlapping_reviewers(train)

    # test is a subset of train. If a reviewer is in excluded,
    # then we should ignore them when rescaling parameters.
    # After rescaling parameters for the reviewers not in excluded,
    # we manually give the trivial parameters to the excluded reveiwers.
    test = {k: v for k, v in test.items() if k[0] not in excluded}

    try:
        cp = calibrate_parameters(train, rating_delta=(MAX_RATING - MIN_RATING))
        cp.rescale_parameters(
            test,
            (MIN_RATING, MAX_RATING),
            ignore_outliers=ignore_outliers,
        )
        cp.set_reviewer_scales({r: 1 for r in excluded})
        cp.set_reviewer_offsets({r: 0 for r in excluded})

    except Exception as e:
        return None, excluded, e

    logger.info(
        f"[calibrate] completed calibration excluding {excluded} with ignore_outliers {ignore_outliers}"
    )
    return cp, excluded, None


def save_rater_params(cp, year_ratings, year):
    """
    Save rater calibration parameters

    Arguments:
    cp: rcal cp object to represent calibration
    year_ratings: complete and auto-excluded ratings from this year (excludes manually
        excluded and draft ratings)
    autoexclude_threshold: threshold above which a rater's ratings should be excluded
    """
    raters = set(year_ratings.values_list("rater", "rater_name"))

    for rater_id, name in raters:
        # ballkid = Ballkid.objects.get(id=rater_id)
        # name = ballkid.get_name()

        # Update all non-calibration related parameters
        rater_ratings = year_ratings.filter(rater__id=rater_id)

        num_rater_ratings = rater_ratings.count()
        rater_raw_avg = rater_ratings.aggregate(val=Avg("rating"))["val"]
        rater_raw_stdev = rater_ratings.aggregate(val=StdDev("rating"))["val"]

        params, _ = CalibrationParams.objects.update_or_create(
            ballkid_id=rater_id,
            year=year,
            defaults={
                "num_rater_ratings": num_rater_ratings,
                "rater_raw_avg": rater_raw_avg,
                "rater_raw_stdev": rater_raw_stdev,
            },
        )
        logger.info(
            f"[save_rater_params_and_autoexclude] Saved non-calibration params for {name} with params {params}"
        )

        # Update all calibration-related parameters
        if cp is not None:
            # distance to ideal is 1/(4.5) int_{.5}^5 (ax + b - x)**2, where a is scale, b is offset
            a = cp.reviewer_scales().get(name)
            b = cp.reviewer_offsets().get(name)
            if a is None or b is None:
                distance = None
            else:
                distance = (1 / 4) * (
                    37 * a**2 + a * (22 * b - 74) + 4 * b**2 - 22 * b + 37
                )

            params, _ = CalibrationParams.objects.update_or_create(
                ballkid_id=rater_id,
                year=year,
                defaults={
                    "rater_scale": a,
                    "rater_offset": b,
                    "rater_distance_to_ideal": distance,
                },
            )
            logger.info(
                f"[save_rater_params_and_autoexclude] Saved calibration params for {name} with params {params}"
            )


def autoexclude(year_ratings, autoexclude_threshold):
    """
    Set ratings of raters with distance to ideal > threshold to be auto-exclude
    """

    # Exclude all raters whose distance to ideal is greater than threshold
    raters_to_autoexclude = CalibrationParams.objects.filter(
        rater_distance_to_ideal__gt=autoexclude_threshold
    ).values_list("ballkid", flat=True)

    # Auto-exclude ratings of raters with dist > threshold
    ratings_to_autoexclude = year_ratings.filter(rater__in=raters_to_autoexclude)
    num_updated = ratings_to_autoexclude.update(status=RATING_STATUS.AUTO_EXCLUDED)
    logger.info(
        f"[save_rater_params_and_autoexclude] Auto-excluded {len(ratings_to_autoexclude)} ratings, {num_updated} updated for raters: {raters_to_autoexclude}"
    )

    # Auto-include ratings of raters with dist < threshold
    ratings_to_include = year_ratings.exclude(rater__in=raters_to_autoexclude)
    num_updated = ratings_to_include.update(status=RATING_STATUS.COMPLETE)
    logger.info(
        f"[save_rater_params_and_autoexclude] Auto-included {len(ratings_to_include)} ratings, {num_updated} updated"
    )


def save_ratee_params():
    pass


def save_calibration_parameters(
    cp=None,
    calibrated=None,
    year=get_current_year(),
    distance_to_ideal_threshold=float("inf"),
):
    """
    Save calibration params as a CalibrationParams object.

    Arguments:
    cp: rcal cp object to represent calibration
    calibrated: Dict mapping (rating id, ratee name, rater name) to calibrated rating. Used
    for saving calibrated parameters
    """
    logger.info(f"[save_calibration_parameters] saving calibration params")

    # Filter to this year's ratings only, exclude manually excluded ratings
    year_ratings = Rating.objects.filter(date__year=year, status=RATING_STATUS.COMPLETE)

    # Filter to active ballkids only
    ballkids = Ballkid.objects.filter(is_active=True)

    # Set of raters with distance to ideal > threshold whose ratings should be excluded
    excluded_raters = set()

    # First, update the rater's metrics. Note that this NEEDS to go before ratee metrics
    # due to excluding raters' ratings with too high distance to ideal
    for ballkid in ballkids:
        name = ballkid.get_name()

        if cp is not None:
            # distance to ideal is 1/(4.5) int_{.5}^5 (ax + b - x)**2, where a is scale, b is offset
            a = cp.reviewer_scales().get(name)
            b = cp.reviewer_offsets().get(name)
            if a is None or b is None:
                distance = None
            else:
                distance = (1 / 4) * (
                    37 * a**2 + a * (22 * b - 74) + 4 * b**2 - 22 * b + 37
                )
            if distance and distance > distance_to_ideal_threshold:
                excluded_raters.add(name)

            params, _ = CalibrationParams.objects.update_or_create(
                ballkid=ballkid,
                year=year,
                defaults={
                    "ratee_improvement": cp.improvement_rates().get(name),
                    "ratee_offset": cp.person_offsets().get(name),
                    "rater_scale": a,
                    "rater_offset": b,
                    "rater_distance_to_ideal": distance,
                },
            )
            logger.info(
                f"[save_calibration_parameters] params for ballkid {ballkid} updated with rcal metrics: {params}"
            )

    # Update the ratee's metrics, including EXCLUDING excluded raters' ratings
    for ballkid in ballkids:
        name = ballkid.get_name()

        rater_ratings = year_ratings.filter(rater=ballkid)
        ratee_ratings = year_ratings.filter(ratee=ballkid)

        # num_ratee_ratings = ratee_ratings.count()
        # num_raters = ratee_ratings.values_list("rater").distinct().count()
        num_rater_ratings = rater_ratings.count()
        ratee_raw_avg = ratee_ratings.aggregate(val=Avg("rating"))["val"]
        ratee_raw_stdev = ratee_ratings.aggregate(val=StdDev("rating"))["val"]
        rater_raw_avg = rater_ratings.aggregate(val=Avg("rating"))["val"]
        rater_raw_stdev = rater_ratings.aggregate(val=StdDev("rating"))["val"]

        # Update all non-calibration related parameters
        params, _ = CalibrationParams.objects.update_or_create(
            ballkid=ballkid,
            year=year,
            defaults={
                # "num_ratee_ratings": num_ratee_ratings,
                # "num_raters": num_raters,
                "num_rater_ratings": num_rater_ratings,
                "ratee_raw_avg": ratee_raw_avg,
                "ratee_raw_stdev": ratee_raw_stdev,
                "rater_raw_avg": rater_raw_avg,
                "rater_raw_stdev": rater_raw_stdev,
            },
        )
        logger.info(
            f"[save_calibration_parameters] params for ballkid {ballkid} updated with raw metrics: {params}"
        )

        if calibrated:
            ratee_calibrated = {
                key: val
                for key, val in calibrated.items()
                if key[1] == name and key[2] not in excluded_raters
            }

            calibrated_avg = (
                statistics.mean(ratee_calibrated.values())
                if len(ratee_calibrated.values()) > 0
                else None
            )
            calibrated_stdev = (
                statistics.stdev(ratee_calibrated.values())
                if len(ratee_calibrated.values()) > 1
                else None
            )
            raters = set([key[2] for key in ratee_calibrated.keys()])

            params, _ = CalibrationParams.objects.update_or_create(
                ballkid=ballkid,
                year=year,
                defaults={
                    "ratee_calibrated_avg": calibrated_avg,
                    "ratee_calibrated_stdev": calibrated_stdev,
                    "num_raters": len(raters),
                    "num_ratee_ratings": len(ratee_calibrated.values()),
                },
            )
            logger.info(
                f"[save_calibration_parameters] params for ballkid {ballkid} updated with calibrated metrics: {params}"
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
            .filter(
                Q(status=RATING_STATUS.COMPLETE)
                | Q(status=RATING_STATUS.EXCLUDED)
                | Q(status=RATING_STATUS.AUTO_EXCLUDED)
            )
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
            .filter(
                Q(status=RATING_STATUS.COMPLETE)
                | Q(status=RATING_STATUS.EXCLUDED)
                | Q(status=RATING_STATUS.AUTO_EXCLUDED)
            )
            .annotate(
                ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
                rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
                year=F("date__year"),
                month=F("date__month"),
                day=F("date__day"),
            )
            .order_by("-date", "ratee__last_name", "ratee__first_name")
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
            rater_id = serializer.data["rater"]
            ratee_id = serializer.data["ratee"]
            rating = Rating.objects.create(
                created_at=datetime.now(),
                rater_id=rater_id,
                ratee_id=ratee_id,
                date=serializer.data["date"],
                rating=serializer.data["rating"],
                athleticism_rating=serializer.data["athleticism_rating"],
                rolling_rating=serializer.data["rolling_rating"],
                awareness_rating=serializer.data["awareness_rating"],
                decision_rating=serializer.data["decision_rating"],
                effort_rating=serializer.data["effort_rating"],
                comments=serializer.data["comments"],
            )
            logger.info(f"[CreateRating] Created rating {rating}")

            draft_rating = Rating.objects.filter(
                status=RATING_STATUS.DRAFT,
                rater_id=rater_id,
                ratee_id=ratee_id,
                date__year=get_current_year(),
            ).first()
            if draft_rating:
                draft_rating.delete()
                logger.info(f"[CreateRating] Deleing draft rating {draft_rating}")

            return Response(RatingSerializer(rating).data)

        logger.warning(
            f"[CreateRating] Error creating rating with serializer errors {serializer.errors}"
        )
        return Response(
            {"Invalid serializer": f"Errors: {serializer.errors}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class SaveDraftRating(APIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairpersonOrCaptain]

    def patch(self, request, format=None):
        rater_id = request.data["rater"]
        ratee_id = request.data["ratee"]
        date = datetime.strptime(request.data["date"], SLASH_MONTH_DAY_YEAR_FORMAT_STR)

        rating = Rating.objects.update_or_create(
            date__year=get_current_year(),
            status=RATING_STATUS.DRAFT,
            rater_id=rater_id,
            ratee_id=ratee_id,
            defaults={
                "created_at": datetime.now(),
                "date": datetime.strftime(date, HYPHEN_YEAR_MONTH_DAY_FORMAT_STR),
                "rating": request.data["rating"],
                "athleticism_rating": request.data["athleticism_rating"],
                "rolling_rating": request.data["rolling_rating"],
                "awareness_rating": request.data["awareness_rating"],
                "decision_rating": request.data["decision_rating"],
                "effort_rating": request.data["effort_rating"],
                "comments": request.data["comments"],
            },
        )

        logger.info(f"[SaveDraftRating] Saving draft rating {rating}")
        return Response(
            {"Success": f"Saved draft rating {rating}"}, status=status.HTTP_200_OK
        )


class CalibratedRatings(APIView):
    permission_classes = [IsChairperson]

    def get(self, request, year):
        tournament = Tournament.objects.get(year=year)
        cp, excluded, failed_categories = None, set(), None

        ## STEP 1: Get all ratings and annotate
        ratings = (
            Rating.objects.filter(
                Q(status=RATING_STATUS.COMPLETE) | Q(status=RATING_STATUS.AUTO_EXCLUDED)
            )
            .annotate(
                ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
                rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
            )
            .order_by(
                "ratee__last_name",
                "ratee__first_name",
                "-date",
                "rater__last_name",
                "rater__first_name",
            )
        )
        year_ratings = ratings.filter(date__year=year)
        year_ratings_excluded = year_ratings.filter(status=RATING_STATUS.COMPLETE)

        logger.info(
            f"[CalibratedRatings] Starting rating calibration for {len(ratings)} ratings"
        )

        ## STEP 2: Train on all ratings with year > year_threshold and calibrate for year_ratings
        (cp, excluded, failed_categories) = calibrate(ratings, year_ratings)

        logger.warning(
            f"[CalibratedRatings] rating categories with failed rating categories {failed_categories}"
        )

        ## STEP 3: Save rater params
        save_rater_params(cp, year_ratings, year)

        ## STEP 4: Auto-exclude ratings
        autoexclude(year_ratings, tournament.rcal_calibration_threshold)

        ## STEP 5: Save ratee params
        save_ratee_params()

        # Calibrate each rating to put together a list of calibrated ratings to return
        postprocessed = [
            {
                "id": rating.id,
                "rater": rating.rater,
                "ratee": rating.ratee,
                "date": rating.date,
                "rating": get_postprocessed_rating(
                    cp, rating.rating, rating.rater_name
                ),
                "athleticism_rating": rating.athleticism_rating,
                "rolling_rating": rating.rolling_rating,
                "awareness_rating": rating.awareness_rating,
                "decision_rating": rating.decision_rating,
                "effort_rating": rating.effort_rating,
                "comments": rating.comments,
                # Annotated values
                "rater_name": rating.rater_name,
                "ratee_name": rating.ratee_name,
                "year": rating.date.year,
                "month": rating.date.month,
                "day": rating.date.day,
            }
            for rating in year_ratings
        ]

        # Chain multiple sorts to allow for one of them to be reversed but not the rest.
        # When chaining multiple sorts, first sort is the least priority sort and last
        # sort is the highest priority sort.
        # postprocessed = sorted(
        #     postprocessed,
        #     key=lambda k: (
        #         k["rater_name"].split(" ")[1],
        #         k["rater_name"].split(" ")[0],
        #     ),
        # )
        # postprocessed = sorted(postprocessed, key=lambda k: k["date"], reverse=True)
        # postprocessed = sorted(
        #     postprocessed,
        #     key=lambda k: (
        #         k["ratee_name"].split(" ")[-1],
        #         k["ratee_name"].split(" ")[0],
        #     ),
        # )

        # If an rcal warning was thrown for the overall rating category
        if failed_categories is not None:
            logger.warning(
                f"[CalibratedRatings] overall rating category threw an rcal error"
            )
            s = status.HTTP_203_NON_AUTHORITATIVE_INFORMATION

        # If a non-zero number of reviewers had no overlap in the overall rating category
        elif len(excluded) > 0:
            logger.warning(
                f"[CalibratedRatings] overall rating category had excluded reviewers {excluded['overall']}"
            )
            s = status.HTTP_206_PARTIAL_CONTENT

        else:
            s = status.HTTP_200_OK

        logger.info(
            f"[CalibratedRatings] post-processed calibrated ratings {postprocessed} "
        )
        return Response(RatingSerializer(postprocessed, many=True).data, status=s)


class GetCalibrationParamsBallkid(generics.RetrieveAPIView):
    permission_classes = [IsChairpersonOrSelf]
    serializer_class = CalibrationParamsSerializer

    def get_object(self):
        pk = self.kwargs["pk"]
        params, created = CalibrationParams.objects.get_or_create(
            ballkid_id=pk, year=get_current_year()
        )
        logger.info(
            f"[GetCalibrationParamsBallkid] params {params} for ballkid_id {pk}"
        )
        return params


class GetCalibrationParams(generics.ListAPIView):
    permission_classes = [IsChairperson]
    serializer_class = CalibrationParamsSerializer

    def get_queryset(self):
        params = (
            CalibrationParams.objects.filter(year=get_current_year())
            .filter(Q(ballkid__is_captain=True) | Q(ballkid__is_chairperson=True))
            .exclude(rater_offset__isnull=True, rater_scale__isnull=True)
            .annotate(
                name=Concat("ballkid__first_name", Value(" "), "ballkid__last_name"),
            )
            .order_by("ballkid__last_name", "ballkid__first_name")
        )

        logger.info(f"[GetCalibrationParams] params {params} ")
        return params


class GetAverageCalibrationParams(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        avgs = CalibrationParams.objects.filter(
            year=get_current_year(),
            ballkid__is_active=True,
            rater_scale__lt=100,
            rater_offset__lt=100,
            rater_offset__gt=-100,
        ).aggregate(Avg("rater_offset"), Avg("rater_scale"))
        logger.info(f"[GetAverageCalibrationParams] avg {avgs}")
        return Response(avgs)


class ExcludeRating(APIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairperson]

    def patch(self, request, pk, format=None):
        rating = Rating.objects.get(pk=pk)
        # If currently excluded, not un-exclude
        if rating.status == RATING_STATUS.EXCLUDED:
            rating.status = RATING_STATUS.COMPLETE

        # If currently including, then exclude
        elif rating.status == RATING_STATUS.COMPLETE:
            rating.status = RATING_STATUS.EXCLUDED

        rating.save()

        logger.info(f"[ExcludeRating] excluding rating {rating}")
        return Response({"Success": f"Excluded rating"}, status=status.HTTP_200_OK)


class GetDraftRating(generics.RetrieveAPIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairpersonOrCaptain]

    def get_object(self):
        me = self.kwargs.get("pk")
        ballkid_id = self.kwargs.get("ballkid")

        queryset = Rating.objects.filter(
            rater__id=me,
            ratee__id=ballkid_id,
            date__year=get_current_year(),
            status=RATING_STATUS.DRAFT,
        ).first()
        return queryset


class DeleteRating(APIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairperson]

    def patch(self, request, pk, format=None):
        rating = Rating.objects.get(pk=pk)
        rating.status = RATING_STATUS.DELETED
        rating.save()
        logger.info(f"[DeleteRating] deleting rating {rating}")
        # rating.delete()

        return Response(status=status.HTTP_200_OK)
