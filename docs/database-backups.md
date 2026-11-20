# DCopenBK PostgreSQL backups

DCopenBK creates encrypted PostgreSQL custom-format dumps and stores them in
the existing Cloudflare R2 bucket under the isolated prefix
`database-backups/dcopenbk/`. It does not write backups to the database volume
or change application/database behavior.

## Required Fly secrets

The web app already uses these R2 settings for uploaded images. Confirm that
they exist on Fly app `dcopenbk` (never print their values):

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT_URL`

Create one additional client-side encryption key and store it as a Fly secret:

```powershell
python -c "import base64,secrets; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())"
fly secrets set DATABASE_BACKUP_ENCRYPTION_KEY="<paste-generated-value>" -a dcopenbk
```

Keep this key in a password manager or other secure offline location. It is
required to decrypt every backup. Do not rotate it unless you have a deliberate
plan to retain the old key for existing archives.

## First backup

After deploying the code and confirming the secrets are set:

```powershell
fly ssh console -a dcopenbk
python -u manage.py backup_database
```

The command runs `pg_dump`, encrypts the archive with AES-256-GCM, uploads it
to R2, confirms the object exists, and removes only objects older than the
configured retention period under the DCopenBK backup prefix. The default
retention is 30 days.

## Daily schedule

From the updated local repository, create one Fly scheduled Machine:

```powershell
fly machine run . --app dcopenbk --region iad --schedule daily --command "python manage.py backup_database"
```

Fly starts the scheduled Machine for its first run and then approximately once
per day. The interval is approximate, not a wall-clock cron time. It receives
the `dcopenbk` app secrets and can reach the database through Fly private
networking. It exits after the backup command completes. Do not create a second
scheduled Machine for the same job.

Inspect it with:

```powershell
fly machine list -a dcopenbk
fly machine status <MACHINE_ID> -a dcopenbk
fly logs -a dcopenbk
```

## Restore test (use a disposable database only)

Create a separate empty PostgreSQL database for the restore test. It may be on
a temporary PostgreSQL server or a dedicated disposable database on an
appropriate PostgreSQL instance. Do not use the production database URL.

Then run from a deployed app container:

```powershell
python manage.py restore_database_backup --latest --target-database-url "postgres://USER:PASSWORD@HOST:5432/dcopenbk_restore_test" --confirm-target-database dcopenbk_restore_test
```

The command refuses to target the configured production database and requires
the confirmation value to exactly match the target database name. It decrypts
the newest archive, restores it with `pg_restore`, and checks that the
`django_migrations` table can be queried. The target database is disposable:
`pg_restore --clean` replaces objects in that target database.

To restore a specific archive, replace `--latest` with `--key "exact/R2/object/key"`.

## Recovery notes

- Fly volume snapshots remain enabled as a second recovery layer.
- R2 backups are independent of the Fly database volume and are encrypted
  before upload; R2 also uses encrypted transport.
- The backup encryption key must be retained securely. Losing it makes these
  archives unrecoverable.
- Retention cleanup is scoped only to `database-backups/dcopenbk/`; it does
  not inspect or delete ballkid image uploads.
- Verify the scheduled Machine's logs and the R2 object list periodically.
