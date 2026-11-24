from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0097_tournament_timezone_and_aware_history"),
    ]

    operations = [
        migrations.AddField(
            model_name="notificationdelivery",
            name="payload",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="notificationdelivery",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("processing", "Processing"),
                    ("sent", "Sent"),
                    ("failed", "Failed"),
                ],
                default="sent",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="notificationdelivery",
            name="attempts",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="notificationdelivery",
            name="available_at",
            field=models.DateTimeField(db_index=True, default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name="notificationdelivery",
            name="locked_until",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="notificationdelivery",
            name="last_error",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="notificationdelivery",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AlterField(
            model_name="notificationdelivery",
            name="sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="notificationdelivery",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("processing", "Processing"),
                    ("sent", "Sent"),
                    ("failed", "Failed"),
                ],
                default="pending",
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="notificationdelivery",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AddIndex(
            model_name="notificationdelivery",
            index=models.Index(fields=["status", "available_at"], name="notif_outbox_due_idx"),
        ),
        migrations.AddIndex(
            model_name="notificationdelivery",
            index=models.Index(fields=["status", "locked_until"], name="notif_outbox_lock_idx"),
        ),
    ]
