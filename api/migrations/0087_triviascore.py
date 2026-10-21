from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0086_triviause"),
    ]

    operations = [
        migrations.CreateModel(
            name="TriviaScore",
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
                ("scored_text", models.TextField()),
                ("interest_score", models.PositiveSmallIntegerField()),
                ("is_safe", models.BooleanField(default=True)),
                ("reason", models.CharField(blank=True, max_length=200)),
                ("model_name", models.CharField(blank=True, max_length=60)),
                ("scored_at", models.DateTimeField(auto_now=True)),
                (
                    "application",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="trivia_score",
                        to="api.ballcrewapplication",
                    ),
                ),
            ],
        ),
    ]
