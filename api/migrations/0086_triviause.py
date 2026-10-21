import datetime

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0082_applicationsettings_send_confirmation_emails"),
    ]

    operations = [
        migrations.CreateModel(
            name="TriviaUse",
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
                ("fun_fact", models.TextField(blank=True)),
                ("used_on", models.DateField(default=datetime.date.today)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "ballkid",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="trivia_uses",
                        to="api.ballkid",
                    ),
                ),
                (
                    "used_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
