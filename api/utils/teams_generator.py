from api.models.ballkid import *
from api.utils.consts import *

from django.db.models import Q

from datetime import date
import math


def get_previous_captains(ballkid_ids):
    """
    Returns a dict mapping ballkid_id -> set of captain ids, representing the
    captain(s) each ballkid had on the most recent day strictly before today
    that they have a CaptainHistory entry for. Used as a soft constraint when
    auto-generating teams so ballkids aren't repeatedly placed under the same
    captain day after day.
    """
    histories = CaptainHistory.objects.filter(
        ballkid_id__in=ballkid_ids,
        start__date__lt=date.today(),
    ).order_by("ballkid_id", "-start")

    previous_captains = {}
    latest_start = {}

    for history in histories:
        bid = history.ballkid_id

        # First entry seen per ballkid (since ordered by -start) is their
        # most recent captain assignment
        if bid not in latest_start:
            latest_start[bid] = history.start
            previous_captains[bid] = set()

        # Include every captain assigned at that same moment, in case the
        # ballkid had co-captains on their most recent team
        if history.start == latest_start[bid]:
            previous_captains[bid].add(history.captain_id)

    return previous_captains


class Team:
    def __init__(self, num):
        self.number = num
        self.ballkids = {position: [] for position in [POSITION.N, POSITION.B]}
        self.experienced = {position: [] for position in [POSITION.N, POSITION.B]}
        self.captain_ids = set()

    def get_number(self):
        return self.number

    def get_ballkids(self):
        return self.ballkids[POSITION.N] + self.ballkids[POSITION.B]

    def size(self, position=None):
        if position is None:
            return len(self.get_ballkids())
        else:
            return len(self.ballkids[position])

    def has_experienced(self, position):
        return len(self.experienced[position]) > 0

    def add_ballkid(self, ballkid):
        position = ballkid.position

        self.ballkids[position].append(ballkid)

        # A ballkid qualifies as experienced if a captain, chair, supervet (> 3
        # years experience), or out-of-town non-rookie
        if (
            ballkid.is_captain
            or ballkid.is_chairperson
            or ballkid.num_years_experience > SUPERVET_THRESHOLD
            or (ballkid.is_out_of_town and ballkid.num_years_experience > 0)
        ):
            self.experienced[position].append(ballkid)

        if ballkid.is_captain:
            self.captain_ids.add(ballkid.id)

    def __repr__(self):
        return str(
            [
                f"{ballkid.first_name} {ballkid.last_name}"
                for ballkid in self.get_ballkids()
            ]
        )


