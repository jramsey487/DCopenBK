from django.db import migrations, models
from django.db.models import Q


def keep_one_live_round_per_year(apps, schema_editor):
    TicketSession = apps.get_model("api", "TicketSession")
    db = schema_editor.connection.alias
    years = (
        TicketSession.objects.using(db)
        .filter(is_live=True)
        .values_list("year", flat=True)
        .distinct()
    )
    for year in years:
        live_ids = list(
            TicketSession.objects.using(db)
            .filter(year=year, is_live=True)
            .order_by("-id")
            .values_list("id", flat=True)
        )
        if len(live_ids) > 1:
            TicketSession.objects.using(db).filter(
                pk__in=live_ids[1:]
            ).update(is_live=False)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0105_application_launch_email_log"),
    ]

    operations = [
        migrations.RunPython(
            keep_one_live_round_per_year,
            migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name="ticketsession",
            constraint=models.UniqueConstraint(
                fields=("year",),
                condition=Q(is_live=True),
                name="unique_live_ticket_round_per_year",
            ),
        ),
    ]
