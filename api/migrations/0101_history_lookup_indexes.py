from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0100_alter_schedule_start"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="checkinhistory",
            index=models.Index(
                fields=["ballkid", "-start"],
                name="checkin_ballkid_start_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="captainhistory",
            index=models.Index(
                fields=["ballkid", "captain", "team", "-start"],
                name="captainhist_pair_team_idx",
            ),
        ),
    ]
