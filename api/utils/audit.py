"""
Audit log plumbing.

Nothing in the existing views has to change. Three hooks feed ActionLog:

1. Ballkid model signals. Every save is diffed against a snapshot taken when
   the row was loaded, so cuts, cut categories, team / finals-team changes,
   check-in / check-out, captain promotions and archiving are logged no
   matter which view (or management command) caused them.

2. A small patch on DRF's APIView (installed from ApiConfig.ready) that
   remembers the current request, so each log row knows who did it, and
   fires "view events" for things that aren't a plain Ballkid field change
   (Reset Data, Archive All, export, rating deletes, application decisions,
   tournament settings, ...). See VIEW_EVENTS at the bottom.

3. log_action() itself, which you can also call directly from any code.

Bulk operations collapse into one row: when the same action is logged more
than once during a single request (Check out all, Cut all, Archive all, ...)
the extra people are added to that row's `items` and `count` goes up,
instead of writing one row per person.

Logging must never break the real action, so everything here swallows and
logs its own errors.
"""

import contextvars
import logging

from django.db import transaction
from django.db.models.signals import post_init, post_save

logger = logging.getLogger("api.utils")

# action -> (category, label). Single source of truth: the viewer API sends
# these labels to the frontend.
ACTIONS = {
    # cuts
    "ballkid.cut": ("cuts", "Cut"),
    "ballkid.uncut": ("cuts", "Un-cut"),
    "ballkid.cut_status": ("cuts", "Cut category changed"),
    # teams
    "team.assign": ("teams", "Assigned to team"),
    "team.move": ("teams", "Moved to another team"),
    "team.unassign": ("teams", "Unassigned from team"),
    "finals.assign": ("teams", "Assigned to finals team"),
    "finals.move": ("teams", "Moved to another finals team"),
    "finals.unassign": ("teams", "Unassigned from finals team"),
    # check-in
    "ballkid.checkin": ("checkin", "Checked in"),
    "ballkid.checkout": ("checkin", "Checked out"),
    # roster
    "roster.add": ("roster", "Added to roster"),
    "ballkid.promote_captain": ("roster", "Promoted to captain"),
    "ballkid.demote_captain": ("roster", "Demoted from captain"),
    "ballkid.archive": ("roster", "Archived"),
    "ballkid.unarchive": ("roster", "Un-archived"),
    "user.create": ("roster", "Account created"),
    # ratings
    "rating.delete": ("ratings", "Rating deleted"),
    "rating.exclude": ("ratings", "Rating excluded"),
    "rating.unexclude": ("ratings", "Rating un-excluded"),
    # season
    "season.export": ("season", "All data exported"),
    "season.archive_all": ("season", "Archive All"),
    "season.reset_data": ("season", "Reset Data"),
    "tournament.create": ("season", "Tournament created"),
    "tournament.update": ("season", "Tournament settings changed"),
    # applications
    "application.status": ("applications", "Application status changed"),
    "application.promote": ("applications", "Application promoted to ballkid"),
    "application.waitlist_promote": ("applications", "Moved up from waitlist"),
    "application.purge": ("applications", "Unpromoted applications purged"),
    "application.settings": ("applications", "Application settings changed"),
    # tickets
    "ticket.round_delete": ("tickets", "Ticket round deleted"),
    "ticket.round_live": ("tickets", "Ticket round made live"),
    "ticket.round_unlive": ("tickets", "Ticket round taken down"),
}

CATEGORIES = [
    ("cuts", "Cuts"),
    ("teams", "Teams"),
    ("checkin", "Check-in"),
    ("roster", "Roster"),
    ("ratings", "Ratings"),
    ("season", "Season"),
    ("applications", "Applications"),
    ("tickets", "Tickets"),
]

MAX_ITEMS = 500  # cap on names stored per merged row

_current_request = contextvars.ContextVar("audit_current_request", default=None)
_installed = False


def action_label(action):
    return ACTIONS.get(action, ("other", action))[1]


def _actor(request):
    if request is None:
        return None, "system"
    try:
        user = request.user
    except Exception:
        return None, "system"
    if not user or not user.is_authenticated:
        return None, "system"
    return user, (user.get_full_name().strip() or user.get_username())


def log_action(action, target_name="", target_id=None, detail="", merge=True):
    """Record one event. Never raises.

    merge: fold repeats of the same action within one request into a single
    row (used for bulk operations). Pass False for one-off events.
    """
    try:
        from api.models.action_log import ActionLog

        request = _current_request.get()
        actor, actor_name = _actor(request)
        category = ACTIONS.get(action, ("other", action))[0]
        item = {
            "id": target_id,
            "name": (target_name or "")[:200],
            "detail": (detail or "")[:300],
        }

        with transaction.atomic():
            rows = None
            if merge and request is not None:
                rows = getattr(request, "_audit_rows", None)
                if rows is None:
                    rows = request._audit_rows = {}
                row = rows.get(action)
                if row is not None:
                    items = list(row.items or [])
                    if len(items) < MAX_ITEMS:
                        items.append(item)
                    row.items = items
                    row.count += 1
                    row.save(update_fields=["items", "count"])
                    return

            row = ActionLog.objects.create(
                actor=actor,
                actor_name=actor_name,
                action=action,
                category=category,
                target_name=item["name"],
                target_id=target_id,
                detail=item["detail"],
                count=1,
                items=[item],
            )
            if rows is not None:
                rows[action] = row
    except Exception:
        logger.exception("Could not write audit log entry for %s", action)


