from api.models.ballkid import *
from api.utils.consts import *

from django.db.models import Q

from datetime import date
import math
import random


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


def get_previous_teammates(ballkid_ids):
    """
    Returns a dict mapping ballkid_id -> set of teammate ballkid ids,
    representing everyone who shared a team with that ballkid on the most
    recent day strictly before today that they have a TeamHistory entry
    for. Used as a soft constraint when auto-generating teams so ballkids
    aren't repeatedly placed with the same teammates day after day.
    """
    histories = TeamHistory.objects.filter(
        ballkid_id__in=ballkid_ids,
        start__date__lt=date.today(),
    ).order_by("ballkid_id", "-start")

    # Step 1: find each ballkid's most recent team + day they were on
    latest_start = {}
    latest_team = {}
    for history in histories:
        bid = history.ballkid_id
        if bid not in latest_start:
            latest_start[bid] = history.start
            latest_team[bid] = history.team

    # Step 2: group ballkids by (team, day) so everyone sharing a (team,
    # day) can be looked up with one query per distinct pair, rather than
    # one query per ballkid
    by_team_day = {}
    for bid, start in latest_start.items():
        key = (latest_team[bid], start.date())
        by_team_day.setdefault(key, []).append(bid)

    previous_teammates = {bid: set() for bid in latest_start}

    for (team, day), bids_that_day in by_team_day.items():
        teammates_that_day = set(
            TeamHistory.objects.filter(team=team, start__date=day).values_list(
                "ballkid_id", flat=True
            )
        )
        for bid in bids_that_day:
            previous_teammates[bid] = teammates_that_day - {bid}

    return previous_teammates


class Team:
    def __init__(self, num):
        self.number = num
        self.ballkids = {position: [] for position in [POSITION.N, POSITION.B]}
        self.experienced = {position: [] for position in [POSITION.N, POSITION.B]}
        self.captain_ids = set()
        self.member_ids = set()

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

        self.member_ids.add(ballkid.id)

    def move_to_position(self, ballkid, new_position):
        """
        Re-buckets a ballkid already on this team from their current
        position to new_position, updating both the ballkids and
        experienced tracking to match, and mutating ballkid.position itself
        so the change is picked up when the caller saves it. Used to nudge
        a team's Net/Back split toward target ratios by flipping a
        "switcher" (someone whose preferred_position is Back/Net or
        Net/Back) rather than moving anyone locked into a single position.
        """
        old_position = ballkid.position

        if ballkid in self.ballkids[old_position]:
            self.ballkids[old_position].remove(ballkid)
        if ballkid in self.experienced[old_position]:
            self.experienced[old_position].remove(ballkid)

        ballkid.position = new_position
        self.ballkids[new_position].append(ballkid)

        if (
            ballkid.is_captain
            or ballkid.is_chairperson
            or ballkid.num_years_experience > SUPERVET_THRESHOLD
            or (ballkid.is_out_of_town and ballkid.num_years_experience > 0)
        ):
            self.experienced[new_position].append(ballkid)

    def __repr__(self):
        return str(
            [
                f"{ballkid.first_name} {ballkid.last_name}"
                for ballkid in self.get_ballkids()
            ]
        )


