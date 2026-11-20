import os
import tempfile
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from api.utils import database_backups as backups


class BackupEncryptionTests(SimpleTestCase):
    def test_encrypt_decrypt_round_trip(self):
        key = os.urandom(32)
        payload = b"dcopenbk backup contents\x00" * 10000
        with tempfile.TemporaryDirectory() as directory:
            source = os.path.join(directory, "source.dump")
            encrypted = os.path.join(directory, "source.dump.enc")
            restored = os.path.join(directory, "restored.dump")
            with open(source, "wb") as stream:
                stream.write(payload)
            backups.encrypt_file(source, encrypted, key)
            with open(source, "rb") as original, open(encrypted, "rb") as protected:
                self.assertNotEqual(original.read(), protected.read())
            backups.decrypt_file(encrypted, restored, key)
            with open(restored, "rb") as stream:
                self.assertEqual(stream.read(), payload)

    def test_wrong_key_fails_authentication(self):
        with tempfile.TemporaryDirectory() as directory:
            source = os.path.join(directory, "source")
            encrypted = os.path.join(directory, "encrypted")
            restored = os.path.join(directory, "restored")
            with open(source, "wb") as stream:
                stream.write(b"secret")
            backups.encrypt_file(source, encrypted, os.urandom(32))
            with self.assertRaises(Exception):
                backups.decrypt_file(encrypted, restored, os.urandom(32))

    @override_settings(DATABASES={"default": {"ENGINE": "django.db.backends.postgresql", "NAME": "production"}})
    def test_restore_refuses_production_database(self):
        with self.assertRaisesRegex(RuntimeError, "Refusing to restore"):
            backups.restore_backup("backup-key", "postgres://user:pass@host/production", "production")

    @override_settings(DATABASES={"default": {"ENGINE": "django.db.backends.postgresql", "NAME": "production"}})
    @patch("api.utils.database_backups.download_and_decrypt")
    @patch("api.utils.database_backups.subprocess.run")
    def test_restore_requires_exact_target_confirmation(self, run, download):
        with self.assertRaisesRegex(RuntimeError, "To confirm"):
            backups.restore_backup("backup-key", "postgres://user:pass@host/restore_test", "wrong")
        run.assert_not_called()
        download.assert_not_called()

    def _assert_retention_prunes_old_object(self, now, old_last_modified):
        client = MagicMock()
        paginator = client.get_paginator.return_value
        paginator.paginate.return_value = [{"Contents": [
            {"Key": backups.BACKUP_PREFIX + "old.dump.enc", "LastModified": old_last_modified},
            {"Key": backups.BACKUP_PREFIX + "new.dump.enc", "LastModified": backups._utc_aware(now) - timedelta(days=2)},
        ]}]
        deleted = backups.prune_backups(client, "bucket", retention_days=30, now=now)
        self.assertEqual(deleted, 1)
        client.delete_objects.assert_called_once_with(
            Bucket="bucket",
            Delete={"Objects": [{"Key": backups.BACKUP_PREFIX + "old.dump.enc"}], "Quiet": True},
        )

    def test_retention_handles_naive_django_time_and_aware_s3_time(self):
        now = timezone.now().replace(tzinfo=None)
        self._assert_retention_prunes_old_object(now, timezone.now() - timedelta(days=31))

    def test_retention_handles_aware_django_time_and_naive_s3_time(self):
        now = timezone.now()
        self._assert_retention_prunes_old_object(now, (now - timedelta(days=31)).replace(tzinfo=None))

    def test_retention_only_deletes_objects_under_database_prefix(self):
        now = timezone.now()
        client = MagicMock()
        paginator = client.get_paginator.return_value
        paginator.paginate.return_value = [{"Contents": [
            {"Key": backups.BACKUP_PREFIX + "old.dump.enc", "LastModified": backups._utc_aware(now) - timedelta(days=31)},
            {"Key": backups.BACKUP_PREFIX + "new.dump.enc", "LastModified": backups._utc_aware(now) - timedelta(days=2)},
        ]}]
        deleted = backups.prune_backups(client, "bucket", retention_days=30, now=now)
        self.assertEqual(deleted, 1)
