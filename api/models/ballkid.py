from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField

from datetime import datetime, timedelta

from phonenumber_field.modelfields import PhoneNumberField

from api.models.enums import *
from api.models.schedule import Tournament
from api.utils.utils import *
from api.utils.consts import *

import logging

logger = logging.getLogger("api.ballkid")


class Ballkid(models.Model):
    # Ballkid static information
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, blank=True, null=True, related_name="ballkid"
    )
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    age = models.IntegerField(default=0)
    image = models.CharField(max_length=100, default=DEFAULT_IMAGE_FILE, blank=True)
    phone = PhoneNumberField(null=True, blank=True)
    emergency_name = models.CharField(max_length=160, blank=True, null=True)
    emergency_phone = PhoneNumberField(null=True, blank=True)
    num_years_experience = models.IntegerField(default=0)
    is_out_of_town = models.BooleanField(default=False)
    is_captain = models.BooleanField(default=False)
    is_chairperson = models.BooleanField(default=False)
    preferred_position = models.CharField(
        max_length=10, choices=POSITION.choices, default=POSITION.B
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
    finals_team = models.CharField(
        max_length=20, choices=MATCH_TYPE.choices, blank=True
    )
    position = models.CharField(
        max_length=10, choices=POSITION.choices, default=POSITION.B
    )
    finals_position = models.CharField(
        max_length=10, choices=POSITION.choices, default=POSITION.B
    )

    # Comments / misc info
    num_tickets = models.IntegerField(default=0)
    last_day = models.CharField(
        max_length=10, choices=DAY_OF_WEEK.choices, null=True, blank=True
    )
    checkout_comments = models.CharField(
        max_length=10, choices=CHECKOUT_TIMES.choices, null=True, blank=True
    )
    comments = models.TextField(default="", blank=True)

    # TODO: consider adding this in the future but need to
    # figure out how to make it play nicely with update
    # class Meta:
    #     unique_together = (
    #         "first_name",
    #         "last_name",
    #     )

    def handle_checkin_history(self, value, now=None):
        """
        Handle logic for saving checkin history and recalculating total amount of time the
        ballkid is checked in.

        Arguments:
        value(bool): New checkin status that the ballkid is getting set to. True if the ballkid
        is getting checked in and False if the ballkid is getting checked out
        """
        logger.info(f"[handle_checkin_history] ballkid {self.id}, value {value}")

        if now is None:
            now = datetime.now()

        # If no change to field value (trying to set the field to the same as
        # the current value), then do nothing
        if self.is_checked_in == value:
            return

        # If checking in, create new checkin history row
        if value:
            now_date = (now - timedelta(hours=CHECKIN_START_HOUR)).date()
            is_first_checkin = (
                CheckinHistory.objects.filter(
                    ballkid=self,
                    start__startswith=now_date,
                ).count()
                == 0
            )

            history = CheckinHistory.objects.create(
                ballkid=self, start=now, is_first_checkin=is_first_checkin
            )
            history.save()

        # If checking out, update most recent checkin history row
        else:
            histories = CheckinHistory.objects.filter(ballkid=self)
            if histories.count() > 0:
                history = histories.order_by("-start").first()
                history.end = now
                if history.end < history.start:
                    raise Exception(
                        f"Checkout time {history.end} is before checkin time {history.start}"
                    )
                history.duration = history.end - history.start
                history.save()

    def handle_team_history(self, value, now=None):
        """
        Handle logic for saving team history.

        Arguments:
        value(int): New team assignment that the ballkid is getting set to. 0 if the ballkid
        is getting unassigned, and otherwise is a positive int
        """
        logger.info(f"[handle_team_history] ballkid {self.id}, value {value}")

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
        logger.info(f"[handle_captain_history_team] ballkid {self.id}, value {value}")

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
                ballkids = Ballkid.objects.filter(
                    current_team=self.current_team
                ).exclude(id=self.id)

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
        logger.info(
            f"[handle_captain_history_captain] ballkid {self.id}, value {value}"
        )

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

    def handle_cut_history(self, value, self_cut=False, now=None):
        """
        Handle logic for saving cut history.

        Arguments:
        value(bool): True if the ballkid is getting cut, False if ballkid is
        getting uncut
        now(datetime): Optional argument for supplying a manual datetime at
        which the ballkid was cut
        """
        logger.info(
            f"[handle_cut_history] ballkid {self.id}, value {value}, self_cut {self_cut}"
        )

        if now is None:
            # This assumes that ballkids are cut before the start of matches
            # (assumed to be 10am) the following day. If a ballkid is cut at
            # 2am on Thursday, then it will indicate that the furthest day is
            # Wednesday (time does not matter for cut history)
            now = datetime.now() - timedelta(hours=MATCHES_START_HOUR)

        # If no change to field value (trying to set the field to the same as
        # the current value), then do nothing
        if self.is_cut == value:
            return

        if value:
            history, created = CutHistory.objects.update_or_create(
                ballkid=self,
                year=now.year,
                defaults={
                    "furthest_date": now.strftime(HYPHEN_YEAR_MONTH_DAY_FORMAT_STR),
                    "furthest_day": now.strftime(WEEKDAY_FORMAT_STR),
                    "self_cut": self_cut,
                },
            )
            logger.info(f"[handle_cut_history] Created {created} cut history {history}")
        else:
            num_deleted, elems = CutHistory.objects.filter(
                ballkid=self, year=now.year
            ).delete()
            logger.info(
                f"[handle_cut_history] Deleted {num_deleted} cut history entries: {elems}"
            )

    def handle_finals_history_team(self, value, show_teams, now=None):
        # If finals teams are not public, then don't create/update any
        # finals history for any teams
        if not show_teams:
            return

        # If no change, then return early
        if self.finals_team == value:
            return

        if now is None:
            now = datetime.now()
        current_year = get_current_year()

        # Filter to any existing finals history which has the current year
        # TODO: consider changing this to filter on ballkid and match type
        histories = FinalsHistory.objects.filter(
            ballkid=self, years__contains=[current_year]
        )
        if histories.count() > 1:
            raise Exception(
                f"Found multiple histories {histories} for ballkid {self} containing year {current_year}"
            )

        # Remove old finals history item because ballkid has been unassigned
        # from the previous finals history
        if histories.count() > 0:
            history = histories[0]
            if history.count == 1:
                history.delete()
            else:
                history.count -= 1
                history.years.remove(current_year)
                history.save()

        # If assigning a new finals team to the ballkid, then update finals
        # history with a new row
        if value != "":
            history, created = FinalsHistory.objects.get_or_create(
                ballkid=self,
                match_type=value,
                defaults={"count": 0, "years": []},
            )
            history.count += 1
            history.years.append(current_year)
            history.save()

    def handle_finals_history_hideshow(self, value, now=None):
        if now is None:
            now = datetime.now()
        current_year = get_current_year()

        # If no finals team assigned to the ballkid, then don't
        # do anything and return early
        if self.finals_team == "":
            return

        # If the ballkid has an assigned finals team and showing teams,
        # then create a finals history entry with the finals team assigned
        if value:
            history, created = FinalsHistory.objects.get_or_create(
                ballkid=self,
                match_type=self.finals_team,
                defaults={"count": 0, "years": []},
            )
            history.count += 1
            history.years.append(current_year)
            logger.info(
                f"[handle_finals_history_hideshow] Finals history created {created} for ballkid {self}: {history}"
            )
            history.save()

        # If hiding teams, then delete the current year from the
        # ballkid's finals history
        else:
            # Filter to any existing finals history which has the current year
            # TODO: consider changing this to filter on ballkid and match type
            histories = FinalsHistory.objects.filter(
                ballkid=self, years__contains=[current_year]
            )
            if histories.count() > 1:
                logger.warn(
                    f"[handle_finals_history_hideshow] Found multiple histories {histories} for ballkid {self} containing year {current_year}"
                )

            # Remove old finals history item because ballkid has been unassigned
            # from the previous finals history
            if histories.count() == 1:
                history = histories[0]
                if history.count == 1:
                    logger.info(
                        f"[handle_finals_history_hideshow] Deleting history {history} due to hiding finals teams"
                    )
                    history.delete()
                else:
                    logger.info(
                        f"[handle_finals_history_hideshow] Removing {current_year} from history {history} due to hiding finals teams"
                    )
                    history.count -= 1
                    history.years.remove(current_year)
                    history.save()

    def set_field(self, field, value, self_cut=False):
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

            # Reset the checkout time comments if ballkid is checked in and
            # getting checked out
            if self.is_checked_in and not value:
                logger.info(
                    f"[validate] ballkid {self.id} checkout time comments reset to empty"
                )
                self.set_field("checkout_comments", None)

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
            show_teams = Tournament.objects.get(
                year=get_current_year()
            ).show_finals_teams
            self.handle_finals_history_team(value, show_teams)

            self.finals_team = value

        elif field == "is_active":
            self.is_active = value

        elif field == "is_cut":
            self.handle_cut_history(value, self_cut=self_cut)
            self.is_cut = value

        elif field == "cut_status":
            self.cut_status = value

        elif field == "is_captain":
            self.handle_captain_history_captain(value)
            self.is_captain = value

        elif field == "comments":
            self.comments = value

        elif field == "checkout_comments":
            self.checkout_comments = value

        elif field == "last_day":
            self.last_day = value
            self.cut_status = ""

        elif field == "num_tickets":
            self.num_tickets = value

        else:
            raise Exception(f"Unrecognized field {field}")

        self.save()

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
            self.preferred_position == POSITION.BN
            or self.preferred_position == POSITION.B
        ):
            return POSITION.B
        elif (
            self.preferred_position == POSITION.NB
            or self.preferred_position == POSITION.N
        ):
            return POSITION.N

    def validate(self):
        """
        Check that the state of the ballkid is valid. Mutates the ballkid to ensure that
            - If the ballkid is inactive or cut, ballkid is not checked in
            - If the ballkid is checked out, ballkid is not assigned to a team
            - If the ballkid is checked out or unassigned, ballkid's position is reset to the preferred position
            - If the ballkid is unassigned for finals, ballkid's finals position is reset to the preferred position
            - Ballkid's actual position can only be back or net
            - If the ballkid is inactive, reset ballkid's is_cut, cut_status, finals_team, and finals_position (implicitly)
        """
        # If ballkid is inactive, reset the is_cut, cut_status, and finals_team
        if not self.is_active:
            self.set_field("is_cut", False)
            self.set_field("cut_status", "")
            self.set_field("finals_team", "")

        # Ballkid cannot be checked in if cut or inactive
        if not self.is_active or self.is_cut:
            logger.info(
                f"[validate] ballkid {self.id} cannot be checked in if cut or inactive"
            )
            self.set_field("is_checked_in", False)

        # Ballkid cannot be assigned to a team if not checked in
        if not self.is_checked_in:
            logger.info(
                f"[validate] ballkid {self.id} cannot be assigned if not checked in"
            )
            self.set_field("current_team", 0)

        # Reset the position to the preferred position
        if self.current_team == 0:
            logger.info(
                f"[validate] ballkid {self.id} position reset to preferred position"
            )
            self.set_field("position", self.get_preferred_position())

        # Reset the position to the preferred position
        if self.finals_team == "":
            f"[validate] ballkid {self.id} finals position reset to preferred position"
            self.set_field("finals_position", self.get_preferred_position())

        self.save()

    def __str__(self):
        return self.get_name()


