from datetime import datetime, timedelta


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
