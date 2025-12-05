# Fluxa Supabase Migration Guide

## ✅ Completed Steps

### 1. Environment Variables ✅
All required environment variables are present in `.env`:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `VITE_SUPABASE_PUBLISHABLE_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `CRON_SECRET`
- ✅ `VITE_SUPABASE_PROJECT_ID`

### 2. Supabase Client Configuration ✅
The client configuration in `src/integrations/supabase/client.ts` is correct and uses:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (with fallback to `VITE_SUPABASE_PUBLISHABLE_KEY`)

### 3. Config.toml Fixed ✅
Fixed invalid cron configuration format in `supabase/config.toml`.

---

## 🔄 Remaining Steps (Require Supabase CLI Authentication)

### Step 1: Authenticate Supabase CLI

**Option A: Using Access Token (Recommended)**
```bash
# Get your access token from: https://supabase.com/dashboard/account/tokens
npx supabase login --token YOUR_ACCESS_TOKEN
```

**Option B: Interactive Login**
```bash
npx supabase login
# Follow the prompts to authenticate
```

### Step 2: Link Project
```bash
npx supabase link --project-ref vzjyclgrqoyxbbzplkgw
```

### Step 3: Apply Database Migrations
```bash
npx supabase db push
```

This will apply all migrations from `supabase/migrations/`, including:
- ✅ All required tables (gists, post_analytics, raw_trends, user_favorites, user_subniches, fluxa_memory, fan_entities, fan_follows)
- ✅ Storage buckets (gist-audio, fluxa-reactions)
- ✅ RLS policies
- ✅ Functions and triggers
- ✅ Indexes

### Step 4: Deploy Edge Functions

Deploy all functions individually:
```bash
# Core functions
npx supabase functions deploy generate-gist
npx supabase functions deploy publish-gist
npx supabase functions deploy text-to-speech
npx supabase functions deploy scrape-trends

# Additional functions (deploy all)
npx supabase functions deploy auto-generate-gists
npx supabase functions deploy fetch-sports-results
npx supabase functions deploy update-live-scores
npx supabase functions deploy process-deeper-summaries
npx supabase functions deploy fetch-team-news-cached
npx supabase functions deploy fluxa-health-check
npx supabase functions deploy fluxa-personalized-digest
npx supabase functions deploy generate-live-commentary
npx supabase functions deploy predict-match
npx supabase functions deploy compare-teams
npx supabase functions deploy evaluate-summary-quality
npx supabase functions deploy upload-reactions
# ... and all other functions in supabase/functions/
```

Or deploy all at once:
```bash
npx supabase functions deploy
```

### Step 5: Set Edge Function Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions:
- `SUPABASE_URL` = Your project URL
- `SUPABASE_ANON_KEY` = Your anon key
- `SUPABASE_SERVICE_ROLE_KEY` = Your service role key
- `OPENAI_API_KEY` = Your OpenAI API key
- `CRON_SECRET` = Your CRON secret (68DE6BA1ED9113AA26C725EA4C926)
- `NEWSAPI_KEY` = (if used)
- Any other API keys required by functions

### Step 6: Configure CRON Jobs

In Supabase Dashboard → Database → Cron Jobs, add:
1. **auto-generate-gists-every-minute**
   - Function: `auto-generate-gists`
   - Schedule: `* * * * *` (every minute)
   - Headers: `x-cron-signature: <HMAC signature>`

2. **fetch-sports-results-hourly**
   - Function: `fetch-sports-results`
   - Schedule: `0 * * * *` (hourly)
   - Headers: `x-cron-signature: <HMAC signature>`

3. **update-live-scores-every-5-min**
   - Function: `update-live-scores`
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - Headers: `x-cron-signature: <HMAC signature>`

4. **process-deeper-summaries-hourly**
   - Function: `process-deeper-summaries`
   - Schedule: `0 * * * *` (hourly)
   - Headers: `x-cron-signature: <HMAC signature>`

5. **fetch-team-news-every-6-hours**
   - Function: `fetch-team-news-cached`
   - Schedule: `0 */6 * * *` (every 6 hours)
   - Headers: `x-cron-signature: <HMAC signature>`

**Note:** CRON signature validation is implemented in all scheduled functions using `CRON_SECRET`.

---

## ✅ Verification Checklist

### Database Tables
Verify these tables exist:
- [ ] `gists`
- [ ] `post_analytics`
- [ ] `raw_trends`
- [ ] `user_favorites`
- [ ] `user_subniches`
- [ ] `fluxa_memory`
- [ ] `fan_entities`
- [ ] `fan_follows`

### Storage Buckets
Verify these buckets exist:
- [ ] `gist-audio` (public, with RLS policies)
- [ ] `fluxa-reactions` (public, with RLS policies)

### RLS Policies
Verify RLS is enabled and policies exist for:
- [ ] `gists` - Public can view published gists
- [ ] `post_analytics` - Public can view, service role can manage
- [ ] `user_favorites` - Users can only access their own
- [ ] `user_subniches` - Users can only access their own

### Edge Functions
Test these endpoints:
- [ ] `POST /functions/v1/generate-gist`
- [ ] `POST /functions/v1/publish-gist`
- [ ] `POST /functions/v1/text-to-speech`

### End-to-End Test
1. Generate a gist: `POST /functions/v1/generate-gist` with `{"topic": "Test topic"}`
2. Publish the gist: `POST /functions/v1/publish-gist` with the generated data
3. Verify gist appears in `gists` table
4. Verify audio file uploaded to `gist-audio` bucket
5. Verify gist appears in Feed

---

## 🔧 Alternative: Manual Migration via Dashboard

If CLI is not available, you can:

1. **Apply Migrations Manually:**
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents of `supabase/migrations/20251121224543-init.sql`
   - Run the SQL script

2. **Create Storage Buckets:**
   - Go to Storage → Create Bucket
   - Create `gist-audio` (public)
   - Create `fluxa-reactions` (public)
   - Set RLS policies as defined in migration

3. **Deploy Functions:**
   - Go to Edge Functions → Create Function
   - Copy function code from `supabase/functions/<function-name>/index.ts`
   - Set environment variables

---

## 📝 Notes

- The migration file `20251121224543-init.sql` contains the complete schema
- All RLS policies are defined in the migration
- Storage buckets are created in the migration
- CRON secret validation is implemented in all scheduled functions
- The client configuration supports both `.env` and `.env.local` files

---

## 🚨 Troubleshooting

### Migration Fails
- Check for existing tables/conflicts
- Use `IF NOT EXISTS` clauses (already in migration)
- Check Supabase project limits

### Functions Fail to Deploy
- Verify environment variables are set
- Check function code for syntax errors
- Verify Deno imports are correct

### CRON Jobs Not Running
- Verify CRON_SECRET is set in function environment
- Check CRON job configuration in dashboard
- Verify function names match exactly

### Storage Upload Fails
- Verify bucket exists and is public
- Check RLS policies allow uploads
- Verify service role key has permissions

---

## 🎉 Final Steps

Once all steps are complete:
1. Run end-to-end test
2. Verify all functions respond correctly
3. Check database for test data
4. Verify storage buckets contain files
5. Test CRON jobs are executing

**Fluxa is fully online 🔥**

