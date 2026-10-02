"""
Chairperson-only, read-only SQL console.

Deliberately restricted to a single SELECT statement -- no writes, no
schema changes, no stacked statements. This is not a general-purpose SQL
tool; it's a narrow "look at the data" window. If you find yourself wanting
to change something here, that's what Django admin (/admin) is for --
this view should never gain write capability.

Layers of protection, in case any one of them has a bug:
1. Regex validation: must start with SELECT, no semicolons in the body
   (blocks statement stacking), no forbidden keywords (INSERT, DROP,
   ALTER, INTO, COPY, etc.) appearing anywhere in the query.
2. Runs inside a transaction that is ALWAYS rolled back, never committed --
   even a validated, "safe" SELECT never has a chance to write anything.
3. A Postgres statement timeout, so a slow/expensive query can't hang the
   database for everyone else.
4. A hard cap on rows returned, so a huge accidental query can't blow up
   the page or the response size.
"""

import re

from django.db import connection, transaction
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsChairperson

MAX_ROWS = 500
QUERY_TIMEOUT_MS = 5000

_FORBIDDEN_KEYWORDS = [
    "insert", "update", "delete", "drop", "alter", "create", "truncate",
    "grant", "revoke", "into", "copy", "call", "do", "vacuum", "reindex",
    "attach", "detach", "pragma", "exec", "execute",
]


def _validate_select_only(query):
    stripped = (query or "").strip()
    if not stripped:
        raise ValidationError("Query cannot be empty.")

    # Allow one optional trailing semicolon; reject any semicolon before
    # that, which would mean a second statement is stacked on.
    body = stripped
    if body.endswith(";"):
        body = body[:-1]
    if ";" in body:
        raise ValidationError(
            "Only a single statement is allowed -- remove any semicolons "
            "other than one at the very end."
        )

    if not re.match(r"^\s*select\b", body, re.IGNORECASE):
        raise ValidationError("Only SELECT queries are allowed.")

    lowered = body.lower()
    for word in _FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{word}\b", lowered):
            raise ValidationError(f"Query contains a disallowed keyword: {word}")

    return body


class DatabaseQueryView(APIView):
    permission_classes = [IsChairperson]

    def post(self, request):
        validated_query = _validate_select_only(request.data.get("query", ""))

        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    if connection.vendor == "postgresql":
                        cursor.execute(
                            "SET LOCAL statement_timeout = %s", [QUERY_TIMEOUT_MS]
                        )
                    cursor.execute(validated_query)
                    columns = (
                        [col[0] for col in cursor.description]
                        if cursor.description
                        else []
                    )
                    rows = cursor.fetchmany(MAX_ROWS)
                    truncated = (
                        len(rows) == MAX_ROWS and cursor.fetchone() is not None
                    )
                # Never commit, no matter what -- this console has nothing
                # to write, on purpose.
                transaction.set_rollback(True)
        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(f"Query error: {e}")

        return Response(
            {
                "columns": columns,
                "rows": rows,
                "truncated": truncated,
                "row_count": len(rows),
            }
        )
