# Preserve the existing self-reported experience as a one-time historical baseline.
from django.db import migrations, models


HISTORICAL_BASELINE_CUTOFF_YEAR = 2025


def copy_historical_experience(apps, schema_editor):
    Ballkid = apps.get_model("api", "Ballkid")
    db_alias = schema_editor.connection.alias
    Ballkid.objects.using(db_alias).update(
        veterancy_baseline_years=models.F("num_years_experience"),
        veterancy_baseline_through_year=HISTORICAL_BASELINE_CUTOFF_YEAR,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0102_season_participation"),
    ]

    operations = [
        migrations.AddField(
            model_name="ballkid",
            name="veterancy_baseline_years",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="ballkid",
            name="veterancy_baseline_through_year",
            field=models.PositiveSmallIntegerField(default=HISTORICAL_BASELINE_CUTOFF_YEAR),
        ),
        migrations.RunPython(
            copy_historical_experience,
            migrations.RunPython.noop,
        ),
    ]
