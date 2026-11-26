# Add the chairperson decision state used by Application Launch.
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0103_veterancy_baseline"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ApplicationLaunchDecision",
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
                ("source_year", models.PositiveSmallIntegerField()),
                (
                    "decision",
                    models.CharField(
                        choices=[
                            ("undecided", "Undecided"),
                            ("invite_back", "Invite back"),
                            ("must_try_out", "Must try out"),
                        ],
                        default="undecided",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True, default="")),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "ballkid",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="application_launch_decisions",
                        to="api.ballkid",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="application_launch_decisions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="applicationlaunchdecision",
            constraint=models.UniqueConstraint(
                fields=("ballkid", "year"),
                name="application_launch_decision_kid_year_uniq",
            ),
        ),
    ]
