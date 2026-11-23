from django.db.models import Q, Value, Avg, F
from django.db.models.functions import Concat
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response

from api.serializers import *
from api.permissions import *
from api.models.ballkid import *
from api.utils.utils import *
from api.utils.consts import *

# Query-optimized implementations of the calibration bookkeeping. These used to
# be defined here too and swapped in from ApiConfig.ready(); importing them
# directly means there is only one copy of each function to maintain.
# (ApiConfig.ready() still assigns them onto this module, which is now a no-op
# and can be deleted.)
from api.utils.rating_calibration_optimized import (
    get_min_dates,
    save_rater_params,
    save_ratee_params,
)

from datetime import datetime
from api.calibration import calibrate_parameters
import networkx as nx
import logging

logger = logging.getLogger("api.rating")


def queryset_to_rcal(
    ratings, bucket_size=DAYS_PER_BUCKET, returnAveraged=True, year=None
):
    """
    Converts a Django queryset into the appropriate format for review calibration:
        Queryset of Rating objects => dict of (captain, ballkid, day) : rating

    Returns the averaged rcal dict format.

    year: the season being calibrated (defaults to the current calendar year).
    That season's ratees keep their plain name as the key, because the saved
    results (improvement, offset) are later looked up by plain name. Ratings
    from every other season are keyed "<name>_<year>" so each season's version
    of a ballkid is treated as a separate person. Previously this was always
    the *current* year, so calibrating a past year saved no ratee improvement
    or offset at all.
    """
    logger.info(f"[queryset_to_rcal] ratings {ratings}")

    if len(ratings) == 0:
        logger.info(f"[queryset_to_rcal] empty ratings returning empty rcal dict")
        return {}

    rcal_dict = {}
    if year is None:
        year = get_current_year()
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
                if rating.date.year == year
                else f"{rating.ratee_name}_{rating.date.year}"
            ),
            mapped_date,
        )
        # Ignore empty (including zero) ratings - a rating of zero should not be possible
        # given that overall rating is required when submitting a rating
        if rating.rating:
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

    Ties between equally large groups of reviewers are broken
    deterministically (alphabetically by first reviewer) instead of by set
    iteration order, so the same ratings always produce the same calibration.
    """
    if not data:
        return {}, set()

    graph = {}
    for r, p, d in data:
        graph.setdefault(p, set()).add(r)

    g = nx.Graph()
    for v in graph.values():
        for i in v:
            for j in v:
                g.add_edge(i, j)

    # largest connected component, ties broken by name
    components = list(nx.connected_components(g))
    if not components:
        return {}, set()
    con = sorted(components, key=lambda c: (-len(c), min(c)))[0]

    new_data = {(r, p, d): y for ((r, p, d), y) in data.items() if r in con}
    excluded = set(g.nodes).difference(con)

    logger.info(
        f"[remove_nonoverlapping_reviewers] data {new_data} after exclusion of reviewers {excluded}"
    )

    return new_data, excluded


def calibrate(ratings, year_ratings, tournament, year=None):
    ignore_outliers = tournament.rcal_ignore_outliers
    year_threshold = tournament.rcal_year_threshold
    bucket_size = tournament.rcal_bucket_size

    train_ratings = ratings.filter(date__year__gte=year_threshold)

    logger.info(
        f"[calibrate] starting calibration for {len(train_ratings)} ratings and {len(year_ratings)} year_ratings"
    )
    train = queryset_to_rcal(train_ratings, bucket_size, returnAveraged=True, year=year)
    test = queryset_to_rcal(year_ratings, bucket_size, returnAveraged=False, year=year)

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


def autoexclude(year_ratings, autoexclude_threshold, year):
    """
    Set ratings of raters with a current-season distance to ideal above the
    threshold to be auto-excluded.

    CalibrationParams is stored per ballkid and year, so the lookup must be
    scoped to the season being recalculated. Otherwise a reviewer's result
    from a prior season can incorrectly exclude their ratings this season.
    """

    # Only use reviewer calibration parameters calculated for this season.
    raters_to_autoexclude = CalibrationParams.objects.filter(
        year=year,
        rater_distance_to_ideal__gt=autoexclude_threshold,
    ).values_list("ballkid", flat=True)

    # Auto-exclude ratings of raters with dist > threshold
    ratings_to_autoexclude = year_ratings.filter(rater__in=raters_to_autoexclude)
    num_updated = ratings_to_autoexclude.update(status=RATING_STATUS.AUTO_EXCLUDED)
    logger.info(
        f"[autoexclude] Auto-excluded {num_updated} ratings for raters: {list(raters_to_autoexclude)}"
    )

    # Auto-include ratings of raters with dist < threshold
    ratings_to_include = year_ratings.exclude(rater__in=raters_to_autoexclude)
    num_updated = ratings_to_include.update(status=RATING_STATUS.COMPLETE)
    logger.info(f"[autoexclude] Auto-included {num_updated} ratings")


def get_postprocessed_rating(cp, rating, name):
    if rating is None:
        return None

    if cp is None:
        return float(rating)

    return cp.calibrate_rating(
        name, float(rating), clip_endpoints=(MIN_RATING, MAX_RATING)
    )


def run_calibration_and_save_params(year):
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

    logger.info(
        f"[run_calibration_and_save] Starting rating calibration for {len(ratings)} ratings"
    )

    ## STEP 2: Train on all ratings with year > year_threshold and calibrate for year_ratings
    # Ratings with manually excluded status are excluded, otherwise complete and auto-excluded
    # ratings are included
    (cp, excluded, failed_categories) = calibrate(
        ratings, year_ratings, tournament, year=year
    )

    if failed_categories is not None:
        logger.warning(
            f"[run_calibration_and_save] calibration failed: {failed_categories!r}"
        )

    # A failed fit must never drive rating-status changes or overwrite
    # reviewer calibration parameters. In particular, do not let stale
    # CalibrationParams trigger auto-exclusion. We still save raw ratee
    # statistics because leaderboards depend on them; cp=None makes
    # save_ratee_params skip all calibrated fields.
    if cp is None:
        logger.error(
            "[run_calibration_and_save] Calibration failed; preserving reviewer "
            "parameters and rating statuses while refreshing raw ratee statistics "
            "for year %s",
            year,
        )
        # Keep the raw reviewer aggregates current for the captain leaderboard.
        # Passing cp=None updates only non-calibration fields and preserves any
        # prior scale, offset, and distance-to-ideal values.
        save_rater_params(None, year_ratings, year)
        save_ratee_params(
            None,
            year_ratings.filter(status=RATING_STATUS.COMPLETE),
            year,
        )
        return cp, excluded, failed_categories, year_ratings

    ## STEP 3: Save rater params (based on all non-manually excluded ratings)
    save_rater_params(cp, year_ratings, year)

    ## STEP 4: Auto-exclude ratings for raters with distance to ideal > threshold
    autoexclude(year_ratings, tournament.rcal_calibration_threshold, year)

    ## STEP 5: Save ratee params, filtering to only complete (non auto-excluded) ratings
    save_ratee_params(cp, year_ratings.filter(status=RATING_STATUS.COMPLETE), year)

    return cp, excluded, failed_categories, year_ratings


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
                created_at=timezone.now(),
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
        if request.data.get("rating") is None:
            return Response(
                {"Invalid": "Overall rating is required to save a draft."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rater_id = request.data["rater"]
        ratee_id = request.data["ratee"]
        date = datetime.strptime(request.data["date"], SLASH_MONTH_DAY_YEAR_FORMAT_STR)

        rating_obj, _created = Rating.objects.update_or_create(
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

        logger.info(f"[SaveDraftRating] Saving draft rating {rating_obj}")
        return Response(RatingSerializer(rating_obj).data, status=status.HTTP_200_OK)


class CalibratedRatings(APIView):
    permission_classes = [IsChairperson]

    def get(self, request, year):
        cp, excluded, failed_categories, year_ratings = run_calibration_and_save_params(
            year
        )

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

        # If an rcal warning was thrown for the overall rating category
        if failed_categories is not None:
            logger.warning(
                f"[CalibratedRatings] overall rating category threw an rcal error"
            )
            s = status.HTTP_203_NON_AUTHORITATIVE_INFORMATION

        # If a non-zero number of reviewers had no overlap in the overall rating category
        elif len(excluded) > 0:
            logger.warning(
                f"[CalibratedRatings] overall rating category had excluded reviewers {excluded}"
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

        return Response(status=status.HTTP_200_OK)
