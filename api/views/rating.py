from django.db.models import Value, Avg, Count, Q, Subquery, OuterRef, Exists
from django.db.models.functions import Concat, Extract
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from api.serializers import *
from api.permissions import *
from api.models.ballkid import *
from api.utils import *
from datetime import datetime
from rcal import RcalWarning, calibrate_parameters
import networkx as nx
import warnings


def dict_to_rcal(data, min_date, rating_name="overall", returnAveraged=True):
    """
    Converts a Django queryset into the appropriate format for review calibration:
        Queryset of Rating objects => dict of (captain, ballkid, day) : rating

    Returns the minimum date and the averaged rcal dict format

    NOTE THAT RATINGS OF 0 ARE CONSIDERED EMPTY AND ARE NOT INCLUDED
    """

    rcal_dict = {}
    for rating in data:
        key = (
            rating.rater.get_name(),
            rating.ratee.get_name(),
            (rating.date - min_date).days,
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
    for (r, p, d) in data:
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

    return new_data, excluded


def calibrate(ratings, rating_name="overall", min_rating=0.5, max_rating=5, stdev=2):
    min_date = min([rating.date for rating in ratings])

    train = dict_to_rcal(ratings, min_date, rating_name, returnAveraged=True)
    test = dict_to_rcal(ratings, min_date, rating_name, returnAveraged=False)

    train, excluded = remove_nonoverlapping_reviewers(train)
    test, _ = remove_nonoverlapping_reviewers(test)

    cp = calibrate_parameters(train, rating_delta=(max_rating - min_rating))
    cp.rescale_parameters(test, (min_rating, max_rating), ignore_outliers=stdev)

    cp.set_reviewer_offsets({r: 0 for r in excluded})
    cp.set_reviewer_scales({r: 1 for r in excluded})

    return cp, excluded


def save_calibration_parameters(cp):
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

        ballkid = Ballkid.objects.get(
            first_name=get_first_name(name), last_name=get_last_name(name)
        )

        cp, created = CalibrationParams.objects.update_or_create(
            ballkid=ballkid,
            defaults={
                "ratee_improvement": improvement,
                "ratee_offset": ballkid_offset,
                "rater_scale": scale,
                "rater_offset": offset,
            },
        )
        cp.save()


class AllRatings(generics.ListAPIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairperson]

    def get_queryset(self):
        return Rating.objects.order_by(
            "ratee__last_name",
            "ratee__first_name",
            "-date",
            "rater__last_name",
            "rater__first_name",
        ).annotate(
            ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
            rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
            year=Extract("date", "year"),
            month=Extract("date", "month"),
            day=Extract("date", "day"),
        )


class MyRatings(generics.ListAPIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairpersonOrCaptain]

    def get_queryset(self):
        pk = self.kwargs.get("pk")
        return (
            Rating.objects.filter(rater_id=pk)
            .order_by("ratee__last_name", "ratee__first_name", "-date")
            .annotate(
                ratee_name=Concat("ratee__first_name", Value(" "), "ratee__last_name"),
                rater_name=Concat("rater__first_name", Value(" "), "rater__last_name"),
                year=Extract("date", "year"),
                month=Extract("date", "month"),
                day=Extract("date", "day"),
            )
        )


class CreateRating(APIView):
    serializer_class = RatingSerializer
    permission_classes = [IsChairpersonOrCaptain]

    def post(self, request, format=None):
        data = {key: val for key, val in request.data.items() if key != "date"}
        date = datetime.strptime(request.data["date"], "%m/%d/%Y")
        data["date"] = datetime.strftime(date, "%Y-%m-%d")

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

            # Update calibration parameters
            cp, _ = calibrate(Rating.objects.all())
            save_calibration_parameters(cp)

            return Response(RatingSerializer(rating).data)

        return Response(
            {"Invalid serializer": f"Errors: {serializer.errors}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class CalibratedRatings(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        MIN_RATING = 0.5
        MAX_RATING = 5
        RATING_CATEGORIES = [
            "overall",
            "athleticism",
            "rolling",
            "awareness",
            "decision",
            "effort",
        ]

        cp_dict, excluded = {}, {}
        ratings = Rating.objects.all()

        all_warnings = set()
        for rating_name in RATING_CATEGORIES:
            with warnings.catch_warnings(record=True) as caught_warnings:
                cp_dict[rating_name], excluded[rating_name] = calibrate(
                    ratings, rating_name, min_rating=MIN_RATING, max_rating=MAX_RATING
                )
            if any((x.category == RcalWarning for x in caught_warnings)):
                all_warnings.add(rating_name)

        # Save calibration parameters for overall ratings only
        save_calibration_parameters(cp_dict["overall"])

        # Calibrate each rating to put together a list of calibrated ratings
        # to return
        postprocessed = [
            {
                "id": rating.id,
                "rater": rating.rater,
                "ratee": rating.ratee,
                "date": rating.date,
                "rating": cp_dict["overall"].calibrate_rating(
                    rating.rater.get_name(),
                    float(rating.rating),
                    clip_endpoints=(MIN_RATING, MAX_RATING),
                ),
                "athleticism_rating": cp_dict["athleticism"].calibrate_rating(
                    rating.rater.get_name(),
                    float(rating.athleticism_rating),
                    clip_endpoints=(MIN_RATING, MAX_RATING),
                )
                if rating.athleticism_rating is not None
                else None,
                "rolling_rating": cp_dict["rolling"].calibrate_rating(
                    rating.rater.get_name(),
                    float(rating.rolling_rating),
                    clip_endpoints=(MIN_RATING, MAX_RATING),
                )
                if rating.rolling_rating is not None
                else None,
                "awareness_rating": cp_dict["awareness"].calibrate_rating(
                    rating.rater.get_name(),
                    float(rating.awareness_rating),
                    clip_endpoints=(MIN_RATING, MAX_RATING),
                )
                if rating.awareness_rating is not None
                else None,
                "decision_rating": cp_dict["decision"].calibrate_rating(
                    rating.rater.get_name(),
                    float(rating.decision_rating),
                    clip_endpoints=(MIN_RATING, MAX_RATING),
                )
                if rating.decision_rating is not None
                else None,
                "effort_rating": cp_dict["effort"].calibrate_rating(
                    rating.rater.get_name(),
                    float(rating.effort_rating),
                    clip_endpoints=(MIN_RATING, MAX_RATING),
                )
                if rating.effort_rating is not None
                else None,
                "comments": rating.comments,
                # Annotated values
                "rater_name": rating.rater.get_name(),
                "ratee_name": rating.ratee.get_name(),
                "year": rating.date.year,
                "month": rating.date.month,
                "day": rating.date.day,
            }
            for rating in ratings
        ]

        # Chain multiple sorts to allow for one of them to be reversed but not the rest.
        # When chaining multiple sorts, first sort is the least priority sort and last
        # sort is the highest priority sort.
        postprocessed = sorted(
            postprocessed,
            key=lambda k: (
                k["rater_name"].split(" ")[0],
                k["rater_name"].split(" ")[1],
            ),
        )
        postprocessed = sorted(postprocessed, key=lambda k: k["date"], reverse=True)
        postprocessed = sorted(
            postprocessed,
            key=lambda k: (
                k["ratee_name"].split(" ")[0],
                k["ratee_name"].split(" ")[1],
            ),
        )

        if "overall" in all_warnings: 
            s = status.HTTP_204_NO_CONTENT
        elif excluded['overall']: 
            s = status.HTTP_206_PARTIAL_CONTENT
        else: 
            s = status.HTTP_200_OK

        return Response(
            RatingSerializer(postprocessed, many=True).data,
            status=s
            )


class GetCalibrationParams(generics.RetrieveAPIView):
    permission_classes = [IsChairperson]
    serializer_class = CalibrationParamsSerializer

    def get_object(self):
        try:
            return CalibrationParams.objects.get(ballkid_id=self.kwargs["pk"])
        except CalibrationParams.DoesNotExist:
            pass


class GetAverageCalibrationParams(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        avg_offset = CalibrationParams.objects.aggregate(
            Avg("rater_offset"), Avg("rater_scale")
        )
        return Response(avg_offset)
