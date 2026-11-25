from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0099_ticket_email_outbox"),
    ]

    operations = [
        migrations.AlterField(
            model_name="schedule",
            name="start",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
