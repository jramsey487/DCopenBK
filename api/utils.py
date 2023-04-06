from datetime import datetime, timedelta
from rcal import calibrate_parameters


def get_first_name(full_name):
    return " ".join(full_name.split(" ")[:-1])


def get_last_name(full_name):
    return full_name.split(" ")[-1]


def calc_overlapping_time(start1, end1, start2, end2):
    """
    Calculate overlapping time between 2 time ranges (defined by start and end datetimes).
    If either end time is None, then return a 0 timedelta (aka do not include any time
    from an ongoing shift)

    Arguments:
    start1(datetime): start time for first time interval
    end1(datetime): end time for first time interval
    start2(datetime): start time for second time interval
    end2(datetime): end time for second time interval
    """
    if end1 is None or end2 is None:
        return timedelta()

    if end1 <= start2 or end2 <= start1:
        return timedelta()

    end = min(end1, end2)
    start = max(start1, start2)

    return end - start


def timedelta_to_str(delta):
    """
    Converts a timedelta object into a string of the form: "xx hrs yy mins"
    If no timedelta object provided (None), "0 hrs 0 mins" is outputted
    """
    if delta is None:
        return "0 hrs 0 mins"

    hours, remainder = divmod(delta.total_seconds(), 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{int(hours)} hrs {int(minutes)} mins"


def datetime_str_to_datetime(input_str, format_str="%Y-%m-%d %H:%M:%S"):
    """
    Converts a string to a datetime object.

    Input string is of the form:
        {year}-{month}-{day}T{hours}:{minutes}:{seconds}.{milliseconds}

    For different formats of the year and/or time, format_str can be customized.
    Note that this function as it is currently built ALWAYS ASSUMES "T" to split
    up the date and time. Milliseconds after "." is optional in the input_str
    """
    if not input_str:
        return

    splitted = input_str.split("T")
    date = splitted[0]
    time = splitted[1].split(".")[0]

    return datetime.strptime(f"{date} {time}", format_str)


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
            rating = rating.rating
        elif rating_name == "athleticism":
            rating = rating.athleticism_rating
        elif rating_name == "rolling":
            rating = rating.rolling_rating
        elif rating_name == "awareness":
            rating = rating.awareness_rating
        elif rating_name == "decision":
            rating = rating.decision_rating
        elif rating_name == "effort":
            rating = rating.effort_rating
        else:
            raise Exception(f"Unrecognized rating name {rating_name}")

        if rating is not None and rating > 0:
            if key not in rcal_dict:
                rcal_dict[key] = []

            rcal_dict[key].append(float(rating))

    if not returnAveraged:
        return rcal_dict

    averaged_rcal_dict = {key: sum(val) / len(val) for key, val in rcal_dict.items()}
    return averaged_rcal_dict


def calibrate(ratings, rating_name="overall", min_rating=0.5, max_rating=5, stdev=2):
    min_date = min([rating.date for rating in ratings])

    train = dict_to_rcal(ratings, min_date, rating_name, returnAveraged=True)
    test = dict_to_rcal(ratings, min_date, rating_name, returnAveraged=False)

    cp = calibrate_parameters(train, rating_delta=(max_rating - min_rating))
    cp.rescale_parameters(test, (min_rating, max_rating), ignore_outliers=stdev)

    return cp
