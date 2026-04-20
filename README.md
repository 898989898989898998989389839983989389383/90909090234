# RBS Academy

This app now targets a Supabase Postgres database.

## Setup

1. Create a Supabase project.
2. Open `Project Settings -> Database` and copy the Postgres connection string.
3. Add your connection details to `.env`:

```env
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
BLOB_READ_WRITE_TOKEN=
VITE_APPS_SCRIPT_URL=
```

4. Start the app:

```bash
npm run dev
```

On first boot, the server creates the tables it needs and seeds starter data automatically.

## Notes

- `lib/mysql.ts` is still the shared database adapter file name, but it now uses Postgres so the existing API layer keeps working.
- Supabase SSL is enabled by default. Set `SUPABASE_SSL=false` only for a local Postgres instance.
