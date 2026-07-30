from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0068_alter_rating_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="ballkid",
            name="date_of_birth",
            field=models.DateField(blank=True, null=True),
        ),
    ]
