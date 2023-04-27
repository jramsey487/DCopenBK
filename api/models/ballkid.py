from django.db import models
from django.utils.translation import gettext_lazy as _
from datetime import datetime, timedelta
from api.utils import calc_overlapping_time
from api.models.schedule import Schedule, Court
from django.contrib.auth.models import User
import logging

logger = logging.getLogger("api.ballkid")


class Position(models.TextChoices):
    B = "Back", _("Back")
    N = "Net", _("Net")
    BN = "Back/Net", _("Back/Net")
    NB = "Net/Back", _("Net/Back")


class MATCH_TYPE(models.TextChoices):
    MS = "Men's Singles"
    MD = "Men's Doubles"
    WS = "Women's Singles"
    WD = "Women's Doubles"


class CUT_STATUS(models.TextChoices):
    DEFINITELY_KEEP = "Definitely Keep"
    POSSIBLY_KEEP = "Possibly Keep"
    POSSIBLY_CUT = "Possibly Cut"
    DEFINITELY_CUT = "Definitely Cut"


class DAY_OF_WEEK(models.TextChoices):
    MONDAY = "Monday"
    TUESDAY = "Tuesday"
    WEDNESDAY = "Wednesday"
    THURSDAY = "Thursday"
    FRIDAY = "Friday"
    SATURDAY = "Saturday"
    SUNDAY = "Sunday"


