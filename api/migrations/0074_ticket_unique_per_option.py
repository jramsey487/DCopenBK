# Generated manually for multi-option requests per round

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0073_ticketsession"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="ticket",
            name="unique_ticket_per_session_ballkid",
        ),
        migrations.AddConstraint(
            model_name="ticket",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ticket_session__isnull=False,
                    ballkid__isnull=False,
                    ticket_option__isnull=False,
                ),
                fields=("ticket_session", "ballkid", "ticket_option"),
                name="unique_ticket_per_session_ballkid_option",
            ),
        ),
    ]
