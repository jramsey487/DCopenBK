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

# Tournament days offered across both the veteran and first-time sections of
# the form. Stored as a JSON list of these values on availability_days.
TOURNAMENT_DAYS = [
    "sat_jul_25",
    "sun_jul_26",
    "mon_jul_27",
    "tue_jul_28",
    "wed_jul_29",
    "thu_jul_30",
    "fri_jul_31",
    "sat_aug_1",
    "sun_aug_2",
]


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

    # --- First-timer-only fields -----------------------------------------
    headshot = models.ImageField(
        upload_to=headshot_upload_path, null=True, blank=True
    )
    has_tried_out_before = models.BooleanField(null=True, blank=True)
    prior_experience = models.TextField(blank=True)
    tryout_date = models.CharField(max_length=100, null=True, blank=True)

    # --- Availability (both branches use the same day vocabulary) -------
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
