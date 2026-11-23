# Follows the latest notification-preferences migration on main.
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0096_notification_prefs_and_types"),
    ]

    operations = [
        migrations.AddField(
            model_name="tournament",
            name="timezone",
            field=models.CharField(default="America/New_York", max_length=64),
        ),
        migrations.AlterField(
            model_name="checkinhistory",
            name="start",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name="captainhistory",
            name="start",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AlterField(
            model_name="teamhistory",
            name="start",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
