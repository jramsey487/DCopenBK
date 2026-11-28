from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0107_tournament_operational_alert_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="tournament",
            name="contact_email",
            field=models.EmailField(blank=True, default=""),
        ),
    ]
