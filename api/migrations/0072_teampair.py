# Generated manually for TeamPair

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0071_ballkid_board_order"),
    ]

    operations = [
        migrations.CreateModel(
            name="TeamPair",
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
                ("team", models.IntegerField()),
                (
                    "position",
                    models.CharField(
                        choices=[("Back", "Back"), ("Net", "Net")],
                        max_length=10,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "ballkid_a",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="team_pairs_as_a",
                        to="api.ballkid",
                    ),
                ),
                (
                    "ballkid_b",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="team_pairs_as_b",
                        to="api.ballkid",
                    ),
                ),
            ],
            options={
                "ordering": ["team", "position", "id"],
            },
        ),
    ]
