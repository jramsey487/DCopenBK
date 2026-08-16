"""Ticket round CRUD, requests, lottery, waitlist, and staff allocation."""

from datetime import datetime, date

from django.db.models import F, Max, Value
from django.db.models.functions import Concat
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.ballkid import Ballkid, Ticket, TicketOption, TicketSession
from api.models.enums import TICKET_STATUS
from api.permissions import IsChairpersonOrTicketing
from api.serializers import TicketSerializer
from api.utils.utils import get_current_year
from api.utils.tickets import (
    default_winner_confirm_by,
    email_request_confirmation,
    for_storage,
    is_ticket_admin,
    maybe_advance_session,
    now_et,
    parse_et_datetime,
    pick_ballkid_session,
    pick_current_session,
    pick_live_session,
    remaining_tickets,
    run_lottery,
    run_waitlist_pass,
    allocate_waitlist_ticket,
    reallocate_declined_grants,
    serialize_session,
    set_session_live,
    winner_confirm_by,
)

import logging

logger = logging.getLogger("api.tickets")


def _my_ballkid(user):
    return Ballkid.objects.filter(user=user).first()


def _parse_ticket_date(value):
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _ticket_queryset(session=None, year=None):
    qs = Ticket.objects.all().select_related(
        "ticket_option", "ticket_session", "ballkid"
    ).annotate(
        ballkid_name=Concat("ballkid__first_name", Value(" "), "ballkid__last_name"),
        num_tickets=F("ballkid__num_tickets"),
    )
    if session is not None:
        qs = qs.filter(ticket_session=session)
    elif year is not None:
        qs = qs.filter(year=year)
    return qs.order_by("order", "id")


def _session_from_write(request):
    session_id = (
        request.data.get("id")
        or request.data.get("ticketSessionId")
        or request.data.get("ticket_session")
    )
    if session_id:
        return get_object_or_404(TicketSession, id=session_id)
    ticket_date = _parse_ticket_date(request.data.get("ticket_date"))
    if ticket_date:
        return pick_current_session(ticket_date=ticket_date)
    return pick_live_session()


def _year_sessions():
    year = get_current_year()
    sessions = list(
        TicketSession.objects.filter(year=year)
        .prefetch_related("options")
        .order_by("ticket_date", "id")
    )
    advanced = []
    for session in sessions:
        if session.is_live or session.lottery_run_at:
            session = maybe_advance_session(session)
        advanced.append(session)
    return advanced


def _require_ticket_admin(user):
    if is_ticket_admin(user):
        return None
    return Response(
        {"detail": "Not allowed to change ticket rounds."},
        status=status.HTTP_403_FORBIDDEN,
    )


def _admin_rounds_payload(session=None):
    payload = {
        "sessions": [serialize_session(s) for s in _year_sessions()],
        "can_manage": True,
    }
    if session is not None:
        payload["session"] = serialize_session(session)
    return payload


def _option_from_request(session, data):
    options = list(session.options.all())
    option_id = data.get("option_id") or data.get("optionId")
    option = None
    if option_id:
        option = next((o for o in options if str(o.id) == str(option_id)), None)
    elif len(options) == 1:
        option = options[0]
    if options and option is None:
        return None, "Pick a session."
    return option, None


def _create_ticket_request(session, ballkid, option, num):
    next_order = (
        session.tickets.aggregate(max_order=Max("order"))["max_order"] or 0
    ) + 1
    return Ticket.objects.create(
        year=session.year,
        session=(
            str(option.session_number) if option else session.ticket_date.isoformat()
        ),
        ticket_session=session,
        ticket_option=option,
        ballkid=ballkid,
        order=next_order,
        num_requested=num,
        status=TICKET_STATUS.REQUESTED,
    )


def _parse_period(value):
    value = (value or "").strip().lower().replace("-", "_")
    if value in ("allday",):
        value = "all_day"
    if value in ("day", "night", "all_day", ""):
        return value
    return "all_day"


def _parse_options_payload(raw_options):
    if not raw_options:
        return None, "Add at least one session option."
    parsed = []
    for index, raw in enumerate(raw_options):
        ticket_date = _parse_ticket_date(raw.get("ticket_date"))
        if not ticket_date:
            return None, "Each option needs a ticket date."
        try:
            session_number = int(raw.get("session_number"))
        except (TypeError, ValueError):
            return None, "Each option needs a session number."
        if session_number < 1:
            return None, "Session number must be >= 1."
        try:
            pool_size = int(raw.get("pool_size", 0))
        except (TypeError, ValueError):
            return None, "Pool size must be a number."
        if pool_size < 0:
            return None, "Pool size must be >= 0."
        parsed.append(
            {
                "id": raw.get("id"),
                "session_number": session_number,
                "ticket_date": ticket_date,
                "period": _parse_period(raw.get("period")),
                "pool_size": pool_size,
                "order": index,
            }
        )
    return parsed, None


