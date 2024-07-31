from django.db import models
from django.utils.translation import gettext_lazy as _


class POSITION(models.TextChoices):
    B = "Back", _("Back")
    N = "Net", _("Net")
    BN = "Back/Net", _("Back/Net")
    NB = "Net/Back", _("Net/Back")


class MATCH_TYPE(models.TextChoices):
    MS = "Men's Singles"
    MD = "Men's Doubles"
    WS = "Women's Singles"
    WD = "Women's Doubles"


class TICKET_SESSIONS(models.TextChoices):
    SUNDAY = "Sunday"
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY_AM = "Friday AM"
    FRIDAY_PM = "Friday PM"
    SATURDAY_AM = "Saturday AM"
    SATURDAY_PM = "Saturday PM"
    FINALS = "Finals"


class CUT_STATUS(models.TextChoices):
    DEFINITELY_KEEP = "Definitely Keep"
    POSSIBLY_KEEP = "Possibly Keep"
    POSSIBLY_CUT = "Possibly Cut"
    DEFINITELY_CUT = "Definitely Cut"


class DAY_OF_WEEK(models.TextChoices):
    END = "End"
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"


class CHECKOUT_TIMES(models.TextChoices):
    END = "End"
    ONE = "1pm"
    TWO = "2pm"
    THREE = "3pm"
    FOUR = "4pm"
    FIVE = "5pm"
    SIX = "6pm"
    SEVEN = "7pm"
    EIGHT = "8pm"
    NINE = "9pm"
    TEN = "10pm"
    ELEVEN = "11pm"
    MIDNIGHT = "12am"


class RATING_STATUS(models.TextChoices):
    SUBMITTED = "Submitted"
    DRAFT = "Draft"
    DELETED = "Deleted"
    JOKE = "Joke"
