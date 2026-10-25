import uuid

from django.db import migrations, models


def populate_edit_tokens(apps, schema_editor):
    """Give every existing application its own unique edit token."""
    BallcrewApplication = apps.get_model("api", "BallcrewApplication")
    for application in BallcrewApplication.objects.filter(edit_token__isnull=True):
        application.edit_token = uuid.uuid4()
        application.save(update_fields=["edit_token"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0088_merge_20261021_0059"),
    ]

    operations = [
        migrations.AddField(
            model_name="ballcrewapplication",
            name="edit_token",
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.AddField(
            model_name="ballcrewapplication",
            name="edited_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(populate_edit_tokens, migrations.RunPython.noop),
    ]