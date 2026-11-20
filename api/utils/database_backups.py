"""Encrypted, off-site PostgreSQL backups for DCopenBK."""
import base64
import os
import subprocess
import tempfile
from datetime import timedelta, timezone as datetime_timezone
from pathlib import Path
from urllib.parse import urlparse

import boto3
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from django.conf import settings
from django.utils import timezone

BACKUP_PREFIX = "database-backups/dcopenbk/"
MAGIC = b"DCOPENBK1"
CHUNK_SIZE = 1024 * 1024


def _required_env(name):
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Required Fly secret is missing: {name}")
    return value


def encryption_key():
    try:
        key = base64.urlsafe_b64decode(_required_env("DATABASE_BACKUP_ENCRYPTION_KEY"))
    except Exception as exc:
        raise RuntimeError("DATABASE_BACKUP_ENCRYPTION_KEY must be a URL-safe base64 encoded 32-byte key.") from exc
    if len(key) != 32:
        raise RuntimeError("DATABASE_BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes.")
    return key


def r2_client():
    return boto3.client(
        "s3",
        endpoint_url=_required_env("R2_ENDPOINT_URL"),
        aws_access_key_id=_required_env("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=_required_env("R2_SECRET_ACCESS_KEY"),
        region_name="auto",
    )


def bucket_name():
    return _required_env("R2_BUCKET_NAME")


def database_config():
    config = settings.DATABASES["default"]
    if config.get("ENGINE") != "django.db.backends.postgresql":
        raise RuntimeError("Database backups require the configured PostgreSQL database.")
    return config


def pg_environment(config):
    env = os.environ.copy()
    if config.get("PASSWORD"):
        env["PGPASSWORD"] = str(config["PASSWORD"])
    options = config.get("OPTIONS") or {}
    if options.get("sslmode"):
        env["PGSSLMODE"] = str(options["sslmode"])
    if options.get("sslrootcert"):
        env["PGSSLROOTCERT"] = str(options["sslrootcert"])
    return env


def pg_connection_args(config):
    args = []
    for option, key in (("--host", "HOST"), ("--port", "PORT"), ("--username", "USER"), ("--dbname", "NAME")):
        value = config.get(key)
        if value:
            args.extend([option, str(value)])
    return args


def encrypt_file(source, destination, key):
    nonce = os.urandom(12)
    encryptor = Cipher(algorithms.AES(key), modes.GCM(nonce)).encryptor()
    with open(source, "rb") as src, open(destination, "wb") as dst:
        dst.write(MAGIC + nonce)
        while True:
            chunk = src.read(CHUNK_SIZE)
            if not chunk:
                break
            dst.write(encryptor.update(chunk))
        dst.write(encryptor.finalize())
        dst.write(encryptor.tag)


def decrypt_file(source, destination, key):
    size = os.path.getsize(source)
    header_size = len(MAGIC) + 12
    if size < header_size + 16:
        raise RuntimeError("Backup file is too small to be a valid encrypted archive.")
    with open(source, "rb") as src:
        if src.read(len(MAGIC)) != MAGIC:
            raise RuntimeError("Backup archive has an unknown format or is not encrypted.")
        nonce = src.read(12)
        src.seek(-16, os.SEEK_END)
        tag = src.read(16)
        ciphertext_size = size - header_size - 16
        src.seek(header_size)
        decryptor = Cipher(algorithms.AES(key), modes.GCM(nonce, tag)).decryptor()
        remaining = ciphertext_size
        with open(destination, "wb") as dst:
            while remaining:
                chunk = src.read(min(CHUNK_SIZE, remaining))
                if not chunk:
                    raise RuntimeError("Backup archive ended unexpectedly.")
                remaining -= len(chunk)
                dst.write(decryptor.update(chunk))
            dst.write(decryptor.finalize())


def create_backup(retention_days=30):
    config = database_config()
    key = encryption_key()
    client = r2_client()
    bucket = bucket_name()
    timestamp = timezone.now().astimezone(datetime_timezone.utc)
    object_key = f"{BACKUP_PREFIX}{timestamp:%Y/%m/%d}/dcopenbk-{timestamp:%Y%m%dT%H%M%SZ}.dump.enc"

    with tempfile.TemporaryDirectory(prefix="dcopenbk-backup-") as directory:
        dump_path = Path(directory) / "database.dump"
        encrypted_path = Path(directory) / "database.dump.enc"
        command = ["pg_dump", "--no-password", "--format=custom", "--compress=6", "--no-owner", "--no-acl"]
        command.extend(pg_connection_args(config))
        with open(dump_path, "wb") as stdout, open(os.devnull, "wb") as stderr:
            subprocess.run(command, check=True, env=pg_environment(config), stdout=stdout, stderr=stderr)
        if dump_path.stat().st_size == 0:
            raise RuntimeError("pg_dump produced an empty archive; refusing to upload it.")
        encrypt_file(dump_path, encrypted_path, key)
        client.upload_file(
            str(encrypted_path),
            bucket,
            object_key,
            ExtraArgs={"ContentType": "application/octet-stream", "Metadata": {"format": "pg_dump-custom", "encrypted": "aes-256-gcm"}},
        )
        client.head_object(Bucket=bucket, Key=object_key)

    deleted = prune_backups(client, bucket, retention_days)
    return {"key": object_key, "deleted": deleted}


def list_backups(client=None, bucket=None):
    client = client or r2_client()
    bucket = bucket or bucket_name()
    paginator = client.get_paginator("list_objects_v2")
    objects = []
    for page in paginator.paginate(Bucket=bucket, Prefix=BACKUP_PREFIX):
        objects.extend(page.get("Contents", []))
    return objects


def prune_backups(client=None, bucket=None, retention_days=30, now=None):
    client = client or r2_client()
    bucket = bucket or bucket_name()
    cutoff = (now or timezone.now()) - timedelta(days=retention_days)
    expired = [
        {"Key": item["Key"]}
        for item in list_backups(client, bucket)
        if item.get("LastModified") and item["LastModified"] < cutoff
    ]
    for offset in range(0, len(expired), 1000):
        client.delete_objects(Bucket=bucket, Delete={"Objects": expired[offset:offset + 1000], "Quiet": True})
    return len(expired)


def download_and_decrypt(object_key, directory):
    client = r2_client()
    encrypted_path = Path(directory) / "database.dump.enc"
    dump_path = Path(directory) / "database.dump"
    client.download_file(bucket_name(), object_key, str(encrypted_path))
    decrypt_file(encrypted_path, dump_path, encryption_key())
    return dump_path


def latest_backup_key():
    objects = list_backups()
    if not objects:
        raise RuntimeError("No DCopenBK database backups were found in the configured R2 bucket.")
    return max(objects, key=lambda item: item["LastModified"])["Key"]


def target_database_name(database_url):
    return urlparse(database_url).path.lstrip("/").split("?")[0]


def restore_backup(object_key, target_url, confirmation):
    config = database_config()
    production_name = str(config.get("NAME") or "")
    target_name = target_database_name(target_url)
    if not target_name or target_name == production_name:
        raise RuntimeError("Refusing to restore into the production database. Use a separate, disposable database.")
    if confirmation != target_name:
        raise RuntimeError(f"To confirm the restore target, pass --confirm-target-database {target_name}.")
    with tempfile.TemporaryDirectory(prefix="dcopenbk-restore-") as directory:
        dump_path = download_and_decrypt(object_key, directory)
        subprocess.run(
            ["pg_restore", "--exit-on-error", "--clean", "--if-exists", "--no-owner", "--no-acl", "--dbname", target_url, str(dump_path)],
            check=True,
        )
        subprocess.run(
            ["psql", "--no-psqlrc", "--tuples-only", "--no-align", "--command", "SELECT COUNT(*) FROM django_migrations;", target_url],
            check=True,
            capture_output=True,
            text=True,
        )
    return target_name
