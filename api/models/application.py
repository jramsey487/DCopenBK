"""
Models for the ballcrew application + tryout review workflow.

This replaces the "Google Form -> Sheet export -> CSV import" pipeline with
a native application flow:

    BallcrewApplication  -- one row per applicant, mirrors the public form
    TryoutReview          -- one row per (application, reviewer) evaluation

Applications are reviewed by chairpersons (and, per tryout day, captains
submitting TryoutReview rows). Accepting an application promotes it into a
real Ballkid record via the promote-application endpoint -- applications are
never written directly into Ballkid.
"""

from django.conf import settings
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from api.models.enums import POSITION


SIZE_CHOICES = [
    ("XS", "Extra Small"),
    ("S", "Small"),
    ("M", "Medium"),
    ("L", "Large"),
    ("XL", "Extra Large"),
]

GENDER_CHOICES = [
    ("M", "Male"),
    ("F", "Female"),
]

LIKELIHOOD_CHOICES = [
    ("certain", "Absolutely Certain"),
    ("moderate", "Moderately Likely"),
    ("unsure", "Unsure, But Submitting Application Just In Case"),
]

APPLICATION_STATUS_CHOICES = [
    ("pending", "Pending"),
    ("accepted", "Accepted"),
    ("rejected", "Rejected"),
    ("waitlisted", "Waitlisted"),
]

RECOMMENDATION_CHOICES = [
    ("strong_yes", "Strong Yes"),
    ("yes", "Yes"),
    ("no", "No"),
    ("strong_no", "Strong No"),
]

# Tournament days, keyed by their fixed position relative to the
# tournament's start (which runs Saturday through the following Sunday --
# 9 days), NOT by literal calendar date. The actual calendar date for each
# is computed at render time from Tournament.start_date (see
# ApplicationSettingsView), so this list never needs to change year to year
# even though the tournament's actual dates do.
DAY_SAT_1 = "sat_1"  # first Saturday
DAY_SUN_1 = "sun_1"  # first Sunday
DAY_MON = "mon"
DAY_TUE = "tue"
DAY_WED = "wed"
DAY_THU = "thu"
DAY_FRI = "fri"
DAY_SAT_2 = "sat_2"  # second (final) Saturday
DAY_SUN_2 = "sun_2"  # second (final) Sunday -- maps to "End" for last-day purposes

TOURNAMENT_DAYS = [
    DAY_SAT_1,
    DAY_SUN_1,
    DAY_MON,
    DAY_TUE,
    DAY_WED,
    DAY_THU,
    DAY_FRI,
    DAY_SAT_2,
    DAY_SUN_2,
]

# Order matters here -- used to find the "latest" day someone picked.
_DAY_ORDER = TOURNAMENT_DAYS

# First-timers: the first four days are mandatory and not asked about at
# all (see BallcrewApplicationSubmitSerializer); availability_days for a
# first-timer is only ever a subset of these five.
FIRST_TIMER_AVAILABILITY_DAYS = [DAY_WED, DAY_THU, DAY_FRI, DAY_SAT_2, DAY_SUN_2]

# Veterans: the first Saturday and Tuesday are mandatory (with an email-us
# escape hatch, handled outside the system); the Sunday/Monday choice
# always falls chronologically before Tuesday, so it never affects last-day
# derivation. availability_days for a veteran is only ever a subset of
# these three (the end-of-tournament question).
VETERAN_SUN_MON_CHOICES = [(DAY_SUN_1, "Sunday"), (DAY_MON, "Monday")]
VETERAN_WED_THU_CHOICES = [
    (DAY_WED, "Available for start of Wednesday"),
    (DAY_THU, "Available for start of Thursday"),
    ("both", "Available for start of Wednesday & Thursday"),
]
VETERAN_END_OF_TOURNAMENT_DAYS = [DAY_FRI, DAY_SAT_2, DAY_SUN_2]


def _latest_day(days):
    """Given a list of day keys, returns whichever falls latest in the
    tournament, or None if the list is empty."""
    present = [d for d in _DAY_ORDER if d in days]
    return present[-1] if present else None


def derive_last_day(application):
    """
    Computes an applicant's expected last working day from their
    availability answers:

    - First-timers: the first four days (Sat-Tue) are mandatory, so if they
      picked no Wed-Sun day at all, their last day is Tuesday. Otherwise
      it's the latest Wed-Sun day they picked.
    - Veterans: the first Saturday and Tuesday are mandatory (their
      Sunday-or-Monday choice always falls before Tuesday, so it's
      irrelevant here). If they picked no end-of-tournament day, their last
      day is the later of their Wed/Thu choice ("both" counts as Thursday).
      Otherwise it's the latest end-of-tournament day they picked.

    Returns one of the DAY_* constants above, or the string "END" for the
    tournament's actual final day -- mapping that onto whatever choices
    Ballkid's own last-day field uses is the caller's job.
    """
    if application.is_veteran:
        if application.availability_days:
            latest = _latest_day(application.availability_days)
        else:
            latest = (
                DAY_THU
                if application.veteran_wed_thu_choice in (DAY_THU, "both")
                else DAY_WED
            )
    else:
        latest = _latest_day(application.availability_days) or DAY_TUE

    return "END" if latest == DAY_SUN_2 else latest


def headshot_upload_path(instance, filename):
    return f"headshots/applications/{instance.pk or 'new'}/{filename}"