class FinalsHistory(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    match_type = models.CharField(max_length=20, choices=MATCH_TYPE.choices)
    count = models.IntegerField()
    years = ArrayField(models.IntegerField(), blank=True, null=True)

    class Meta:
        unique_together = ("ballkid", "match_type")

    def __str__(self):
        return f"{self.ballkid.get_name()} worked {self.match_type} {self.count} times in years {self.years}"


class CutHistory(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    year = models.IntegerField()
    furthest_day = models.CharField(max_length=10, choices=DAY_OF_WEEK.choices)
    furthest_date = models.DateField(null=True)
    self_cut = models.BooleanField(default=False)

    class Meta:
        unique_together = ("ballkid", "year")

    def __str__(self):
        return f"{self.ballkid.get_name()} cut after {self.furthest_day} in {self.year} (self-cut: {self.self_cut})"


class CheckinHistory(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    start = models.DateTimeField(default=datetime.now)
    end = models.DateTimeField(null=True)
    duration = models.DurationField(default=timedelta)
    is_first_checkin = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.ballkid.get_name()} checked in at {self.start} and checked out at {self.end} (total duration: {self.duration})"


class CheckinAnalytics(models.Model):
    ballkid = models.ForeignKey(Ballkid, on_delete=models.CASCADE)
    year = models.IntegerField()
    duration = models.DurationField(default=timedelta)
    count = models.IntegerField(default=0)

    class Meta:
        unique_together = ("ballkid", "year")

    def __str__(self):
        return f"{self.year}: {self.ballkid.get_name()} with total checkin time {self.duration} and total checkin days {self.count}"


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
    year = models.IntegerField()
    count = models.IntegerField(default=0)
    duration = models.DurationField(default=timedelta)

    class Meta:
        unique_together = ("ballkid", "captain", "year")

    def __str__(self):
        return f"{self.year}: {self.ballkid.get_name()} has had captain {self.captain.get_name()} {self.count} times with a total time of {self.duration}"


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
    year = models.IntegerField()
    court = models.CharField(max_length=50, blank=True)
    count = models.IntegerField(default=0)
    duration = models.DurationField(default=timedelta)

    class Meta:
        unique_together = ("ballkid", "court", "year")

    def __str__(self):
        return f"{self.ballkid.get_name()} has been on {self.court} {self.count} times with a total time of {self.duration}"


class Banner(models.Model):
    timestamp = models.DateTimeField(blank=True, null=True)
    message = models.TextField()
    audience = models.CharField(default="all", max_length=20)
    ballkid = models.ForeignKey(
        Ballkid, on_delete=models.CASCADE, null=True, blank=True
    )

    def __str__(self):
        return f"Banner for ({self.audience}, ballkid {self.ballkid}) with message {self.message} at {self.timestamp}"


class Ticket(models.Model):
    year = models.IntegerField()
    session = models.CharField(
        max_length=15,
        choices=TICKET_SESSIONS.choices,
    )
    ballkid = models.ForeignKey(
        Ballkid, on_delete=models.CASCADE, null=True, blank=True
    )
    order = models.IntegerField()
    num_requested = models.IntegerField(default=0)
    num_granted = models.IntegerField(default=0)
    num_delivered = models.IntegerField(default=0)
