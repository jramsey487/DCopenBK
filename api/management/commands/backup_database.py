"""Create an encrypted PostgreSQL backup in the existing Cloudflare R2 bucket."""
from django.core.management.base import BaseCommand, CommandError

from api.utils.database_backups import create_backup


class Command(BaseCommand):
    help = "Create an encrypted PostgreSQL backup in Cloudflare R2 and prune backups older than 30 days."

    def add_arguments(self, parser):
        parser.add_argument("--retention-days", type=int, default=30)

    def handle(self, *args, **options):
        days = options["retention_days"]
        if days < 1:
            raise CommandError("--retention-days must be at least 1.")
        try:
            result = create_backup(retention_days=days)
        except Exception as exc:
            raise CommandError(f"Database backup failed: {exc}") from exc
        self.stdout.write(self.style.SUCCESS(f"Backup uploaded and verified: {result['key']}"))
        self.stdout.write(f"Expired backups removed: {result['deleted']}")
