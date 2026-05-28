# RBS Academy

This app now targets a Supabase Postgres database.

## Setup

1. Create a Supabase project.
2. Open `Project Settings -> Database` and copy the Postgres connection string.
3. Add your connection details to `.env`:

```env
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
CLOUDINARY_URL=cloudinary://[API-KEY]:[API-SECRET]@[CLOUD-NAME]
CLOUDINARY_PDF_URL=cloudinary://[PDF-API-KEY]:[PDF-API-SECRET]@[PDF-CLOUD-NAME]
CLOUDINARY_THUMBNAIL_URL=cloudinary://[THUMBNAIL-API-KEY]:[THUMBNAIL-API-SECRET]@[THUMBNAIL-CLOUD-NAME]
CLOUDINARY_FOLDER=rbs-academy
GOOGLE_SMTP_USER=[YOUR-GMAIL-ADDRESS]
GOOGLE_SMTP_APP_PASSWORD=[YOUR-GMAIL-APP-PASSWORD]
SMTP_FROM_EMAIL=[YOUR-GMAIL-ADDRESS]
```

4. Start the app:

```bash
npm run dev
```

On first boot, the server creates the tables it needs and seeds starter data automatically.

## Notes

- `lib/mysql.ts` is still the shared database adapter file name, but it now uses Postgres so the existing API layer keeps working.
- Supabase SSL is enabled by default. Set `SUPABASE_SSL=false` only for a local Postgres instance.
- Slider and question images are stored in the primary Cloudinary account. Course and video thumbnails use `CLOUDINARY_THUMBNAIL_URL`/`CLOUDINARY_ACCOUNT_2_URL`, falling back to `CLOUDINARY_PDF_URL`; uploaded PDF notes use `CLOUDINARY_PDF_URL`.
- Signup email verification and forgot-password OTP emails use Google SMTP. Create a Google app password and set `GOOGLE_SMTP_USER` plus `GOOGLE_SMTP_APP_PASSWORD`.
- Existing externally hosted URLs continue to load; re-upload old media through the admin panel to migrate it to Cloudinary.
