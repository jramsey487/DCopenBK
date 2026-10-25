import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0089_ballcrewapplication_edit_token_and_edited_at"),
    ]

    operations = [
        migrations.AlterField(
            model_name="ballcrewapplication",
            name="edit_token",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
