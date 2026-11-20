import os
import tempfile
from datetime import timedelta
from unittest import TestCase
from unittest.mock import MagicMock, patch

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from api.utils import database_backups as backups


class BackupEncryptionTests(SimpleTestCase):
    def test_encrypt_decrypt_round_trip(self):
        key = os.urandom(32)
        payload = (b"dcopenbk backup contents\x00" * 10000)
        with tempfile.TemporaryDirectory() as directory:
            source = os.path.join(directory, "source.dump")
            encrypted = os.path.join(directory, "source.dump.enc")
            restored = os.path.join(directory, "restored.dump")
            with open(source, "wb") as stream:
                stream.write(payload)
            backups.encrypt_file(source, encrypted, key)
            self.assertNotEqual(open(source, "rb").read(), open(encrypted, "rb").read())
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

    def test_retention_only_deletes_objects_under_database_prefix(self):
        now = timezone.now()
        client = MagicMock()
        paginator = client.get_paginator.return_value
        paginator.paginate.return_value = [{"Contents": [
            {"Key": backups.BACKUP_PREFIX + "old.dump.enc", "LastModified": now - timedelta(days=31)},
            {"Key": backups.BACKUP_PREFIX + "new.dump.enc", "LastModified": now - timedelta(days=2)},
        ]}]
        deleted = backups.prune_backups(client, "bucket", retention_days=30, now=now)
        self.assertEqual(deleted, 1)
        client.delete_objects.assert_called_once_with(
            Bucket="bucket",
            Delete={"Objects": [{"Key": backups.BACKUP_PREFIX + "old.dump.enc"}], "Quiet": True},
        )
