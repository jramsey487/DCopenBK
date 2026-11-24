from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0098_notification_outbox"),
    ]

    operations = [
        migrations.CreateModel(
            name="TicketEmailDelivery",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("idempotency_key", models.CharField(max_length=64, unique=True)),
                ("recipient", models.EmailField(max_length=254)),
                ("subject", models.CharField(max_length=255)),
                ("template_name", models.CharField(max_length=80)),
                ("context", models.JSONField(default=dict)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("processing", "Processing"), ("sent", "Sent"), ("failed", "Failed")], default="pending", max_length=16)),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("available_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("locked_until", models.DateTimeField(blank=True, null=True)),
                ("last_error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["status", "available_at"], name="ticket_email_due_idx"),
                    models.Index(fields=["status", "locked_until"], name="ticket_email_lock_idx"),
                ],
            },
        ),
    ]