def _sync_session_from_options(session, options):
    dates = [o.ticket_date for o in options]
    session.ticket_date = min(dates) if dates else session.ticket_date
    session.pool_size = sum(o.pool_size for o in options)
    session.session_number = options[0].session_number if options else session.session_number
    session.save()


def _upsert_options(session, parsed_options):
    keep_ids = []
    for item in parsed_options:
        option_id = item.get("id")
        option = session.options.filter(id=option_id).first() if option_id else None
        if option is None:
            option = TicketOption(ticket_session=session)
        option.session_number = item["session_number"]
        option.ticket_date = item["ticket_date"]
        option.period = item["period"]
        option.pool_size = item["pool_size"]
        option.order = item["order"]
        option.save()
        keep_ids.append(option.id)
    session.options.exclude(id__in=keep_ids).delete()


class TicketSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        ballkid = _my_ballkid(request.user)
        can_manage = is_ticket_admin(request.user)
        payload = {
            "can_manage": can_manage,
            "remaining": remaining_tickets(ballkid) if ballkid else 0,
        }
        if can_manage:
            sessions = [serialize_session(s) for s in _year_sessions()]
            payload["sessions"] = sessions
            payload["session"] = next((s for s in sessions if s["is_live"]), None)
            return Response(payload)

        session = pick_ballkid_session(ballkid) if ballkid else pick_live_session()
        payload["session"] = serialize_session(session) if session else None
        payload["sessions"] = [payload["session"]] if payload["session"] else []
        return Response(payload)

    def put(self, request, format=None):
        denied = _require_ticket_admin(request.user)
        if denied:
            return denied

        parsed_options, option_error = _parse_options_payload(
            request.data.get("options")
        )
        if option_error:
            return Response(
                {"detail": option_error},
                status=status.HTTP_400_BAD_REQUEST,
            )

        closes_at = parse_et_datetime(request.data.get("closes_at"))
        if closes_at is None:
            return Response(
                {"detail": "closes_at is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        round_date = min(o["ticket_date"] for o in parsed_options)
        winner_raw = request.data.get("winner_confirm_by")
        winner_confirm = (
            parse_et_datetime(winner_raw)
            if winner_raw
            else default_winner_confirm_by(closes_at)
        )
        year = round_date.year

        existing = None
        raw_id = request.data.get("id")
        if raw_id:
            existing = TicketSession.objects.filter(id=raw_id).first()
            if existing is None:
                return Response(
                    {"detail": "Round not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        duplicate = TicketSession.objects.filter(
            year=year, ticket_date=round_date
        )
        if existing:
            duplicate = duplicate.exclude(pk=existing.pk)
        if duplicate.exists():
            return Response(
                {
                    "detail": "A round for this date already exists — edit it below.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if existing:
            session = existing
            session.closes_at = for_storage(closes_at)
            session.winner_confirm_by = for_storage(winner_confirm)
            session.year = year
            session.save()
        else:
            create_kwargs = {
                "year": year,
                "ticket_date": round_date,
                "closes_at": for_storage(closes_at),
                "pool_size": sum(o["pool_size"] for o in parsed_options),
                "winner_confirm_by": for_storage(winner_confirm),
                "is_live": False,
            }
            session = TicketSession.objects.create(**create_kwargs)

        _upsert_options(session, parsed_options)
        _sync_session_from_options(session, list(session.options.all()))
        session = maybe_advance_session(session)
        return Response(_admin_rounds_payload(session))

    def patch(self, request, format=None):
        denied = _require_ticket_admin(request.user)
        if denied:
            return denied
        session_id = request.data.get("id")
        if not session_id:
            return Response(
                {"detail": "id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session = get_object_or_404(TicketSession, id=session_id)
        if "is_live" in request.data:
            is_live = request.data.get("is_live")
            if isinstance(is_live, str):
                is_live = is_live.lower() not in ("false", "0", "no")
            try:
                session = set_session_live(session, bool(is_live))
            except ValueError as exc:
                return Response(
                    {"detail": str(exc)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if session.is_live:
                session = maybe_advance_session(session)
        return Response(_admin_rounds_payload(session))

    def delete(self, request, format=None):
        denied = _require_ticket_admin(request.user)
        if denied:
            return denied
        session_id = request.data.get("id")
        if not session_id:
            return Response(
                {"detail": "id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session = get_object_or_404(TicketSession, id=session_id)
        confirmed = session.tickets.filter(
            status=TICKET_STATUS.CONFIRMED
        ).select_related("ballkid")
        for ticket in confirmed:
            if not ticket.ballkid_id or not ticket.num_granted:
                continue
            ballkid = ticket.ballkid
            ballkid.num_tickets = max(
                0, (ballkid.num_tickets or 0) - ticket.num_granted
            )
            ballkid.save(update_fields=["num_tickets"])
        session.delete()
        return Response(_admin_rounds_payload())


class TicketList(generics.ListAPIView):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        if is_ticket_admin(request.user):
            _year_sessions()
            qs = _ticket_queryset(year=get_current_year())
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)

        ballkid = _my_ballkid(request.user)
        if ballkid is None:
            return Response([])
        qs = (
            _ticket_queryset(year=get_current_year())
            .filter(ballkid=ballkid)
            .order_by("-id")
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class RequestTickets(APIView):
    permission_classes = [IsAuthenticated]

    def _live_open_session(self):
        session = pick_live_session()
        if session is None:
            return None, Response(
                {"detail": "No ticket round is live."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = now_et()
        if now >= now_et(session.closes_at):
            return None, Response(
                {"detail": "The request window is closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return session, None

    def _parse_option(self, session, request):
        option, error = _option_from_request(session, request.data)
        if error:
            return None, Response(
                {"detail": error},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return option, None

    def _parse_num(self, request, remaining):
        try:
            num = int(
                request.data.get("num_requested") or request.data.get("numTickets")
            )
        except (TypeError, ValueError):
            return None, Response(
                {"detail": "num_requested is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if num < 1 or num > remaining:
            return None, Response(
                {"detail": f"You can request between 1 and {remaining} ticket(s)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return num, None

    def post(self, request, format=None):
        ballkid = _my_ballkid(request.user)
        if ballkid is None:
            return Response(
                {"detail": "No ballkid profile linked to this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session, error = self._live_open_session()
        if error:
            return error

        remaining = remaining_tickets(ballkid)
        if remaining <= 0:
            return Response(
                {
                    "detail": "You've used both of your tournament tickets.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        option, error = self._parse_option(session, request)
        if error:
            return error

        num, error = self._parse_num(request, remaining)
        if error:
            return error

        if session.tickets.filter(ballkid=ballkid).exists():
            return Response(
                {"detail": "You already have a request for this round."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket = _create_ticket_request(session, ballkid, option, num)
        email_request_confirmation(ballkid, session, num, option=option)
        logger.info("Ticket request %s for ballkid %s", ticket.id, ballkid.id)
        return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)

    def patch(self, request, format=None):
        ballkid = _my_ballkid(request.user)
        if ballkid is None:
            return Response(
                {"detail": "No ballkid profile linked to this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session, error = self._live_open_session()
        if error:
            return error

        ticket = session.tickets.filter(
            ballkid=ballkid, status=TICKET_STATUS.REQUESTED
        ).first()
        if ticket is None:
            return Response(
                {"detail": "No editable request found for this round."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        remaining = remaining_tickets(ballkid)
        option, error = self._parse_option(session, request)
        if error:
            return error

        num, error = self._parse_num(request, remaining)
        if error:
            return error

        ticket.ticket_option = option
        ticket.session = (
            str(option.session_number) if option else session.ticket_date.isoformat()
        )
        ticket.num_requested = num
        ticket.save(
            update_fields=["ticket_option", "session", "num_requested"]
        )
        logger.info("Ticket request %s updated for ballkid %s", ticket.id, ballkid.id)
        return Response(TicketSerializer(ticket).data)


class ConfirmTickets(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        ballkid = _my_ballkid(request.user)
        if ballkid is None:
            return Response(
                {"detail": "No ballkid profile linked to this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = now_et()
        candidates = (
            Ticket.objects.filter(
                ballkid=ballkid,
                status=TICKET_STATUS.CONFIRMED,
            )
            .select_related("ticket_session", "ticket_option", "ballkid")
            .order_by("-ticket_session__ticket_date", "-id")
        )
        ticket = None
        for candidate in candidates:
            session_candidate = candidate.ticket_session
            if (
                session_candidate
                and not session_candidate.waitlist_run_at
                and now < winner_confirm_by(session_candidate)
            ):
                ticket = candidate
                break
        if ticket is None:
            return Response(
                {"detail": "No confirmed tickets to decline."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = maybe_advance_session(ticket.ticket_session)
        ticket.refresh_from_db()
        if session is None:
            return Response(
                {"detail": "No ticket round found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        accept = request.data.get("accept", True)
        if isinstance(accept, str):
            accept = accept.lower() not in ("false", "0", "no")

        if accept:
            return Response(TicketSerializer(ticket).data)
        if session.waitlist_run_at or now >= winner_confirm_by(session):
            return Response(
                {"detail": "The decline deadline has passed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ballkid.num_tickets = max(
            0, (ballkid.num_tickets or 0) - (ticket.num_granted or 0)
        )
        ballkid.save(update_fields=["num_tickets"])
        ticket.status = TICKET_STATUS.DECLINED
        ticket.save(update_fields=["status"])
        reallocate_declined_grants(ticket, now=now)
        ticket.refresh_from_db()
        return Response(TicketSerializer(ticket).data)


class AllocateTickets(APIView):
    permission_classes = [IsChairpersonOrTicketing]

    def post(self, request, format=None):
        ticket_id = request.data.get("id") or request.data.get("ticketId")
        if not ticket_id:
            return Response(
                {"detail": "id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ticket = get_object_or_404(Ticket, id=ticket_id)
        try:
            ticket = allocate_waitlist_ticket(ticket)
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ticket = _ticket_queryset().filter(pk=ticket.pk).first() or ticket
        return Response(TicketSerializer(ticket).data)


class RunTicketLottery(APIView):
    permission_classes = [IsChairpersonOrTicketing]

    def post(self, request, format=None):
        session = _session_from_write(request)
        if session is None:
            return Response(
                {"detail": "No ticket round found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session = run_lottery(session)
        return Response({"session": serialize_session(session)})


class RunTicketWaitlist(APIView):
    permission_classes = [IsChairpersonOrTicketing]

    def post(self, request, format=None):
        session = _session_from_write(request)
        if session is None:
            return Response(
                {"detail": "No ticket round found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session = run_waitlist_pass(session)
        return Response({"session": serialize_session(session)})


class UpdateTicketUsed(APIView):
    permission_classes = [IsChairpersonOrTicketing]

    def patch(self, request, format=None):
        ballkid = get_object_or_404(Ballkid, id=request.data.get("ballkidId"))
        if "num_tickets" in request.data:
            try:
                ballkid.num_tickets = max(0, int(request.data["num_tickets"]))
            except (TypeError, ValueError):
                return Response(
                    {"detail": "num_tickets must be a number."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif "delta" in request.data:
            try:
                ballkid.num_tickets = max(
                    0, (ballkid.num_tickets or 0) + int(request.data["delta"])
                )
            except (TypeError, ValueError):
                return Response(
                    {"detail": "delta must be a number."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            return Response(
                {"detail": "num_tickets or delta is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ballkid.save(update_fields=["num_tickets"])
        return Response(
            {"id": ballkid.id, "num_tickets": ballkid.num_tickets}
        )


class UpdateTicket(APIView):
    permission_classes = [IsChairpersonOrTicketing]

    def post(self, request, format=None):
        session = pick_current_session(
            ticket_date=_parse_ticket_date(request.data.get("ticket_date"))
        )
        session_id = request.data.get("ticketSessionId") or request.data.get(
            "ticket_session"
        )
        if session_id:
            session = get_object_or_404(TicketSession, id=session_id)
        if session is None:
            return Response(
                {"detail": "No ticket round found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if session.lottery_run_at:
            return Response(
                {"detail": "Cannot add requests after the lottery has run."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ballkid = get_object_or_404(Ballkid, id=request.data.get("ballkidId"))
        if session.tickets.filter(ballkid=ballkid).exists():
            return Response(
                {"detail": "That ballkid already has a request for this date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        option, option_error = _option_from_request(session, request.data)
        if option_error:
            return Response(
                {"detail": option_error},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            num = int(request.data.get("numTickets") or request.data.get("num_requested"))
        except (TypeError, ValueError):
            return Response(
                {"detail": "numTickets is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        remaining = remaining_tickets(ballkid)
        if remaining <= 0 or num < 1 or num > remaining:
            return Response(
                {"detail": "Request exceeds remaining ticket budget."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ticket = _create_ticket_request(session, ballkid, option, num)
        return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)

    def delete(self, request, format=None):
        ticket_id = request.data.get("id")
        if ticket_id:
            ticket = get_object_or_404(Ticket, id=ticket_id)
        else:
            session = pick_current_session(
                ticket_date=_parse_ticket_date(request.data.get("ticket_date"))
            )
            ballkid = get_object_or_404(Ballkid, id=request.data.get("ballkidId"))
            ticket = get_object_or_404(
                Ticket, ticket_session=session, ballkid=ballkid
            )

        if ticket.status == TICKET_STATUS.CONFIRMED and ticket.ballkid:
            ticket.ballkid.num_tickets = max(
                0, (ticket.ballkid.num_tickets or 0) - ticket.num_granted
            )
            ticket.ballkid.save(update_fields=["num_tickets"])
        ticket.delete()
        return Response({"Success": "Deleted ticket"})
