"""Regression tests for fail-fast production settings.

These tests import settings in isolated subprocesses so each case gets a clean
environment and cannot be affected by the test runner's loaded Django settings.
"""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from django.test import SimpleTestCase


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


class ProductionSettingsFailFastTests(SimpleTestCase):
    def run_settings_code(self, code, overrides=None):
        child_env = os.environ.copy()
        for name in ("SECRET_KEY", "DATABASE_URL", "DEBUG", "GITHUB_WORKFLOW"):
            child_env.pop(name, None)

        child_env["DEBUG"] = "False"
        # Prevent a developer's local .env from leaking into these isolated cases.
        child_env["PYTHON_DOTENV_DISABLED"] = "true"
        child_env["PYTHONPATH"] = os.pathsep.join(
            filter(
                None,
                [str(REPOSITORY_ROOT), child_env.get("PYTHONPATH", "")],
            )
        )
        child_env.update(overrides or {})

        with tempfile.TemporaryDirectory() as working_directory:
            return subprocess.run(
                [sys.executable, "-c", code],
                cwd=working_directory,
                env=child_env,
                capture_output=True,
                text=True,
                check=False,
            )

    def import_settings(self, overrides=None):
        return self.run_settings_code("import citiopen.settings", overrides)

    def test_production_requires_secret_key(self):
        result = self.import_settings(
            {"DATABASE_URL": "postgres://app:secret@localhost:5432/app"}
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("SECRET_KEY must be set", result.stderr)

    def test_production_requires_database_url(self):
        result = self.import_settings({"SECRET_KEY": "test-production-secret"})

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DATABASE_URL must be set", result.stderr)

    def test_development_can_use_documented_local_defaults(self):
        result = self.import_settings({"DEBUG": "True"})

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_production_accepts_explicit_secret_and_postgres_url(self):
        result = self.import_settings(
            {
                "SECRET_KEY": "test-production-secret",
                "DATABASE_URL": "postgres://app:secret@localhost:5432/app",
            }
        )

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_custom_domain_hosts_and_csrf_origins_are_allowed(self):
        result = self.run_settings_code(
            (
                "import citiopen.settings as s; "
                "print(','.join(s.ALLOWED_HOSTS)); "
                "print(','.join(s.CSRF_TRUSTED_ORIGINS))"
            ),
            {
                "SECRET_KEY": "test-production-secret",
                "DATABASE_URL": "postgres://app:secret@localhost:5432/app",
            },
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("dcopenbk.com", result.stdout)
        self.assertIn("www.dcopenbk.com", result.stdout)
        self.assertIn("https://dcopenbk.com", result.stdout)
        self.assertIn("https://www.dcopenbk.com", result.stdout)
