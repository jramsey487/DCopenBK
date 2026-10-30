from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0091_merge_20261026_0329"),
    ]

    operations = [
        migrations.CreateModel(
            name="CaptainFeedbackEmail",
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
                ("year", models.IntegerField(db_index=True)),
                ("rating_count", models.IntegerField(default=0)),
                ("sent_at", models.DateTimeField(auto_now_add=True)),
                (
                    "captain",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="captain_feedback_emails",
                        to="api.ballkid",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="captainfeedbackemail",
            constraint=models.UniqueConstraint(
                fields=("year", "captain"),
                name="one_captain_feedback_email_per_year",
            ),
        ),
    ]