class TeamsGenerator:
    # Program's preferred Net count for each common team size (the rest are
    # Backs). Only tuned for the sizes actually used -- 8, 9, 10 -- since
    # teams shouldn't go above 10. Sizes outside this map are left as
    # whatever the normal placement produces.
    TARGET_NET_COUNT_BY_TEAM_SIZE = {8: 3, 9: 3, 10: 4}

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

    def get_eligible_teams(self, avoid_captain_ids=None, avoid_teammate_ids=None, restrict_to=None):
        """
        Returns the list of teams whose captain(s) don't overlap with
        avoid_captain_ids and whose current members don't overlap with
        avoid_teammate_ids. Both are soft constraints: if every team
        conflicts (e.g. not enough distinct captains/teammates to go
        around), falls back to the full list of teams rather than
        returning nothing.

        restrict_to(list[Team]): if provided, only consider teams within this
        list (e.g. teams sharing an on-court schedule "cohort") instead of
        every team.
        """
        pool = restrict_to if restrict_to is not None else self.teams

        if not avoid_captain_ids and not avoid_teammate_ids:
            return pool

        def is_eligible(team):
            if avoid_captain_ids and (team.captain_ids & avoid_captain_ids):
                return False
            if avoid_teammate_ids and (team.member_ids & avoid_teammate_ids):
                return False
            return True

        eligible = [team for team in pool if is_eligible(team)]

        return eligible if eligible else pool

    def get_smallest_team(
        self,
        position=None,
        max_size=None,
        avoid_captain_ids=None,
        avoid_teammate_ids=None,
        restrict_to=None,
    ):
        """
        Returns the smallest team in the list of teams.

        Arguments:
        position(str): If position is not None, then returns the team with the fewest
        number of ballkids at that position
        max_size(int): if max_size is not None, then will not return a team which already
        has the max number of ballkids
        avoid_captain_ids(set): if provided, prefer teams whose captain(s) don't overlap
        with this set (soft constraint - falls back to all teams if none qualify)
        avoid_teammate_ids(set): if provided, prefer teams whose current members don't
        overlap with this set (soft constraint - falls back to all teams if none qualify)
        restrict_to(list[Team]): if provided, only choose among these teams

        Ties are broken randomly rather than by list order -- otherwise, e.g. when every
        team is still empty, "smallest team" would always resolve to the same team every
        time this is called, making early placements (shift groups, the first captains)
        fully deterministic run to run instead of spread out.
        """
        candidate_teams = self.get_eligible_teams(
            avoid_captain_ids, avoid_teammate_ids=avoid_teammate_ids, restrict_to=restrict_to
        )

        smallest_size = min(team.size() for team in candidate_teams)
        smallest_team = random.choice(
            [team for team in candidate_teams if team.size() == smallest_size]
        )

        smallest_position_size = min(
            team.size(position) for team in candidate_teams
        )
        smallest_position_team = random.choice(
            [
                team
                for team in candidate_teams
                if team.size(position) == smallest_position_size
            ]
        )

        # If the smallest position team is already too large, then return the
        # smallest team instead
        if max_size and smallest_position_team.size() >= max_size:
            return smallest_team

        return smallest_position_team

    def get_team_without_experienced_position(
        self, position, avoid_captain_ids=None, avoid_teammate_ids=None
    ):
        candidate_teams = self.get_eligible_teams(
            avoid_captain_ids, avoid_teammate_ids=avoid_teammate_ids
        )
        eligible_teams = [
            team for team in candidate_teams if not team.has_experienced(position)
        ]
        return eligible_teams[0] if len(eligible_teams) > 0 else None

    def create_teams(self, shift_groups=None, team_cohorts=None):
        """
        Creates teams as a list of populated Team objects, satisfying the criteria that:
        - Each team needs at least one captain or chairperson
        - Each team at each position needs at least one captain/chairperson/supervet/
        out-of-town non-rookie
        - Balance experience
        - Randomize so the same person doesn't always get the same team / captain
        - Follows pre-defined order of team strength if relevant (>= 10 teams)
        - Ideally ballkids are assigned to their preferred position
        - Ballkids in the same shift_groups entry all land on teams within the same
        on-court "cohort" (see team_cohorts below), so they end up on-court and
        off-court at the same times as each other, even if not on the literal
        same team -- this takes priority over the balancing heuristics below for
        that group's cohort choice, but individual members are still placed with
        normal position/experience balancing within that cohort

        Arguments:
        shift_groups: optional iterable of iterables of Ballkid instances (or
        ids). Each inner group is placed together into a single cohort of teams
        before anything else is assigned, then excluded from the normal
        per-person passes so no one is placed twice. This is a hard constraint
        (unlike the soft constraints elsewhere in this algorithm) -- group
        cohesion wins over balance, though only checked-in members of a group
        are considered, so a group where someone didn't show up still places
        whoever did.

        team_cohorts: optional iterable of iterables of team numbers, where
        each inner list is a set of team numbers that share an identical
        on-court/off-court schedule for the day (derived from that day's
        actual Schedule rows by the caller -- this module has no knowledge of
        scheduling itself). If omitted (e.g. no schedule exists yet for the
        day), every team is treated as its own cohort of one, which falls
        back to the old "whole group on one exact team" behavior.

        General algorithm:
        - Let us consider 3 disjoint sets of ballkids, fully covering the space of checked
        in ballkids: captains/chairpeople, supervets (> 3 years experience OR out of town
        non-rookies), and all else.
        - First place any shift_groups: pick whichever cohort of teams currently has the
        fewest ballkids overall, then place each group member individually onto the
        smallest/best-fit team within just that cohort.
        - Then go through captains (randomly ordered) at each position (net and back) and
        assign them to a team in priority order.
        - Then go through supervets and assign them to any teams that don't have an experienced
        ballkid at both positions yet. If all teams have experience at both positions, then
        assign them to the team with the fewest ballkids at their preferred position.
        - Finally go through all ballkids. Assign them to the smallest team at their preferred
        position or if that team is already maxed out, then the smallest team in general
        """
        all = Ballkid.objects.filter(is_checked_in=True)
        max_ballkids_per_team = math.ceil(len(all) / len(self.teams))

        all_by_id = {b.id: b for b in all}
        grouped_ids = set()

        teams_by_number = {team.number: team for team in self.teams}

        if team_cohorts:
            cohorts = [
                [teams_by_number[n] for n in cohort if n in teams_by_number]
                for cohort in team_cohorts
            ]
            cohorts = [c for c in cohorts if c]  # drop any that resolved empty
        else:
            # No schedule info available -- each team is its own cohort of
            # one, reproducing the old "whole group on one exact team"
            # behavior as a fallback.
            cohorts = [[team] for team in self.teams]

        if shift_groups:
            # Larger groups first, so they get first pick of the
            # least-loaded cohort while there's still the most room to
            # balance everyone else afterward. Shuffle first so groups of
            # the same size aren't always processed in the same (database)
            # order.
            shuffled_groups = list(shift_groups)
            random.shuffle(shuffled_groups)
            for group in sorted(shuffled_groups, key=lambda g: len(list(g)), reverse=True):
                member_ids = [
                    (member.id if hasattr(member, "id") else member)
                    for member in group
                ]
                # Only checked-in members can actually be placed; someone who
                # didn't check in today simply isn't part of the assignment.
                members = [
                    all_by_id[mid] for mid in member_ids if mid in all_by_id
                ]
                if not members:
                    continue

                # Pick whichever cohort currently has the fewest people
                # overall, so groups don't pile onto one lucky cohort.
                least_loaded_cohort = min(
                    cohorts, key=lambda cohort: sum(t.size() for t in cohort)
                )

                for member in members:
                    team = self.get_smallest_team(
                        position=member.position, restrict_to=least_loaded_cohort
                    )
                    team.add_ballkid(member)
                    grouped_ids.add(member.id)

        captains = all.exclude(id__in=grouped_ids).filter(
            Q(is_chairperson=True) | Q(is_captain=True)
        )
        supervets = list(
            all.exclude(id__in=captains)
            .exclude(id__in=grouped_ids)
            .filter(num_years_experience__gt=0)
            .filter(
                Q(num_years_experience__gt=SUPERVET_THRESHOLD) | Q(is_out_of_town=True)
            )
            .order_by("?")
        )

        ballkids = list(
            all.exclude(id__in=captains)
            .exclude(id__in=[s.id for s in supervets])
            .exclude(id__in=grouped_ids)
            .order_by("-num_years_experience", "?")
        )

        # Soft constraints: avoid placing a ballkid with the same captain or
        # any of the same teammates they had on their most recent previous
        # day, where possible
        previous_captains = get_previous_captains(
            [b.id for b in supervets] + [b.id for b in ballkids]
        )
        previous_teammates = get_previous_teammates(
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
            avoid_teammate_ids = previous_teammates.get(supervet.id, set())

            team = self.get_team_without_experienced_position(
                supervet.position,
                avoid_captain_ids=avoid_captain_ids,
                avoid_teammate_ids=avoid_teammate_ids,
            )
            if team is None:
                team = self.get_smallest_team(
                    supervet.position,
                    max_size=max_ballkids_per_team,
                    avoid_captain_ids=avoid_captain_ids,
                    avoid_teammate_ids=avoid_teammate_ids,
                )

            team.add_ballkid(supervet)

        for ballkid in ballkids:
            avoid_captain_ids = previous_captains.get(ballkid.id, set())
            avoid_teammate_ids = previous_teammates.get(ballkid.id, set())

            team = self.get_smallest_team(
                ballkid.position,
                max_size=max_ballkids_per_team,
                avoid_captain_ids=avoid_captain_ids,
                avoid_teammate_ids=avoid_teammate_ids,
            )
            team.add_ballkid(ballkid)

        self.balance_switchers()

        return self.teams

    def balance_switchers(self):
        """
        Best-effort pass, run after normal placement: nudges each team's
        Net/Back split toward TARGET_NET_COUNT_BY_TEAM_SIZE by re-assigning
        a "switcher" already on that team (preferred_position of Back/Net
        or Net/Back) from the overrepresented position to the
        underrepresented one. This is a soft adjustment -- if a team has no
        switcher available in the direction needed, its imbalance is left
        as-is rather than moving someone locked into a single position.
        """
        for team in self.teams:
            target_nets = self.TARGET_NET_COUNT_BY_TEAM_SIZE.get(team.size())
            if target_nets is None:
                continue

            net_deficit = target_nets - team.size(POSITION.N)

            if net_deficit > 0:
                self._shift_switchers(team, POSITION.B, POSITION.N, net_deficit)
            elif net_deficit < 0:
                self._shift_switchers(team, POSITION.N, POSITION.B, -net_deficit)

    def _shift_switchers(self, team, frm, to, count):
        switchers = [
            ballkid
            for ballkid in team.ballkids[frm]
            if ballkid.preferred_position in (POSITION.BN, POSITION.NB)
        ]
        random.shuffle(switchers)

        for switcher in switchers[:count]:
            team.move_to_position(switcher, to)

    def __repr__(self):
        return str([team for team in self.teams])
