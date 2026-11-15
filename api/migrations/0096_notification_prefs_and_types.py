from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0095_actionlog"),
    ]

    operations = [
        migrations.AddField(
            model_name="notificationsettings",
            name="ticket_updates_enabled",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="notificationsettings",
            name="announcements_enabled",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="notificationdelivery",
            name="notification_type",
            field=models.CharField(
                choices=[
                    ("shift_reminder", "Shift reminder"),
                    ("team_change", "Team change"),
                    ("ticket_round", "Ticket round live"),
                    ("ticket_results", "Ticket results"),
                    ("waitlist_spot", "Waitlist spot opened"),
                    ("announcement", "Announcement"),
                ],
                max_length=40,
            ),
        ),
    ]