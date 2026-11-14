"""
Chairperson-only viewer for the audit log.

    GET /api/action-log?category=cuts&actor=Jane+Doe&q=smith&days=7&limit=50&offset=0

Returns {count, results, categories, actors}. `results` rows with count > 1
(bulk actions) also carry `items`: the people affected.
"""

from datetime import datetime, timedelta

from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models.action_log import ActionLog
from api.permissions import IsChairperson
from api.utils.audit import CATEGORIES, action_label

__all__ = ["ActionLogList"]

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


def _serialize(row):
    data = {
        "id": row.id,
        "created_at": row.created_at.isoformat(),
        "actor": row.actor_name or "system",
        "action": row.action,
        "category": row.category,
        "label": action_label(row.action),
        "target_name": row.target_name,
        "target_id": row.target_id,
        "detail": row.detail,
        "count": row.count,
    }
    if row.count > 1:
        data["items"] = row.items or []
    return data


def _int(value, default, low, high):
    try:
        return max(low, min(int(value), high))
    except (TypeError, ValueError):
        return default


class ActionLogList(APIView):
    permission_classes = [IsChairperson]

    def get(self, request):
        params = request.query_params
        qs = ActionLog.objects.all()

        category = params.get("category")
        if category:
            qs = qs.filter(category=category)

        actor = params.get("actor")
        if actor:
            qs = qs.filter(actor_name=actor)

        days = _int(params.get("days"), 0, 0, 3650)
        if days:
            qs = qs.filter(created_at__gte=datetime.now() - timedelta(days=days))

        q = (params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(target_name__icontains=q)
                | Q(detail__icontains=q)
                | Q(actor_name__icontains=q)
                | Q(items__icontains=q)
            )

        limit = _int(params.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT)
        offset = _int(params.get("offset"), 0, 0, 10**9)

        total = qs.count()
        rows = qs[offset : offset + limit]

        actors = list(
            ActionLog.objects.exclude(actor_name="")
            .order_by()
            .values_list("actor_name", flat=True)
            .distinct()[:100]
        )

        return Response(
            {
                "count": total,
                "results": [_serialize(r) for r in rows],
                "categories": [{"value": v, "label": l} for v, l in CATEGORIES],
                "actors": sorted(actors),
            }
        )