class Ballkid(models.Model):
    # Ballkid static information
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, blank=True, null=True, related_name="ballkid"
    )
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    age = models.IntegerField(default=0)
    image = models.CharField(
        max_length=100, default="api/static/img/none.jpg", blank=True
    )
    num_years_experience = models.IntegerField(default=0)
    # years_worked = ArrayField(ArrayField(models.IntegerField(default=0)))
    is_captain = models.BooleanField(default=False)
    is_chairperson = models.BooleanField(default=False)
    preferred_position = models.CharField(
        max_length=10, choices=Position.choices, default=Position.B
    )

    # Ballkid status
    is_cut = models.BooleanField(default=False)
    cut_status = models.CharField(max_length=20, choices=CUT_STATUS.choices, blank=True)
    # Archive ballkids from previous years. This refers to if the
    # ballkid was active this year or not
    is_active = models.BooleanField(default=True)

    # Ballkid transient information
    is_checked_in = models.BooleanField(default=False)
    current_team = models.IntegerField(default=0)
    finals_team = models.CharField(max_length=20, choices=MATCH_TYPE.choices, blank=True)
    position = models.CharField(
        max_length=10, choices=Position.choices, default=Position.B
    )
    finals_position = models.CharField(
        max_length=10, choices=Position.choices, default=Position.B
    )
    comments = models.TextField(default="", blank=True)

    def recalc_checkin_analytics(self, now=None):
        """
        Recalculates total checkin duration for the ballkid and saves to the
        CheckinAnalytics table
        """

        if now is None:
            now = datetime.now()

        # TODO: make this more efficient by caching the result and only
        # updating based on the most recent history

        histories = CheckinHistory.objects.all().filter(ballkid_id=self.id)
        duration = timedelta()
        for history in histories:
            end_time = history.checkout if history.checkout else now
            duration += end_time - history.checkin

        analytic, created = CheckinAnalytics.objects.get_or_create(ballkid_id=self.id)
        analytic.duration = duration
        analytic.save()

    def recalc_captain_analytics(self, now=None):
        """
        Recalculates captain counts and durations BIDIRECTIONALLY. This means that
        - for a ballkid, CaptainAnalytics is updated to account for all captains that
        the ballkid has had
        - for a captain, CaptainAnalytics is updated to account for all ballkids (captain
        and non-captain) that have had this ballkid as captain
        )
        """

        if now is None:
            now = datetime.now()

        for updateAsCaptain in [True, False]:
            # If ballkid is not a captain, then don't update as captain
            if updateAsCaptain and not self.is_captain:
                continue

            durations = {}
            counts = {}

            # If updating as captain, then treat self as the captain
            if updateAsCaptain:
                histories = CaptainHistory.objects.filter(captain=self)
            # If not updating as captain, then treat self as the ballkid
            else:
                histories = CaptainHistory.objects.filter(ballkid=self)

            # For each history between ballkid and captain
            for history in histories:
                other_id = history.ballkid_id if updateAsCaptain else history.captain_id

                if other_id not in durations:
                    durations[other_id] = timedelta()
                if other_id not in counts:
                    counts[other_id] = 0

                # Boolean to indicate whether there was any shift that had positive
                # overlap. If so, increment the count of number of histories between
                # ballkid and captain
                overlapping = False

                # TODO: make this more efficient by filtering shifts further
                shifts = Schedule.objects.filter(team=history.team)
                # For each shift, check if there is any overlapping time between the
                # start and end of the CaptainHistory and the start and end of a shift
                for shift in shifts:
                    overlap = calc_overlapping_time(
                        history.start,
                        history.end if history.end else now,
                        shift.start,
                        shift.end if shift.end else shift.start + timedelta(hours=1),
                    )
                    durations[other_id] += overlap
                    if overlap:
                        overlapping = True

                # If any overlap with a shift, increment count of number of histories
                # between ballkid and captain
                if overlapping:
                    counts[other_id] += 1

            for other_id, duration in durations.items():
                # If no overlapping times between (ballkid, captain) pair,
                # then continue and do not create a CaptainAnalytics entry
                if not duration:
                    continue

                if updateAsCaptain:
                    analytic, _ = CaptainAnalytics.objects.get_or_create(
                        ballkid_id=other_id, captain=self
                    )
                else:
                    analytic, _ = CaptainAnalytics.objects.get_or_create(
                        ballkid=self, captain_id=other_id
                    )
                analytic.duration = durations[other_id]
                analytic.count = counts[other_id]
                analytic.save()

    def recalc_court_analytics(self, now=None):
        counts = {}
        times = {}

        if now is None:
            now = datetime.now()

        # Get all team histories for this ballkid
        histories = TeamHistory.objects.all().filter(ballkid_id=self.id)

        for history in histories:
            # TODO: make this more efficient by filtering on the day of the shift
            # while being flexible enough for times after midnight

            # Find all associated shifts of the ballkid's team
            shifts = Schedule.objects.all().filter(team=history.team)

            for shift in shifts:
                court = shift.court
                overlapping = calc_overlapping_time(
                    history.start,
                    history.end if history.end else now,
                    shift.start,
                    shift.end if shift.end else shift.start + timedelta(hours=1),
                )

                # ONLY if there is non-zero overlapping time, then log the court to the
                # ballkid's CourtAnalytics (counts and durations)
                if overlapping:
                    if court not in counts:
                        counts[court] = 0
                    if court not in times:
                        times[court] = timedelta()

                    counts[court] += 1
                    times[court] += overlapping

        # Create or update the row in CourtAnalytics for the (ballkid, court) pair
        for court in counts:
            analytic, created = CourtAnalytics.objects.get_or_create(
                ballkid_id=self.id, court=court
            )
            analytic.count = counts[court]
            analytic.duration = times[court]
            analytic.save()

    def recalc_analytics(self, now=None):
        self.recalc_checkin_analytics(now)
        self.recalc_captain_analytics(now)
        self.recalc_court_analytics(now)

    def handle_checkin_history(self, value, now=None):
        """
        Handle logic for saving checkin history and recalculating total amount of time the
        ballkid is checked in.

        Arguments:
        value(bool): New checkin status that the ballkid is getting set to. True if the ballkid
        is getting checked in and False if the ballkid is getting checked out
        """

        if now is None:
            now = datetime.now()

        # If no change to field value (trying to set the field to the same as
        # the current value), then do nothing
        if self.is_checked_in == value:
            return

        # If checking in, create new checkin history row
        if value:
            history = CheckinHistory.objects.create(ballkid=self, checkin=now)
            history.save()
        # If checking out, update most recent checkin history row
        else:
            histories = CheckinHistory.objects.filter(ballkid=self)
            if histories.count() > 0:
                history = histories.order_by("-checkin").first()
                history.checkout = now
                if history.checkout < history.checkin:
                    raise Exception(
                        f"Checkout time {history.checkout} is before checkin time {history.checkin}"
                    )
                history.duration = history.checkout - history.checkin
                history.save()

    def handle_team_history(self, value, now=None):
        """
        Handle logic for saving team history.

        Arguments:
        value(int): New team assignment that the ballkid is getting set to. 0 if the ballkid
        is getting unassigned, and otherwise is a positive int
        """

        if now is None:
            now = datetime.now()

        # If no change to field value (trying to set the field to the same as
        # the current value), then do nothing
        if self.current_team == value:
            return

        # Log end column of the most recent row in TeamHistory, regardless
        # of whether the ballkid is being assigned to a new team or unassigned. If the
        # ballkid was previously unassigned, skip
        histories = TeamHistory.objects.filter(ballkid=self)
        if self.current_team != 0 and histories.count() > 0:
            history = histories.order_by("-start").first()
            # Note: this might silently break if history.end if already filled in for whatever reason!
            history.end = now

            if history.end < history.start:
                raise Exception(
                    f"End time {history.end} is before start time {history.start}"
                )
            history.duration = history.end - history.start
            history.save()

        # If the ballkid is assigned to a new team (not unassigned), then create
        # a new row in TeamHistory to track time on the new team
        if value:
            history = TeamHistory(ballkid=self, start=now, team=value)
            history.save()

    def handle_captain_history_team(self, value, now=None):
        """
        Handle logic for saving captain history, specifically when changing a ballkid/
        captain's team assignment.

        Arguments:
        value(int): New team assignment that the ballkid is getting set to. 0 if the ballkid
        is getting unassigned, and otherwise is a positive int
        """
        if now is None:
            now = datetime.now()

        # If no change to field value (trying to set the field to the same as
        # the current value), then do nothing
        if self.current_team == value:
            return

        # Regardless of whether the ballkid is a captain or not, when leaving Team A, Team
        # A's captains need to be updated with the ending. If the ballkid was previously
        # unassigned, skip.
        if self.current_team != 0:
            # Get all captains on previous team
            prev_captains = Ballkid.objects.filter(
                is_captain=True, current_team=self.current_team
            ).exclude(id=self.id)

            # For each captain, find the most recent CaptainHistory entry for
            # (ballkid, captain, team) tuple
            for captain in prev_captains:
                captain_histories = CaptainHistory.objects.filter(
                    ballkid=self, captain=captain, team=self.current_team
                )
                if captain_histories.count() == 0:
                    continue
                history = captain_histories.order_by("-start").first()

                # If this most recent entry has empty end, then update end and duration
                if history.end is None:
                    history.end = now

                    if history.end < history.start:
                        raise Exception(
                            f"End time {history.end} is before start time {history.start}"
                        )

                    history.duration = history.end - history.start
                    history.save()

        # If the ballkid is assigned to a new team (not unassigned), then create
        # new rows in CaptainHistory to track time with the captain for each captain
        # on the new team
        if value:
            new_captains = Ballkid.objects.filter(is_captain=True, current_team=value)
            for captain in new_captains:
                CaptainHistory.objects.create(
                    ballkid=self, captain=captain, start=now, team=value
                )

        # If the ballkid is also a captain, then need to update all other ballkids when leaving
        # Team A and joining Team B.
        if self.is_captain:
            # Get and update everybody on the previous team
            if self.current_team != 0:
                ballkids = Ballkid.objects.filter(current_team=self.current_team).exclude(
                    id=self.id
                )

                # For each ballkid, find the most recent CaptainHistory entry
                for ballkid in ballkids:
                    ballkid_histories = CaptainHistory.objects.filter(
                        captain=self, ballkid=ballkid, team=self.current_team
                    )
                    if ballkid_histories.count() == 0:
                        continue
                    history = ballkid_histories.order_by("-start").first()

                    # If this most recent entry has empty end, then log end and duration
                    if history.end is None:
                        history.end = now

                        if history.end < history.start:
                            raise Exception(
                                f"End time {history.end} is before start time {history.start}"
                            )

                        history.duration = history.end - history.start
                        history.save()

            # If the ballkid (who is also a captain) is assigned to a new team (not unassigned),
            # then create new rows in CaptainHistory to track time with the captain for each
            # person on the new team
            if value:
                new_ballkids = Ballkid.objects.filter(current_team=value)
                for ballkid in new_ballkids:
                    history = CaptainHistory.objects.create(
                        ballkid=ballkid, captain=self, start=now, team=value
                    )
                    history.save()

    def handle_captain_history_captain(self, value, now=None):
        """
        Handle logic for saving captain history, specifically when a ballkid is demoted or
        promoted to captain.

        Arguments:
        value(bool): True if the ballkid is getting promoted to captain and False if the
        ballkid is getting demoted from captain
        """
        if now is None:
            now = datetime.now()

        # If ballkid is unassigned, then do nothing because promotion/demotion doesn't
        # matter and will be handled when the ballkid is assigned to a team
        if self.current_team == 0:
            return

        # If there is no change in the captain status, then do nothing
        if self.is_captain == value:
            return

        # Get all the ballkids on the current team excluding self
        ballkids = (
            Ballkid.objects.all()
            .filter(current_team=self.current_team)
            .exclude(id=self.id)
        )
        for ballkid in ballkids:
            # If getting promoted to be a captain, create a CaptainHistory entry
            # for each ballkid on the team
            if value:
                CaptainHistory.objects.create(
                    ballkid=ballkid, captain=self, start=now, team=self.current_team
                )
            # If getting demoted from a captain, add end for all CaptainHistory entries
            # which do not already have an end
            else:
                histories = CaptainHistory.objects.filter(
                    ballkid=ballkid, captain=self, team=self.current_team
                )
                if histories.count() == 0:
                    continue

                history = histories.order_by("-start").first()
                # TODO: this might silently break if history.end if already filled in for whatever reason!
                history.end = now
                history.save()

    def handle_cut_history(self, value, now=None):
        """
        Handle logic for saving cut history.

        Arguments:
        value(bool): True if the ballkid is getting cut, False if ballkid is
        getting uncut
        now(datetime): Optional argument for supplying a manual datetime at
        which the ballkid was cut
        """

        if now is None:
            now = datetime.now()

        # If no change to field value (trying to set the field to the same as
        # the current value), then do nothing
        if self.is_cut == value:
            return

        history = CutHistory.objects.create(
            ballkid=self,
            year=now.year,
            time=now,
            furthest_day=now.strftime("%A"),
            is_cut=value,
            num_years_experience=self.num_years_experience,
        )
        history.save()

    def set_field(self, field, value):
        """
        Sets corresponding field to the value provided. Calls specialty handle
        functions as relevant (e.g. handle_checkin_history, handle_team_history)

        Arguments:
        field(str): String representation of the field that needs updating
        value: Value that the field should get set to. Variable type depending
        on the field that is getting updated

        Raises:
        Exception if the field string is not recognized / supported
        """
        logger.info(
            f"Updating ballkid {self.get_name()} field {field} with value {value}"
        )

        if field == "is_checked_in":
            self.handle_checkin_history(value)
            self.is_checked_in = value
        elif field == "position":
            self.position = value
        elif field == "finals_position":
            self.finals_position = value
        elif field == "preferred_position":
            self.preferred_position = value
        elif field == "current_team":
            self.handle_team_history(value)
            self.handle_captain_history_team(value)
            self.current_team = value
        elif field == "finals_team":
            self.finals_team = value
        elif field == "is_active":
            self.is_active = value
        elif field == "is_cut":
            self.handle_cut_history(value)
            self.is_cut = value
        elif field == "cut_status":
            self.cut_status = value
        elif field == "is_captain":
            self.handle_captain_history_captain(value)
            self.is_captain = value
        elif field == "comments":
            self.comments = value
        else:
            raise Exception(f"Unrecognized field {field}")

        self.save()
        self.recalc_analytics()

    def get_name(self):
        """
        Returns ballkid's full name
        """
        return f"{self.first_name} {self.last_name}"

    def get_preferred_position(self):
        """
        Returns the ballkid's preferred position
        """
        if (
            self.preferred_position == Position.BN
            or self.preferred_position == Position.B
        ):
            return Position.B
        elif (
            self.preferred_position == Position.NB
            or self.preferred_position == Position.N
        ):
            return Position.N

    def validate(self):
        """
        Check that the state of the ballkid is valid. Mutates the ballkid to ensure that
            - If the ballkid is inactive or cut, ballkid is not checked in
            - If the ballkid is checked out, ballkid is not assigned to a team
            - If the ballkid is checked out or unassigned, ballkid's position is reset to the preferred position
            - If the ballkid is unassigned for finals, ballkid's finals position is reset to the preferred position
            - Ballkid's actual position can only be back or net
        """
        # Ballkid cannot be checked in if cut or inactive
        if not self.is_active or self.is_cut:
            self.set_field("is_checked_in", False)

        # Ballkid cannot be assigned to a team if not checked in
        if not self.is_checked_in:
            self.set_field("current_team", 0)

        # Reset the position to the preferred position
        if self.current_team == 0:
            self.set_field("position", self.get_preferred_position())

        # Reset the position to the preferred position
        if self.finals_team == "":
            self.set_field("finals_position", self.get_preferred_position())

        self.save()

    def __str__(self):
        return self.get_name()


