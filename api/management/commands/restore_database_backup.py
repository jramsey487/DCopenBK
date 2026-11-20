"""Restore an encrypted R2 backup into an explicitly confirmed disposable database."""
from django.core.management.base import BaseCommand, CommandError

from api.utils.database_backups import latest_backup_key, restore_backup


class Command(BaseCommand):
    help = "Restore a selected R2 backup into a separate disposable PostgreSQL database."

    def add_arguments(self, parser):
        selection = parser.add_mutually_exclusive_group(required=True)
        selection.add_argument("--latest", action="store_true", help="Restore the newest available backup.")
        selection.add_argument("--key", help="Exact R2 object key to restore.")
        parser.add_argument("--target-database-url", required=True, help="Connection URL for a separate, disposable PostgreSQL database.")
        parser.add_argument("--confirm-target-database", required=True, help="Must exactly match the target database name.")

    def handle(self, *args, **options):
        try:
            key = options["key"] if options["key"] else latest_backup_key()
            target = restore_backup(key, options["target_database_url"], options["confirm_target_database"])
        except Exception as exc:
            raise CommandError(f"Database restore verification failed: {exc}") from exc
        self.stdout.write(self.style.SUCCESS(f"Backup {key} restored successfully into disposable database '{target}'."))
        self.stdout.write("The restore check also confirmed the django_migrations table is readable.")
