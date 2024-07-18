from api.models.ballkid import *
from api.utils.consts import *

from django.db.models import Q

# import random
# import math


# def get_smallest_team(all_teams, court=None):
#     if court is None:
#         teams = {key: val for key, val in all_teams.items()}
#     else:
#         teams = {key: val for key, val in all_teams.items() if key[0] == court}

#     min_key = None
#     min_val = None

#     for key, val in teams.items():
#         if min_val is None or len(val) < len(min_val):
#             min_key = key
#             min_val = val

#     return {"court": min_key[0], "rotation": min_key[1], "count": len(min_val)}


# def get_ballkids_order(ballkids):
#     """
#     Generate order of checked in, unassigned ballkids
#     (random descending years experience with top xx% or
#     xx people randomized)
#     """
#     ballkids = ballkids.order_by("?").order_by("-num_years_experience")
#     num_top = max(NUM_TOP_TO_RANDOMIZE, int(ballkids.count() * PERCENT_TOP_TO_RANDOMIZE))
#     top_ballkids = list(ballkids)[:num_top]
#     random.shuffle(top_ballkids)
#     bottom_ballkids = list(ballkids)[num_top:]

#     ballkids = top_ballkids + bottom_ballkids
#     return ballkids


# def assign_max_experience_courts(teams, max_experience, rotations, avg_ballkids_per_team):
#     # Get order of courts by reverse sort of max experience
#     courts = sorted(max_experience, key=max_experience.get)

#     # For each court with a max experience provided
#     for court in courts:
#         for rotation in rotations:
#             # If team is already full, then continue
#             if len(teams[(court, rotation)]) >= avg_ballkids_per_team - 1:
#                 continue

#             # Get all ballkids already assigned in teams
#             assigned = set(sum(teams.values(), []))

#             # Greedily and randomly assign ballkids with this max experience.
#             # Filter to ballkids with <= max experience who are not yet assigned
#             max_experience_ballkids = list(
#                 set(
#                     Ballkid.objects.filter(
#                         is_checked_in=True,
#                         num_years_experience__lte=max_experience[court],
#                     )
#                 )
#                 - assigned
#             )

#             # If not enough ballkids, then assign as many as possible
#             if len(max_experience_ballkids) < avg_ballkids_per_team:
#                 sampled = max_experience_ballkids

#             # If enough ballkids, randomly choose ballkids
#             else:
#                 sampled = random.sample(max_experience_ballkids, avg_ballkids_per_team)

#             # Assign ballkids to team (court and rotation)
#             teams[(court, rotation)] = sampled

#     return teams


# def assign_remaining_ballkids(teams, ballkids_order, courts_order, avg_ballkids_per_team):
#     # Court index for courts order
#     index = 0

#     for ballkid in ballkids_order:
#         # If ballkid already has a court assigned, continue
#         if any(ballkid in val for val in teams.values()):
#             continue

#         # Keep track of the court index that we start with to break if we
#         # do a full loop
#         start_index = index
#         should_continue = False

#         # While the current court is full, continue on to the next court
#         while (
#             get_smallest_team(teams, courts_order[index])["count"]
#             >= avg_ballkids_per_team
#         ):
#             # Continue to the next court
#             index = (index + 1) % len(courts_order)

#             if index == start_index:
#                 if (
#                     get_smallest_team(teams, courts_order[index])["count"]
#                     >= MAX_BALLKIDS_PER_TEAM
#                 ):
#                     should_continue = True
#                 break

#         if should_continue:
#             continue

#         # Assign court and rotation to the current ballkid
#         court = courts_order[index]
#         rotation = get_smallest_team(teams, court)["rotation"]
#         teams[(court, rotation)].append(ballkid)

#         # Update court index
#         index = (index + 1) % len(courts_order)

#     return teams


# def create_teams(courts, should_recreate, balance_coeff, max_experience):
#     ballkids = Ballkid.objects.filter(is_checked_in=True)
#     rotations = get_rotations(ballkids, courts)
#     avg_ballkids_per_team = math.ceil(ballkids.count() / len(rotations) / len(courts))

#     ballkids_order = get_ballkids_order(ballkids)
#     courts_order = get_courts_order(courts, balance_coeff, max_experience)

#     # Start with empty teams
#     teams = {(court, rotation): [] for court in courts for rotation in rotations}

#     # If not recreating teams, then seed teams with the current
#     # teams for which courts are still active
#     if not should_recreate:
#         for ballkid in Ballkid.objects.exclude(court=""):
#             key = (ballkid.court, ballkid.rotation)
#             if key in teams and len(teams[key]) < avg_ballkids_per_team:
#                 teams[key].append(ballkid)

#     # Assign ballkids to courts with max experience provided
#     teams = assign_max_experience_courts(
#         teams, max_experience, rotations, avg_ballkids_per_team
#     )

#     teams = assign_remaining_ballkids(
#         teams, ballkids_order, courts_order, avg_ballkids_per_team
#     )

#     return teams


# def assign_unassigned():
#     ballkids = Ballkid.objects.filter(is_checked_in=True, current_team=0).order_by(
#         "is_chairperson", "is_captain", "-num_years_experience"
#     )


def create_teams(num):
    teams = {i + 1: [] for i in range(num)}

    all = Ballkid.objects.filter(is_checked_in=True)
    captains = all.filter(Q("is_chairperson") | Q("is_captain"))
    supervets = all.filter(num_years_experience__gt=3)
    ballkids = all.order_by("-num_years_experience")

    for position in [POSITION.N, POSITION.B]:
        all = ballkids.filter(position=position)
        captains = all.filter(is_captain=True)
    nets = ballkids.filter(position=POSITION.N)
    backs = ballkids.filter(position=POSITION.B)