# ---------------------------------------------------------------------------
# Ballkid signals
# ---------------------------------------------------------------------------

TRACKED_BALLKID_FIELDS = (
    "is_cut",
    "cut_status",
    "current_team",
    "finals_team",
    "is_checked_in",
    "is_captain",
    "is_active",
)


def _snapshot(instance):
    # __dict__ (not getattr) so deferred fields are skipped, not loaded.
    instance._audit_orig = {
        f: instance.__dict__[f]
        for f in TRACKED_BALLKID_FIELDS
        if f in instance.__dict__
    }


def _ballkid_post_init(sender, instance, **kwargs):
    _snapshot(instance)


def _log_ballkid_change(instance, field, old, new):
    name = instance.get_name()
    pk = instance.pk

    if field == "is_cut":
        log_action("ballkid.cut" if new else "ballkid.uncut", name, pk)
    elif field == "cut_status":
        log_action(
            "ballkid.cut_status",
            name,
            pk,
            f"{old or 'Active'} → {new or 'Active'}",
        )
    elif field == "current_team":
        if not new:
            log_action("team.unassign", name, pk, f"Was on Team {old}")
        elif not old:
            log_action("team.assign", name, pk, f"Team {new}")
        else:
            log_action("team.move", name, pk, f"Team {old} → Team {new}")
    elif field == "finals_team":
        if not new:
            log_action("finals.unassign", name, pk, f"Was {old}")
        elif not old:
            log_action("finals.assign", name, pk, str(new))
        else:
            log_action("finals.move", name, pk, f"{old} → {new}")
    elif field == "is_checked_in":
        log_action("ballkid.checkin" if new else "ballkid.checkout", name, pk)
    elif field == "is_captain":
        log_action(
            "ballkid.promote_captain" if new else "ballkid.demote_captain",
            name,
            pk,
        )
    elif field == "is_active":
        log_action("ballkid.unarchive" if new else "ballkid.archive", name, pk)


def _ballkid_post_save(sender, instance, created, **kwargs):
    try:
        if created:
            log_action("roster.add", instance.get_name(), instance.pk)
        else:
            orig = getattr(instance, "_audit_orig", {})
            for field in TRACKED_BALLKID_FIELDS:
                if field in orig and field in instance.__dict__:
                    old, new = orig[field], instance.__dict__[field]
                    if old != new:
                        _log_ballkid_change(instance, field, old, new)
    except Exception:
        logger.exception("Ballkid audit hook failed")
    finally:
        _snapshot(instance)


# ---------------------------------------------------------------------------
# View events: things that aren't a plain Ballkid field change.
# Each builder runs after a successful (status < 400) response.
# ---------------------------------------------------------------------------

VIEW_EVENTS = {}


def _event(view_name, *methods):
    def decorator(fn):
        for method in methods:
            VIEW_EVENTS[(view_name, method)] = fn
        return fn

    return decorator


@_event("ResetData", "PATCH")
def _reset_data(view, request, response):
    from api.utils.utils import get_current_year

    log_action(
        "season.reset_data",
        detail=f"Cleared {get_current_year()} data and archived all ballkids",
        merge=False,
    )


@_event("ArchiveAll", "PATCH")
def _archive_all(view, request, response):
    log_action("season.archive_all", detail="All active ballkids", merge=False)


@_event("DownloadData", "GET")
def _export(view, request, response):
    log_action("season.export", merge=False)


@_event("GetTournament", "POST")
def _tournament_create(view, request, response):
    data = request.data
    start = data.get("start_date") or data.get("start") or ""
    end = data.get("end_date") or data.get("end") or ""
    log_action(
        "tournament.create",
        str(data.get("year", "")),
        detail=f"{start} to {end}",
        merge=False,
    )


@_event("GetTournament", "PATCH")
def _tournament_update(view, request, response):
    parts = []
    for key in request.data.keys():
        if key in ("show_teams", "show_finals_teams"):
            parts.append(f"{key}={request.data[key]}")
        else:
            parts.append(key)
    log_action(
        "tournament.update", detail=", ".join(sorted(parts)), merge=False
    )


def _rating_for(view):
    from api.models.rating import Rating

    return (
        Rating.objects.select_related("rater", "ratee")
        .filter(pk=view.kwargs.get("pk"))
        .first()
    )


def _rating_target(rating):
    return f"{rating.rater.get_name()} → {rating.ratee.get_name()}"


