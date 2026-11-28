from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0106_unique_live_ticket_round"),
    ]

    operations = [
        migrations.AddField(
            model_name="tournament",
            name="operational_alert_email",
            field=models.EmailField(blank=True, default=""),
        ),
    ]
