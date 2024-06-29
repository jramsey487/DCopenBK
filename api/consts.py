DEFAULT_IMAGE_FILE = "static/img/none.jpg"
MIN_CAPTAIN_DURATION = 30
CHECKIN_START_HOUR = 8
MATCHES_START_HOUR = 10

NUM_COURTS_TO_COURTS = {
    5: ["Stadium", "Court 4", "Harris", "Court 5", "Grandstand"],
    4: ["Stadium", "Court 4", "Harris", "Grandstand"],
    3: ["Stadium", "Harris", "Grandstand"],
    2: ["Stadium", "Harris"],
    1: ["Stadium"],
}

HYPHEN_YEAR_MONTH_DAY_FORMAT_STR = "%Y-%m-%d"
T_YEAR_MONTH_DAY_FORMAT_STR = "%Y-%m-%dT%H:%M:%S"
T_YEAR_MONTH_DAY_Z_FORMAT_STR = "%Y-%m-%dT%H:%M:%S.000Z"
SLASH_MONTH_DAY_YEAR_FORMAT_STR = "%m/%d/%Y"
WEEKDAY_MONTH_DAY_FORMAT_STR = "%a, %b %-d"
YEAR_FORMAT_STR = "%Y"
WEEKDAY_FORMAT_STR = "%A"
HOUR_COLON_MINUTE_FORMAT_STR = "%H:%M"
HOUR_MINUTE_SECOND_FORMAT_STR = "%I:%M:%S %p"

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
# Number of days per date bucketing for calibration. A larger number results in
# more likely to succeed (but theoretically less accurate) calibration
DAYS_PER_BUCKET = 3