@_event("DeleteRating", "PATCH")
def _rating_deleted(view, request, response):
    rating = _rating_for(view)
    if rating:
        log_action(
            "rating.delete",
            _rating_target(rating),
            rating.pk,
            f"{rating.rating} stars on {rating.date}",
            merge=False,
        )


@_event("ExcludeRating", "PATCH")
def _rating_excluded(view, request, response):
    from api.models.enums import RATING_STATUS

    rating = _rating_for(view)
    if rating:
        excluded = rating.status == RATING_STATUS.EXCLUDED
        log_action(
            "rating.exclude" if excluded else "rating.unexclude",
            _rating_target(rating),
            rating.pk,
            f"{rating.rating} stars on {rating.date}",
            merge=False,
        )


@_event("UpdateApplicationStatusView", "PATCH", "PUT")
def _application_status(view, request, response):
    from api.models.application import BallcrewApplication

    app = BallcrewApplication.objects.filter(pk=view.kwargs.get("pk")).first()
    if app:
        log_action(
            "application.status",
            app.full_name,
            app.pk,
            f"Set to {app.status}",
            merge=False,
        )


@_event("PromoteApplicationView", "POST")
def _application_promote(view, request, response):
    from api.models.application import BallcrewApplication

    app = BallcrewApplication.objects.filter(pk=view.kwargs.get("pk")).first()
    if app:
        log_action("application.promote", app.full_name, app.pk, merge=False)


@_event("PromoteFromWaitlistView", "POST")
def _waitlist_promote(view, request, response):
    data = getattr(response, "data", None) or {}
    name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip()
    log_action("application.waitlist_promote", name, data.get("id"), merge=False)


@_event("PurgeUnpromotedApplicationsView", "POST")
def _application_purge(view, request, response):
    data = getattr(response, "data", None) or {}
    log_action(
        "application.purge",
        detail=f"{data.get('deleted_count', 0)} deleted",
        merge=False,
    )


@_event("ApplicationSettingsView", "PATCH")
def _application_settings(view, request, response):
    parts = []
    if "is_open" in request.data:
        parts.append(
            "Applications opened" if request.data["is_open"] else "Applications closed"
        )
    if "send_confirmation_emails" in request.data:
        on = request.data["send_confirmation_emails"]
        parts.append(f"Applicant emails {'on' if on else 'off'}")
    log_action("application.settings", detail=", ".join(parts), merge=False)


@_event("TicketSessionView", "PATCH")
def _ticket_round_live(view, request, response):
    if "is_live" not in request.data:
        return
    data = getattr(response, "data", None) or {}
    session = data.get("session") or {}
    if not session:
        return
    log_action(
        "ticket.round_live" if session.get("is_live") else "ticket.round_unlive",
        f"Round for {session.get('ticket_date', '')}",
        session.get("id"),
        merge=False,
    )


@_event("TicketSessionView", "DELETE")
def _ticket_round_delete(view, request, response):
    round_id = request.data.get("id")
    log_action(
        "ticket.round_delete",
        f"Round #{round_id}",
        round_id,
        "Round and its requests removed",
        merge=False,
    )


@_event("RegisterUserView", "POST")
def _user_create(view, request, response):
    data = request.data
    log_action(
        "user.create",
        f"{data.get('first_name', '')} {data.get('last_name', '')}".strip(),
        detail=f"Group: {data.get('group', '')}",
        merge=False,
    )


# ---------------------------------------------------------------------------
# Installation (called once from ApiConfig.ready)
# ---------------------------------------------------------------------------


def install():
    global _installed
    if _installed:
        return
    _installed = True

    from rest_framework.views import APIView

    from api.models.ballkid import Ballkid

    post_init.connect(_ballkid_post_init, sender=Ballkid, dispatch_uid="audit_ballkid_init")
    post_save.connect(_ballkid_post_save, sender=Ballkid, dispatch_uid="audit_ballkid_save")

    original_initialize = APIView.initialize_request
    original_finalize = APIView.finalize_response
    original_dispatch = APIView.dispatch

    def initialize_request(self, request, *args, **kwargs):
        drf_request = original_initialize(self, request, *args, **kwargs)
        # The dispatch wrapper below guarantees this context is cleared even
        # when request handling raises before finalize_response completes.
        _current_request.set(drf_request)
        return drf_request

    def finalize_response(self, request, response, *args, **kwargs):
        response = original_finalize(self, request, response, *args, **kwargs)
        try:
            builder = VIEW_EVENTS.get((type(self).__name__, request.method))
            if builder is not None and response.status_code < 400:
                builder(self, request, response)
        except Exception:
            logger.exception("Audit view-event hook failed")
        return response

    def dispatch(self, request, *args, **kwargs):
        # A request context must never leak into later requests or model saves
        # performed outside a request (including subsequent Django tests).
        token = _current_request.set(None)
        try:
            return original_dispatch(self, request, *args, **kwargs)
        finally:
            _current_request.reset(token)

    APIView.initialize_request = initialize_request
    APIView.finalize_response = finalize_response
    APIView.dispatch = dispatch
