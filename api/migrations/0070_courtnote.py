# Generated manually for CourtNote

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0069_ballkid_date_of_birth"),
    ]

    operations = [
        migrations.CreateModel(
            name="CourtNote",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("court", models.CharField(max_length=50)),
                ("date", models.DateField()),
                ("message", models.TextField()),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.AddConstraint(
            model_name="courtnote",
            constraint=models.UniqueConstraint(
                fields=("court", "date"), name="unique_court_note_per_day"
            ),
        ),
    ]
