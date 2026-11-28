from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0104_application_launch_decision"),
    ]

    operations = [
        migrations.CreateModel(
            name="ApplicationLaunchEmailLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.PositiveSmallIntegerField()),
                ("source_year", models.PositiveSmallIntegerField()),
                ("kind", models.CharField(max_length=20)),
                ("recipient_email", models.EmailField(max_length=254)),
                ("subject", models.CharField(max_length=255)),
                ("status", models.CharField(choices=[("sending", "Sending"), ("sent", "Sent"), ("failed", "Failed")], default="sending", max_length=12)),
                ("attempts", models.PositiveSmallIntegerField(default=1)),
                ("last_error", models.TextField(blank=True, default="")),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("ballkid", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="application_launch_email_logs", to="api.ballkid")),
            ],
            options={
                "ordering": ["year", "ballkid_id"],
            },
        ),
        migrations.AddConstraint(
            model_name="applicationlaunchemaillog",
            constraint=models.UniqueConstraint(fields=("ballkid", "year", "kind"), name="launch_email_kid_year_kind_uniq"),
        ),
        migrations.AddIndex(
            model_name="applicationlaunchemaillog",
            index=models.Index(fields=["year", "status"], name="launch_email_year_status_idx"),
        ),
    ]
