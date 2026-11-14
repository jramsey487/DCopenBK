from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0094_applicationemaillog"),
    ]

    operations = [
        migrations.CreateModel(
            name="ActionLog",
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
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("actor_name", models.CharField(blank=True, max_length=150)),
                ("action", models.CharField(db_index=True, max_length=60)),
                ("category", models.CharField(db_index=True, max_length=30)),
                ("target_name", models.CharField(blank=True, max_length=200)),
                ("target_id", models.IntegerField(blank=True, null=True)),
                ("detail", models.CharField(blank=True, max_length=300)),
                ("count", models.PositiveIntegerField(default=1)),
                ("items", models.JSONField(blank=True, default=list)),
                (
                    "actor",
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
                "ordering": ["-created_at", "-id"],
            },
        ),
    ]
