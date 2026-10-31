from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0092_captainfeedbackemail"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                """
                CREATE INDEX IF NOT EXISTS schedule_start_idx
                ON api_schedule (start);
                """,
                """
                CREATE INDEX IF NOT EXISTS schedule_team_start_idx
                ON api_schedule (team, start);
                """,
                """
                CREATE INDEX IF NOT EXISTS teamhistory_ballkid_start_idx
                ON api_teamhistory (ballkid_id, start DESC);
                """,
                """
                CREATE INDEX IF NOT EXISTS teamhistory_team_start_idx
                ON api_teamhistory (team, start);
                """,
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS schedule_start_idx;",
                "DROP INDEX IF EXISTS schedule_team_start_idx;",
                "DROP INDEX IF EXISTS teamhistory_ballkid_start_idx;",
                "DROP INDEX IF EXISTS teamhistory_team_start_idx;",
            ],
        ),
    ]
