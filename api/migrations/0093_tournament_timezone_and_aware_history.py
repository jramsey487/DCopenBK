from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0092_captainfeedbackemail"),
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