class FinalsHistory(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    year = models.IntegerField()
    match_type = models.CharField(max_length=20, choices=MATCH_TYPE.choices)
    num_years_experience = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.ballkid.get_name()} worked {self.match_type} for finals in {self.year}"


class CutHistory(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    time = models.DateTimeField(default=datetime.now)
    year = models.IntegerField()
    furthest_day = models.CharField(max_length=10, choices=DAY_OF_WEEK.choices)
    is_cut = models.BooleanField(default=True)
    num_years_experience = models.IntegerField(default=0)
    self_cut = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.ballkid.get_name()} made it to {self.furthest_day} in {self.year} (self-cut: {self.self_cut})"


class CheckinAnalytics(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    duration = models.DurationField(default=timedelta)

    def __str__(self):
        return f"{self.ballkid.get_name()} with total checkin time {self.duration}"


class CheckinHistory(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    checkin = models.DateTimeField(default=datetime.now)
    checkout = models.DateTimeField(null=True)
    duration = models.DurationField(default=timedelta)

    def __str__(self):
        return f"{self.ballkid.get_name()} checked in at {self.checkin} and checked out at \
            {self.checkout} (total duration: {self.duration})"


class CaptainHistory(models.Model):
    captain = models.ForeignKey(
        Ballkid, on_delete=models.CASCADE, related_name="captainhistory_captain"
    )
    ballkid = models.ForeignKey(
        Ballkid, on_delete=models.CASCADE, related_name="captainhistory_ballkid"
    )
    start = models.DateTimeField(default=datetime.now)
    end = models.DateTimeField(null=True)
    duration = models.DurationField(default=timedelta)
    team = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.ballkid.get_name()} had captain {self.captain.get_name()} on starting at {self.start}"


class CaptainAnalytics(models.Model):
    ballkid = models.ForeignKey(
        Ballkid, on_delete=models.CASCADE, related_name="captainanalytics_ballkid"
    )
    captain = models.ForeignKey(
        Ballkid, on_delete=models.CASCADE, related_name="captainanalytics_captain"
    )
    count = models.IntegerField(default=0)
    duration = models.DurationField(default=timedelta)

    def __str__(self):
        return f"{self.ballkid.get_name()} has had captain {self.captain.get_name()} {self.count} times with a total time of {self.duration}"


class TeamHistory(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    team = models.IntegerField(default=0)
    start = models.DateTimeField(default=datetime.now)
    end = models.DateTimeField(null=True)
    duration = models.DurationField(default=timedelta)

    def __str__(self):
        return f"{self.ballkid.get_name()} on team {self.team} starting at {self.start} and ending at {self.end}"


class CourtAnalytics(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    court = models.CharField(max_length=10, choices=Court.choices)
    count = models.IntegerField(default=0)
    duration = models.DurationField(default=timedelta)

    def __str__(self):
        return f"{self.ballkid.get_name()} has been on {self.court} {self.count} times with a total time of {self.duration}"
