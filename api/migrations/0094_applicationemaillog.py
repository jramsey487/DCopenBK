from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0093_database_indexes"),
    ]

    operations = [
        migrations.CreateModel(
            name="ApplicationEmailLog",
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
                ("kind", models.CharField(max_length=30)),
                ("sent_at", models.DateTimeField(auto_now_add=True)),
                (
                    "application",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="email_logs",
                        to="api.ballcrewapplication",
                    ),
                ),
            ],
            options={
                "ordering": ["sent_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="applicationemaillog",
            constraint=models.UniqueConstraint(
                fields=("application", "kind"),
                name="one_application_email_per_kind",
            ),
        ),
    ]
