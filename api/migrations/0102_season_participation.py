# Generated for explicit year-by-year ballcrew participation tracking.
from django.db import migrations, models
import django.db.models.deletion


def backfill_season_participation(apps, schema_editor):
    CheckinHistory = apps.get_model("api", "CheckinHistory")
    SeasonParticipation = apps.get_model("api", "SeasonParticipation")
    db_alias = schema_editor.connection.alias

    # A recorded check-in is the historical evidence that someone worked.
    # Backfill one row per ballkid and calendar year, preserving first/last
    # recorded check-in times. The migration is intentionally idempotent.
    years = (
        CheckinHistory.objects.using(db_alias)
        .order_by()
        .values_list("ballkid_id", "start")
    )
    grouped = {}
    for ballkid_id, started in years.iterator():
        if started is None:
            continue
        year = started.year
        key = (ballkid_id, year)
        bounds = grouped.get(key)
        if bounds is None:
            grouped[key] = [started, started]
        else:
            if started < bounds[0]:
                bounds[0] = started
            if started > bounds[1]:
                bounds[1] = started

    SeasonParticipation.objects.using(db_alias).bulk_create(
        [
            SeasonParticipation(
                ballkid_id=ballkid_id,
                year=year,
                first_checkin=bounds[0],
                last_checkin=bounds[1],
                source="imported",
            )
            for (ballkid_id, year), bounds in grouped.items()
        ],
        ignore_conflicts=True,
        batch_size=1000,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0101_history_lookup_indexes"),
    ]

    operations = [
        migrations.CreateModel(
            name="SeasonParticipation",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("year", models.PositiveSmallIntegerField()),
                ("first_checkin", models.DateTimeField(blank=True, null=True)),
                ("last_checkin", models.DateTimeField(blank=True, null=True)),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("checkin", "Recorded check-in"),
                            ("imported", "Imported historical record"),
                        ],
                        default="checkin",
                        max_length=12,
                    ),
                ),
                ("notes", models.TextField(blank=True, default="")),
                (
                    "ballkid",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="season_participations",
                        to="api.ballkid",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="seasonparticipation",
            constraint=models.UniqueConstraint(
                fields=("ballkid", "year"),
                name="season_participation_ballkid_year_uniq",
            ),
        ),
        migrations.AddIndex(
            model_name="seasonparticipation",
            index=models.Index(
                fields=["year", "ballkid"], name="seasonpart_year_kid_idx"
            ),
        ),
        migrations.RunPython(
            backfill_season_participation,
            migrations.RunPython.noop,
        ),
    ]
