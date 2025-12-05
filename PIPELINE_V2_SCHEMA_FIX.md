# Pipeline v2 Schema Fix - Deployment Instructions

## 1. Migration & Type Generation

First, apply the schema fix:

```bash
# Apply the migration to drop and recreate gists table
supabase migration up
```

Then, regenerate the Typescript types to match the new schema:

```bash
# Generate types
npx supabase gen types typescript --project-id vzjyclgrqoyxbbzplkgw --schema public > src/types/supabase.ts
```

## 2. Deploy Updated Functions

Deploy the functions that have been updated to match the new schema:

```bash
# Deploy all pipeline v2 functions
supabase functions deploy publish-gist-v2
supabase functions deploy generate-gist-v2
supabase functions deploy auto-generate-gists-v2
supabase functions deploy gather-sources-v2
```

## 3. Verification Steps

### Run Local Test
You can run the local test script created earlier to verify end-to-end functionality:

```bash
# Run the test script (requires Deno)
deno run --allow-net --allow-env scripts/test-pipeline-v2.ts
```

### Test via Admin UI
1. Go to the **Admin** page (`/admin`).
2. Click the **"Run Pipeline Test"** button.
3. Verify that the logs show success and the new gist appears in the list.
4. Check the **"Create New Gist"** form to ensure manual creation also works.

## 4. Troubleshooting

If you see "Could not find column..." errors:
- Ensure the migration (`20250102000000_fix_gists_schema.sql`) was applied successfully.
- Check the Table Editor in Supabase Dashboard to confirm columns like `topic`, `headline`, `context`, `audio_url` exist.

If you see "NetworkError":
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your local `.env`.
- Ensure CORS headers are correctly set (already handled in `_shared/http.ts`).

---
**Status:** Schema migration created, functions updated, admin UI improved. Ready for deployment!