class TeamsGenerator:
    def __init__(self, num_teams):
        # If number of teams is less than 10, then naively create an order
        if num_teams < len(TEAMS_STRENGTH_ORDER):
            self.teams = [Team(i + 1) for i in range(num_teams)]

        # Otherwise if number of teams is >= 10, then use predefined strength order
        # and tack on extra teams at the end
        else:
            self.teams = [
                Team(i)
                for i in TEAMS_STRENGTH_ORDER
                + [
                    i + len(TEAMS_STRENGTH_ORDER) + 1
                    for i in range(num_teams - len(TEAMS_STRENGTH_ORDER))
                ]
            ]

    def get_eligible_teams(self, avoid_captain_ids=None):
        """
        Returns the list of teams whose captain(s) don't overlap with
        avoid_captain_ids. This is a soft constraint: if every team conflicts
        (e.g. there aren't enough distinct captains to go around), falls back
        to the full list of teams rather than returning nothing.
        """
        if not avoid_captain_ids:
            return self.teams

        eligible = [
            team
            for team in self.teams
            if not (team.captain_ids & avoid_captain_ids)
        ]

        return eligible if eligible else self.teams

    def get_smallest_team(self, position=None, max_size=None, avoid_captain_ids=None):
        """
        Returns the smallest team in the list of teams.

        Arguments:
        position(str): If position is not None, then returns the team with the fewest
        number of ballkids at that position
        max_size(int): if max_size is not None, then will not return a team which already
        has the max number of ballkids
        avoid_captain_ids(set): if provided, prefer teams whose captain(s) don't overlap
        with this set (soft constraint - falls back to all teams if none qualify)
        """
        candidate_teams = self.get_eligible_teams(avoid_captain_ids)

        # Keep track of both the smallest team and the team with the fewest ballkids at
        # the position of interest
        smallest_team = candidate_teams[0]
        smallest_position_team = candidate_teams[0]

        for team in candidate_teams:
            # Update smallest team
            if team.size() < smallest_team.size():
                smallest_team = team

            # Update team with the fewest ballkids at position of interest
            if team.size(position) < smallest_position_team.size(position):
                smallest_position_team = team

        # If the smallest position team is already too large, then return the
        # smallest team instead
        if max_size and smallest_position_team.size() >= max_size:
            return smallest_team

        return smallest_position_team

    def get_team_without_experienced_position(self, position, avoid_captain_ids=None):
        candidate_teams = self.get_eligible_teams(avoid_captain_ids)
        eligible_teams = [
            team for team in candidate_teams if not team.has_experienced(position)
        ]
        return eligible_teams[0] if len(eligible_teams) > 0 else None

    def create_teams(self):
        """
        Creates teams as a list of populated Team objects, satisfying the criteria that:
        - Each team needs at least one captain or chairperson
        - Each team at each position needs at least one captain/chairperson/supervet/
        out-of-town non-rookie
        - Balance experience
        - Randomize so the same person doesn't always get the same team / captain
        - Follows pre-defined order of team strength if relevant (>= 10 teams)
        - Ideally ballkids are assigned to their preferred position

        General algorithm:
        - Let us consider 3 disjoint sets of ballkids, fully covering the space of checked
        in ballkids: captains/chairpeople, supervets (> 3 years experience OR out of town
        non-rookies), and all else.
        - First go through captains (randomly ordered) at each position (net and back) and
        assign them to a team in priority order.
        - Then go through supervets and assign them to any teams that don't have an experienced
        ballkid at both positions yet. If all teams have experience at both positions, then
        assign them to the team with the fewest ballkids at their preferred position.
        - Finally go through all ballkids. Assign them to the smallest team at their preferred
        position or if that team is already maxed out, then the smallest team in general
        """
        all = Ballkid.objects.filter(is_checked_in=True)
        max_ballkids_per_team = math.ceil(len(all) / len(self.teams))

        captains = all.filter(Q(is_chairperson=True) | Q(is_captain=True))
        supervets = list(
            all.exclude(id__in=captains)
            .filter(num_years_experience__gt=0)
            .filter(
                Q(num_years_experience__gt=SUPERVET_THRESHOLD) | Q(is_out_of_town=True)
            )
            .order_by("?")
        )

        ballkids = list(
            all.exclude(id__in=captains)
            .exclude(id__in=[s.id for s in supervets])
            .order_by("?")
            .order_by("-num_years_experience")
        )

        # Soft constraint: avoid placing a ballkid with the same captain they
        # had on their most recent previous day, where possible
        previous_captains = get_previous_captains(
            [b.id for b in supervets] + [b.id for b in ballkids]
        )

        # Do not restart team_counter to 0 inside for loop to maximize likelihood
        # that all teams have at least 1 captain
        team_counter = 0

        for pos in [POSITION.N, POSITION.B]:
            # Get all captains at that position and shuffle them
            position_captains = captains.filter(position=pos).order_by("?")

            # For each captain, assign them to a team
            for captain in position_captains:
                team = self.teams[team_counter]
                team.add_ballkid(captain)

                # Increment team counter
                team_counter = (team_counter + 1) % len(self.teams)

        for supervet in supervets:
            avoid_captain_ids = previous_captains.get(supervet.id, set())

            team = self.get_team_without_experienced_position(
                supervet.position, avoid_captain_ids=avoid_captain_ids
            )
            if team is None:
                team = self.get_smallest_team(
                    supervet.position,
                    max_size=max_ballkids_per_team,
                    avoid_captain_ids=avoid_captain_ids,
                )

            team.add_ballkid(supervet)

        for ballkid in ballkids:
            avoid_captain_ids = previous_captains.get(ballkid.id, set())

            team = self.get_smallest_team(
                ballkid.position,
                max_size=max_ballkids_per_team,
                avoid_captain_ids=avoid_captain_ids,
            )
            team.add_ballkid(ballkid)

        return self.teams

    def __repr__(self):
        return str([team for team in self.teams])
