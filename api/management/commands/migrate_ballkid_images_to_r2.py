"""
One-time migration: upload existing Ballkid headshots (currently sitting in
api/static/img, referenced by Ballkid.image as a static-relative path) to
R2, and update each Ballkid.image to the resulting full public URL.

Safe to run more than once -- any Ballkid.image that already starts with
"http" is skipped, since that means it's already been migrated.

Run this where BOTH the source image files and the R2 credentials are
available. The cleanest place is inside the deployed Fly container, since
the Docker image already has api/static/img/* baked in from the build and
Fly secrets already provide the R2 env vars there:

    fly ssh console -a dcopenbk
    python manage.py migrate_ballkid_images_to_r2 --dry-run   # preview first
    python manage.py migrate_ballkid_images_to_r2             # then for real

Running it locally instead works too, as long as USE_R2_STORAGE=True and
the R2_* env vars are set in your local .env (DEBUG=True disables R2 by
default, per settings.py).
"""

import os

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

from api.models.ballkid import Ballkid

STATIC_IMG_DIR = os.path.join(settings.BASE_DIR, "api", "static", "img")


def resolve_local_path(image_value):
    """
    Map a stored Ballkid.image value back to its source file under
    api/static/img/, whether it's stored as '/static/img/x.jpg',
    'static/img/x.jpg', or just 'img/x.jpg' -- strip whichever prefix
    is present and join the rest onto the known source directory.
    """
    value = image_value.strip().lstrip("/")
    if value.startswith("static/"):
        value = value[len("static/") :]
    if value.startswith("img/"):
        value = value[len("img/") :]
    return os.path.join(STATIC_IMG_DIR, value)


class Command(BaseCommand):
    help = (
        "Upload existing Ballkid headshots to R2 and update Ballkid.image "
        "to the resulting public URL."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would happen without uploading or saving anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        migrated, skipped, missing = 0, 0, 0

        # all_objects (not the default `objects` manager) so this also
        # catches ticketing-only accounts, which the default manager excludes.
        for ballkid in Ballkid.all_objects.all():
            image_value = (ballkid.image or "").strip()

            if not image_value or image_value.startswith("http"):
                skipped += 1
                continue

            local_path = resolve_local_path(image_value)
            if not os.path.isfile(local_path):
                self.stderr.write(
                    f"[MISSING] {ballkid.first_name} {ballkid.last_name} "
                    f"(id={ballkid.id}): expected file at {local_path}"
                )
                missing += 1
                continue

            filename = os.path.basename(local_path)
            key = f"ballkid_headshots/{ballkid.id}_{filename}"

            if dry_run:
                self.stdout.write(f"[DRY RUN] {local_path} -> {key}")
                migrated += 1
                continue

            with open(local_path, "rb") as f:
                saved_name = default_storage.save(key, File(f))
            new_url = default_storage.url(saved_name)

            ballkid.image = new_url
            ballkid.save(update_fields=["image"])
            self.stdout.write(
                f"[OK] {ballkid.first_name} {ballkid.last_name} -> {new_url}"
            )
            migrated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Migrated: {migrated}, Skipped (already a URL or empty): "
                f"{skipped}, Missing source files: {missing}"
            )
        )