class BallcrewApplication(models.Model):
    # --- Core identity -----------------------------------------------
    email = models.EmailField()
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    date_of_birth = models.DateField()
    state = models.CharField(max_length=2)
    phone = models.CharField(max_length=20)
    additional_email = models.EmailField(blank=True)

    # --- Emergency contact --------------------------------------------
    emergency_contact_name = models.CharField(max_length=100)
    emergency_contact_relationship = models.CharField(max_length=50)
    emergency_contact_phone = models.CharField(max_length=20)

    # --- Sizing ---------------------------------------------------------
    tshirt_size = models.CharField(max_length=2, choices=SIZE_CHOICES)
    shorts_size = models.CharField(max_length=2, choices=SIZE_CHOICES)
    shoe_size = models.CharField(max_length=6)

    # --- Free response ----------------------------------------------
    motivation = models.TextField()
    is_vegetarian = models.BooleanField()
    fun_fact = models.TextField(blank=True)
    traveling_with_names = models.TextField(
        blank=True,
        help_text="Names of any other applicants/ballcrew this applicant is traveling/applying with.",
    )

    # --- Branch flag: drives which of the two field groups below apply --
    is_veteran = models.BooleanField()

    # --- Veteran-only fields --------------------------------------------
    years_experience = models.PositiveSmallIntegerField(null=True, blank=True)
    position = models.CharField(
        max_length=10, choices=POSITION.choices, null=True, blank=True
    )
    is_captain = models.BooleanField(null=True, blank=True)
    likelihood = models.CharField(
        max_length=20, choices=LIKELIHOOD_CHOICES, null=True, blank=True
    )
    headshot_update = models.ImageField(
        upload_to=headshot_upload_path, null=True, blank=True
    )
    tryout_help_availability = models.JSONField(default=list, blank=True)
    veteran_sunday_or_monday = models.CharField(
        max_length=10, choices=VETERAN_SUN_MON_CHOICES, null=True, blank=True
    )
    veteran_wed_thu_choice = models.CharField(
        max_length=10, choices=VETERAN_WED_THU_CHOICES, null=True, blank=True
    )

    # --- First-timer-only fields -----------------------------------------
    headshot = models.ImageField(
        upload_to=headshot_upload_path, null=True, blank=True
    )
    has_tried_out_before = models.BooleanField(null=True, blank=True)
    prior_experience = models.TextField(blank=True)
    tryout_date = models.CharField(max_length=100, null=True, blank=True)

    # --- Availability -----------------------------------------------------
    # First-timers: subset of FIRST_TIMER_AVAILABILITY_DAYS (Wed-Sun) --
    # the first four days are mandatory and not asked about.
    # Veterans: subset of VETERAN_END_OF_TOURNAMENT_DAYS (Fri/Sat/Sun) --
    # see veteran_sunday_or_monday and veteran_wed_thu_choice above for the
    # rest of a veteran's week.
    availability_days = models.JSONField(default=list)

    # --- Waiver -----------------------------------------------------------
    waiver_signature_name = models.CharField(max_length=100)
    parent_signature_name = models.CharField(max_length=100, blank=True)

    # --- Review workflow (chairperson-managed, not applicant-submitted) --
    status = models.CharField(
        max_length=20, choices=APPLICATION_STATUS_CHOICES, default="pending"
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_applications",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    promoted_ballkid = models.ForeignKey(
        "api.Ballkid",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_application",
    )

    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.status})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class TryoutReview(models.Model):
    """
    One reviewer's evaluation of one applicant at a tryout session.
    Deliberately separate from api.models.rating.Rating: this is a one-time
    snapshot feeding a promote/reject decision, not a calibrated season-long
    rating series. Multiple reviews per application are expected (e.g. two
    tryout stations) and are aggregated in the review dashboard, not merged
    at write time.
    """

    application = models.ForeignKey(
        BallcrewApplication, on_delete=models.CASCADE, related_name="tryout_reviews"
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    tryout_date = models.DateField()

    # Same five-category shape as the ongoing Rating model, so reviewers
    # already familiar with the ratings rubric don't have to learn a second
    # one just for tryouts.
    athleticism_rating = models.PositiveSmallIntegerField()
    rolling_rating = models.PositiveSmallIntegerField()
    awareness_rating = models.PositiveSmallIntegerField()
    decision_rating = models.PositiveSmallIntegerField()
    effort_rating = models.PositiveSmallIntegerField()
    overall_rating = models.PositiveSmallIntegerField()

    observed_position = models.CharField(
        max_length=10, choices=POSITION.choices, blank=True
    )
    notes = models.TextField(blank=True)
    recommendation = models.CharField(max_length=20, choices=RECOMMENDATION_CHOICES)

    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"Review of {self.application.full_name} by {self.reviewer}"


class ApplicationSettings(models.Model):
    """
    Singleton row controlling whether the public application form (/apply)
    accepts submissions. Chairpersons toggle this from the review dashboard;
    SubmitApplicationView checks it server-side so a closed toggle can't be
    bypassed by hitting the API directly.
    """

    is_open = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Application settings"
        verbose_name_plural = "Application settings"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Applications open" if self.is_open else "Applications closed"


@receiver(pre_delete, sender=BallcrewApplication)
def delete_application_headshot_files(sender, instance, **kwargs):
    """
    Deleting a BallcrewApplication row should also remove its uploaded
    headshot(s) from R2/storage -- otherwise the file is orphaned forever,
    defeating the point of deleting an unpromoted applicant's data.

    Skipped for promoted applications: PromoteApplicationView reuses this
    same R2 file directly as the resulting Ballkid.image (no copy is made),
    so deleting it here would break that ball kid's live photo. Only ever
    delete an application that has promoted_ballkid set if you also intend
    to lose that ball kid's photo.
    """
    if instance.promoted_ballkid_id:
        return
    for field in (instance.headshot, instance.headshot_update):
        if field:
            field.storage.delete(field.name)
